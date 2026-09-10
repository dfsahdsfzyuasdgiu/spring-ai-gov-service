package com.example.myai.service;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import com.example.myai.model.AffairGuide;
import com.example.myai.model.dto.ChatRequest;
import com.example.myai.model.dto.ChatResponseChunk;
import com.example.myai.service.GovRagService.MatchedClause;
import com.example.myai.service.GovRagService.RagMatchResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.*;

@Service
public class GovAiService {

    private static final Logger log = LoggerFactory.getLogger(GovAiService.class);
    private final ChatClient chatClient;
    private final GovRagService govRagService;
    private final AffairService affairService;

    public GovAiService(ChatClient.Builder builder, GovRagService govRagService, AffairService affairService) {
        this.chatClient = builder.build();
        this.govRagService = govRagService;
        this.affairService = affairService;
    }

    public static class ClarifyOption {
        private String icon;
        private String label;
        private String query;

        public ClarifyOption(String icon, String label, String query) {
            this.icon = icon;
            this.label = label;
            this.query = query;
        }

        public String getIcon() { return icon; }
        public String getLabel() { return label; }
        public String getQuery() { return query; }
    }

    public static class ClarifyData {
        private String topic;
        private String question;
        private List<ClarifyOption> options;

        public ClarifyData(String topic, String question, List<ClarifyOption> options) {
            this.topic = topic;
            this.question = question;
            this.options = options;
        }

        public String getTopic() { return topic; }
        public String getQuestion() { return question; }
        public List<ClarifyOption> getOptions() { return options; }
    }

    public static class RecommendItem {
        private String title;
        private String query;

        public RecommendItem(String title, String query) {
            this.title = title;
            this.query = query;
        }

        public String getTitle() { return title; }
        public String getQuery() { return query; }
    }

    /**
     * 核心智能咨询入口：多路召回 + 严格提示词工程 + 流式响应事件链
     */
    public Flux<ChatResponseChunk> streamConsultation(ChatRequest request) {
        String prompt = request.getPrompt();
        String category = request.getCategory();

        // 0. 特性 1：多轮意图澄清研判（若群众诉求宽泛模糊，主动发起多轮追问）
        ClarifyData clarify = checkClarification(prompt);
        if (clarify != null) {
            String clarifyText = String.format("您好！办理【%s】涉及多类法定政策与办事标准。为了给您提供最准确的准入资格与申报要件，请选择您最符合的实际情况：", clarify.getTopic());
            return Flux.just(
                    ChatResponseChunk.chunk(clarifyText),
                    ChatResponseChunk.clarifyCard(clarify),
                    ChatResponseChunk.done()
            );
        }

        // 1. RAG 检索政策法规
        RagMatchResult ragResult = govRagService.retrieveContext(prompt, category);
        boolean hasReliablePolicy = ragResult.isReliableMatch();

        // 2. 匹配可能关联的办事指南事项（智能导办卡片）
        AffairGuide matchedAffair = affairService.matchGuideCard(prompt);

        // 3. 构建给大模型的 System Prompt 与 User Prompt
        String systemInstruction = buildSystemPrompt(ragResult.getTopClauses(), hasReliablePolicy);
        String finalUserPrompt = "群众咨询问题: " + prompt;

        // 4. 发起 Spring AI 流式调用
        Flux<String> textStream;
        try {
            textStream = chatClient.prompt()
                    .system(systemInstruction)
                    .user(finalUserPrompt)
                    .options(DashScopeChatOptions.builder()
                            .withModel("qwen-plus")
                            .withTemperature(0.2f) // 低温保证回答确定性、消除虚构
                            .build())
                    .stream()
                    .content();
        } catch (Exception e) {
            log.error("调用大模型流式接口异常", e);
            textStream = Flux.just("您好，当前政务智能服务繁忙，建议您稍后重试或直接拨打 12345 便民热线咨询。");
        }

        // 5. 组装初始元数据块 (Citation 政策出处)
        List<ChatResponseChunk> prefixChunks = new ArrayList<>();
        if (hasReliablePolicy && !ragResult.getTopClauses().isEmpty()) {
            MatchedClause top = ragResult.getTopClauses().get(0);
            Map<String, Object> citationMap = new HashMap<>();
            citationMap.put("docTitle", top.getDocTitle());
            citationMap.put("docNumber", top.getDocNumber());
            citationMap.put("issuerDept", top.getIssuerDept());
            citationMap.put("clauseNo", top.getClauseNo());
            citationMap.put("clauseText", top.getClauseText());
            prefixChunks.add(ChatResponseChunk.citation(citationMap));
        }

        // 6. 组装收尾卡片块 (GuideCard 办事指南卡片 + 特性 2：“高效办成一件事”链式关联推荐)
        List<ChatResponseChunk> suffixChunks = new ArrayList<>();
        if (matchedAffair != null) {
            suffixChunks.add(ChatResponseChunk.guideCard(matchedAffair));
        }

        // 特性 2：“高效办成一件事”链式关联事项推荐卡片
        List<RecommendItem> recs = getRelatedRecommendations(prompt, matchedAffair);
        if (!recs.isEmpty()) {
            suffixChunks.add(ChatResponseChunk.recommendCard(recs));
        }

        if (!hasReliablePolicy && matchedAffair == null) {
            // 无法可靠匹配政策时，自动推送 12345 工单建议卡片
            suffixChunks.add(ChatResponseChunk.orderCard(category));
        }
        suffixChunks.add(ChatResponseChunk.done());

        // 组合完整事件流：出处元数据 -> 逐字文本流 -> 导办/工单卡片 -> 完成标识
        return Flux.fromIterable(prefixChunks)
                .concatWith(textStream.map(ChatResponseChunk::chunk))
                .concatWith(Flux.fromIterable(suffixChunks))
                .onErrorResume(err -> {
                    log.error("流式推送中断异常", err);
                    return Flux.just(
                            ChatResponseChunk.chunk("\n\n[提示：网络通信异常，请检查网络或咨询现场政务工作人员]"),
                            ChatResponseChunk.done()
                    );
                });
    }

    /**
     * 意图澄清多轮追问：针对泛化提问返回多分支选项
     */
    private ClarifyData checkClarification(String prompt) {
        if (prompt == null) return null;
        String p = prompt.trim();

        // 1. 户籍落户泛化提问
        if (p.equals("我要落户") || p.equals("想落户") || p.equals("落户") || p.equals("怎么落户") || p.equals("如何落户") || p.equals("广州落户") || p.equals("落户政策") || p.equals("积分入户")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("🎓", "全日制本科/应届高校毕业生（人才引进落户）", "我是应届或青年高校毕业生，在广州怎么落户？需要什么材料？"));
            opts.add(new ClarifyOption("🛠️", "持有中级以上技能证书/中级职称人员（技能/职称落户）", "持有中级及以上技能职业资格或中级职称，如何办理广州入户？"));
            opts.add(new ClarifyOption("👨‍👩‍👧", "外省配偶及直系亲属投靠随迁落户", "夫妻结婚后，外省户籍配偶如何办理广州投靠落户？"));
            opts.add(new ClarifyOption("📊", "持有广州居住证且缴纳社保满期限（积分制入户）", "在广州办理积分制入户需要满足什么条件？积分排名如何计算？"));
            return new ClarifyData("户籍落户申报", "在广州办理入户有多种法定引进与迁入渠道，为向您提供最精准的政策依据与申报清单，请问您的身份符合以下哪种情形？", opts);
        }

        // 2. 公积金提取泛化提问
        if (p.equals("公积金提取") || p.equals("提取公积金") || p.equals("公积金") || p.equals("怎么提公积金") || p.equals("如何提取公积金") || p.equals("提公积金")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("🏠", "在广州无自有住房租房居住（按月提取冲抵房租）", "在广州无自有产权住房且租房居住，如何按月提取公积金付房租？"));
            opts.add(new ClarifyOption("🏢", "购买自住商品房申请公积金提取", "购买自住商品房如何提取广州住房公积金？需要哪些证明材料？"));
            opts.add(new ClarifyOption("💼", "离职封存满6个月全额销户提取", "从广州单位离职后公积金封存满6个月能全额销户提取吗？"));
            return new ClarifyData("住房公积金提取", "公积金提取严格对应具体的法定提取情形与申领要件，请问您的实际情况属于以下哪一种？", opts);
        }

        // 3. 出入境证件泛化提问
        if (p.equals("办通行证") || p.equals("办理通行证") || p.equals("港澳通行证") || p.equals("办护照") || p.equals("出入境") || p.equals("办出入境证件")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("🇭🇰", "首次办理往来港澳通行证（全国通办）", "在广州办理往来港澳通行证需要带什么材料？外省外市户籍可以直接办吗？"));
            opts.add(new ClarifyOption("🛂", "中华人民共和国普通护照首次申领", "普通护照首次申领需要什么材料？多久可以拿到护照？"));
            opts.add(new ClarifyOption("⚡", "赴港澳旅游再次签注（智能签注机立等可取）", "去香港和澳门旅游，再次申请签注可以在智能签注机上立等可取吗？"));
            return new ClarifyData("出入境便民业务", "出入境证件现已全面推行“全国通办”，免回户籍原籍地即可在广州就近申办。请问您需要办理哪类证件？", opts);
        }

        // 4. 异地就医/医保泛化提问
        if (p.equals("异地就医") || p.equals("跨省就医") || p.equals("医保报销") || p.equals("看病报销") || p.equals("异地医保") || p.equals("广州医保")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("🏥", "外省退休常住广州异地就医直接结算备案", "外省退休老人常住广州，如何办理跨省异地就医直接结算备案？"));
            opts.add(new ClarifyOption("👨‍👩‍👧", "医保个人账户家庭成员共济绑定", "广州职工医保个人账户家庭共济如何绑定家庭成员（父母/配偶/子女）？"));
            opts.add(new ClarifyOption("👶", "参保女职工顺产/剖宫产生育津贴申领", "广州参保女职工顺产或剖宫产生小孩，如何申领生育津贴？"));
            return new ClarifyData("跨省与本地医保服务", "医疗保障涉及门诊定点、长期异地居住备案及家属互济等多项便民通道，请问您的办理诉求是？", opts);
        }

        return null;
    }

    /**
     * 高效办成一件事：推导关联联办推荐
     */
    private List<RecommendItem> getRelatedRecommendations(String prompt, AffairGuide matchedAffair) {
        List<RecommendItem> list = new ArrayList<>();
        if (prompt == null) return list;
        String p = prompt.toLowerCase();

        if (p.contains("落户") || p.contains("大专") || p.contains("毕业生") || p.contains("技能") || p.contains("积分")) {
            list.add(new RecommendItem("👉 申领广州市新引进人才住房补贴/安家费", "广州市新引进人才住房补贴或安家费如何申请？"));
            list.add(new RecommendItem("👉 高校毕业生档案接收与“穗好办”一键查询", "应届毕业生如何办理档案接收并在穗好办查询？"));
            list.add(new RecommendItem("👉 外省养老保险关系网上免证明转移接续", "跨省离职后，如何把原省份养老保险关系转移到广州？"));
        } else if (p.contains("异地就医") || p.contains("医保") || p.contains("生育") || p.contains("社保")) {
            list.add(new RecommendItem("👉 广州医保个账家庭成员共济绑定（父母/配偶/子女）", "广州医保个人账户如何绑定家庭共济？"));
            list.add(new RecommendItem("👉 灵活就业人员医保中途断缴补缴与待遇衔接", "广州灵活就业人员医保断缴补缴后待遇怎么算？"));
            list.add(new RecommendItem("👉 生育保险津贴线上申领到账时限与标准", "广州参保职工生育津贴线上申请流程？"));
        } else if (p.contains("通行证") || p.contains("护照") || p.contains("港澳") || p.contains("出入境")) {
            list.add(new RecommendItem("👉 赴港澳旅游再次申请签注智能机立等可取", "广州哪里有24小时智能签注机？再次签注立等可取吗？"));
            list.add(new RecommendItem("👉 普通护照首次申领办结时限与加急条件", "普通护照首次申领需要几天？"));
        } else if (p.contains("公积金") || p.contains("房租") || p.contains("租房")) {
            list.add(new RecommendItem("👉 广州老旧小区加装电梯提取住房公积金", "老旧小区加装电梯能否申请提取公积金？"));
            list.add(new RecommendItem("👉 离职封存满6个月“穗好办”一键销户提取", "离职封存满半年如何通过穗好办手机销户提取？"));
        } else if (p.contains("企业") || p.contains("公司") || p.contains("个转企") || p.contains("营业执照") || p.contains("开办")) {
            list.add(new RecommendItem("👉 广州开办企业一网通办免收4枚实体印章", "广州新设企业免费领取防伪印章流程？"));
            list.add(new RecommendItem("👉 餐饮经营许可证与食品经营许可告知承诺制", "开办餐饮店如何快速办理食品经营许可证？"));
        } else if (p.contains("车牌") || p.contains("指标") || p.contains("摇号") || p.contains("驾驶证") || p.contains("换证") || p.contains("驾照")) {
            list.add(new RecommendItem("👉 广州普通燃油车指标与节能车指标申领规则", "非广州户籍摇号节能车指标需要满足什么条件？"));
            list.add(new RecommendItem("👉 驾驶证期满换证“警医邮”网办邮寄到家", "广州驾驶证期满换证如何在线体检并邮寄到家？"));
        }
        return list;
    }

    private String buildSystemPrompt(List<MatchedClause> clauses, boolean hasReliable) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是广州市人民政府门户网站（www.gz.gov.cn）“政策法规 AI 智能问答专窗·政策便民翻译官”。\n");
        sb.append("你由广州市政务服务和数据管理局指导建设，依托广州市现行规章与规范性文件权威数据库（Vector DB + RAG）为市民提供政策咨询解答。\n");
        sb.append("【核心宗旨】：项目的本质是便利人民的生活，通过 AI 把复杂的法款条例智能翻译成老百姓需要的、能听懂的语言，解决老百姓办事“看不懂政策、找不到门路、不知晓实惠”的痛点。\n");
        sb.append("请严格按照以下【民生政策明白纸 · 办事四要素】规范输出答复，绝不讲空话套话，绝不在正文无意义堆砌法条原文：\n\n");
        sb.append("答复结构模板：\n");
        sb.append("【一句话明白纸】\n");
        sb.append("（开门见山用 1-2 句话直接说清楚核心结论，老百姓最关心的结果：到底能不能办、能领多少钱/补贴额度、最长有效期或最快多久办好）\n\n");
        sb.append("【老百姓明白账】\n");
        sb.append("• 谁能办？（准入门槛白话讲透，讲清户籍、社保缴费月数、年龄等硬性准入条件）\n");
        sb.append("• 给多少/要带啥？（实惠待遇算清楚，或明确办事办证需要携带的核心材料，能免则免）\n");
        sb.append("• 去哪办？（零跑腿指引，直接列出微信小程序“穗好办”、广东政务服务网或就近网点）\n");
        sb.append("• 提个醒！（注意事项避坑点，提醒社保断缴、申请时间截点等市民最容易踩坑的细节）\n\n");
        sb.append("【官方政策依据】\n");
        sb.append("（注明依据的官方红头文件名称与文号，例如《广州市xxx规定》（穗府办规〔202x〕x号）。注意：正文切勿大篇幅摘抄法条原文，法定条款原文明细已由系统自动挂载至底部的“查看条文原文”抽屉供市民按需查验）\n\n");

        if (hasReliable && !clauses.isEmpty()) {
            sb.append("【检索到的官方权威政策法规依据】\n");
            for (int i = 0; i < clauses.size(); i++) {
                MatchedClause c = clauses.get(i);
                sb.append(String.format("法规依据 %d: 《%s》(文号:%s, 颁发机关:%s)\n条款: %s\n正文: %s\n\n",
                        i + 1, c.getDocTitle(), c.getDocNumber(), c.getIssuerDept(), c.getClauseNo(), c.getClauseText()));
            }
            sb.append("【严格答复要求】\n");
            sb.append("1. 白话转换：必须将法规术语转换为群众日常生活用语（例如将“行政相对人”转换为“办事市民”，“本市行政区域内”转换为“广州全市”）。\n");
            sb.append("2. 杜绝虚构：严禁捏造未经检索依据记载的任何数据、补贴金额或行政门槛。\n");
            sb.append("3. 风格亲民庄重：全篇不使用任何卡通表情符号（Emoji），符合广州市人民政府门户网站政务公文规范。\n");
        } else {
            sb.append("【本地官方政务政策库检索说明】\n");
            sb.append("当前检索到的政策与问题关联度较低。请向市民通俗说明：在广州市现行有效政策库中暂未检索到直接完全匹配的条款细则。\n");
            sb.append("可建议市民前往广州市人民政府门户网站查阅或拨打 12345 便民热线进行人工核实，切勿臆造政策规则。\n");
        }

        return sb.toString();
    }
}
