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
        if (p.equals("我要落户") || p.equals("想落户") || p.equals("落户") || p.equals("怎么落户") || p.equals("如何落户") || p.equals("海口落户") || p.equals("落户政策")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("🎓", "全日制大专及以上学历毕业生（人才落户）", "我是全日制大专生，在海口怎么落户？需要什么材料？"));
            opts.add(new ClarifyOption("🛠️", "取得中级及以上技能证书人员（技能落户）", "毕业超过5年的高校毕业生，如何通过技能证书办理落户？"));
            opts.add(new ClarifyOption("👨‍👩‍👧", "外省配偶及直系亲属投靠随迁落户", "夫妻结婚后，外省户籍配偶如何办理随迁投靠落户？"));
            return new ClarifyData("户籍落户申报", "在海口办理落户有多种法定引进与迁入渠道，为向您提供最精准的政策依据与申报清单，请问您的身份符合以下哪种情形？", opts);
        }

        // 2. 公积金提取泛化提问
        if (p.equals("公积金提取") || p.equals("提取公积金") || p.equals("公积金") || p.equals("怎么提公积金") || p.equals("如何提取公积金") || p.equals("提公积金")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("🏠", "在海口无自有住房租房居住（按月提取冲抵房租）", "在海口没有自有住房且在外租房，如何按月提取公积金付房租？"));
            opts.add(new ClarifyOption("🏢", "购买自住商品房申请公积金提取", "购买自住商品房如何提取住房公积金？需要哪些证明材料？"));
            opts.add(new ClarifyOption("💼", "离职封存满6个月全额销户提取", "离职之后公积金封存满6个月能全额提取吗？"));
            return new ClarifyData("住房公积金提取", "公积金提取严格对应具体的法定提取情形与申领要件，请问您的实际情况属于以下哪一种？", opts);
        }

        // 3. 出入境证件泛化提问
        if (p.equals("办通行证") || p.equals("办理通行证") || p.equals("港澳通行证") || p.equals("办护照") || p.equals("出入境") || p.equals("办出入境证件")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("🇭🇰", "首次办理往来港澳通行证（全国通办）", "在海口办理往来港澳通行证需要带什么材料？外地户口可以办吗？"));
            opts.add(new ClarifyOption("🛂", "中华人民共和国普通护照首次申领", "普通护照首次申领需要什么材料？多久可以拿到护照？"));
            opts.add(new ClarifyOption("⚡", "赴港澳旅游再次签注（智能签注机立等可取）", "去香港和澳门旅游，再次申请签注可以在智能机上立等可取吗？"));
            return new ClarifyData("出入境便民业务", "出入境证件现已全面推行“全国通办”，免回户籍原籍地即可就近申办。请问您需要办理哪类证件？", opts);
        }

        // 4. 异地就医/医保泛化提问
        if (p.equals("异地就医") || p.equals("跨省就医") || p.equals("医保报销") || p.equals("看病报销") || p.equals("异地医保")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("🏥", "退休跨省常住海口异地就医直接结算备案", "退休老人常住海口，如何办理跨省异地就医直接结算备案？"));
            opts.add(new ClarifyOption("👨‍👩‍👧", "医保个人账户家庭成员共济绑定", "医保个人账户家庭共济如何绑定家庭成员（父母/配偶/子女）？"));
            opts.add(new ClarifyOption("👶", "参保女职工顺产/剖宫产生育津贴申领", "参保女职工顺产或剖宫产生小孩，如何申领生育津贴？"));
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

        if (p.contains("落户") || p.contains("大专") || p.contains("毕业生") || p.contains("技能")) {
            list.add(new RecommendItem("👉 申领海口引进人才住房租赁补贴（最高1500元/月）", "海口市引进人才住房租赁补贴如何申领？需要什么材料？"));
            list.add(new RecommendItem("👉 高校毕业生离校未就业档案与报到证协同托管", "高校毕业生离校未就业，毕业档案与报到证应该如何托管？"));
            list.add(new RecommendItem("👉 外省养老保险关系免凭证网上转移接续", "外省跨省离职后，如何把原省份的养老保险关系转移到海南？"));
        } else if (p.contains("异地就医") || p.contains("医保") || p.contains("生育") || p.contains("社保")) {
            list.add(new RecommendItem("👉 医保个人账户家庭成员共济绑定（父母/配偶/子女）", "医保个人账户家庭共济如何绑定家庭成员（父母/配偶/子女）？"));
            list.add(new RecommendItem("👉 外省离职后养老保险跨省转移到海南", "外省跨省离职后，如何把原省份的养老保险关系转移到海南？"));
            list.add(new RecommendItem("👉 灵活就业人员医保中途断缴3个月补缴待遇", "灵活就业人员医保中途断缴3个月，补缴后报销待遇怎么计算？"));
        } else if (p.contains("通行证") || p.contains("护照") || p.contains("港澳") || p.contains("出入境")) {
            list.add(new RecommendItem("👉 赴港澳旅游再次申请签注智能机立等可取", "去香港和澳门旅游，再次申请签注可以在智能机上立等可取吗？"));
            list.add(new RecommendItem("👉 中华人民共和国普通护照首次申领办结时限", "普通护照首次申领需要什么材料？多久可以拿到护照？"));
        } else if (p.contains("公积金") || p.contains("房租") || p.contains("租房")) {
            list.add(new RecommendItem("👉 老旧小区加装电梯能否提取公积金", "老旧小区加装电梯能否申请提取本人及配偶的住房公积金？"));
            list.add(new RecommendItem("👉 离职封存满6个月全额销户提取流程", "离职之后公积金封存满6个月能全额提取吗？"));
        } else if (p.contains("企业") || p.contains("公司") || p.contains("个转企") || p.contains("营业执照")) {
            list.add(new RecommendItem("👉 开办餐饮店食品经营许可证网上申报", "开办餐饮店需要办理食品经营许可证吗？如何网上申报？"));
            list.add(new RecommendItem("👉 新办有限责任公司免费领取成套印章政策", "注册一家新的有限责任公司需要几天？材料要准备什么？"));
        } else if (p.contains("驾驶证") || p.contains("换证") || p.contains("驾照") || p.contains("车管")) {
            list.add(new RecommendItem("👉 外省考的驾驶证直接在海口车管所转入换证", "在外省考的驾驶证，能否直接在海口车管所申请转入换证？"));
            list.add(new RecommendItem("👉 驾驶证期满换证“警医邮”网办邮寄到家", "机动车驾驶证即将期满6年，如何在线体检办理期满换证并邮寄？"));
        }
        return list;
    }

    private String buildSystemPrompt(List<MatchedClause> clauses, boolean hasReliable) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是由海南省人民政府政务便民服务大数据平台驱动的智能政务助理【小政】。\n");
        sb.append("请严格按照以下准则对办事群众的问题进行专业、权威且热情的解答：\n\n");

        if (hasReliable && !clauses.isEmpty()) {
            sb.append("【检索到的官方权威政策法规依据】\n");
            for (int i = 0; i < clauses.size(); i++) {
                MatchedClause c = clauses.get(i);
                sb.append(String.format("法规依据 %d: 《%s》(文号:%s, 颁发机关:%s)\n条款: %s\n正文: %s\n\n",
                        i + 1, c.getDocTitle(), c.getDocNumber(), c.getIssuerDept(), c.getClauseNo(), c.getClauseText()));
            }
            sb.append("【严格答复要求】\n");
            sb.append("1. 政策溯源：回答开头或具体条款处，必须明确写明依据哪部红头文件的哪个具体条款（如：根据《...细则》第X条规定）。\n");
            sb.append("2. 业务导办：分点清晰列出准入资格要求、必备申请材料及办结时效。\n");
            sb.append("3. 杜绝虚构：严禁捏造未经上述参考依据记载的数据、费用或条件。\n");
        } else {
            sb.append("【重要警告：本地官方政务政策库未检索到相关可靠依据】\n");
            sb.append("请向群众礼貌说明：当前本地政务知识库中暂未收录该事项的具体实施办法。\n");
            sb.append("并指引其前往辖区政务服务大厅窗口人工复核，或点击下方【12345诉求直通车】提交工单，由责任部门正式答复，切勿自行臆测编造任何政务规则！\n");
        }

        return sb.toString();
    }
}
