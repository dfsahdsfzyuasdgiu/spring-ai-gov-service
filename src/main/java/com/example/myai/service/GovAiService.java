package com.example.myai.service;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import com.example.myai.model.AffairGuide;
import com.example.myai.model.GovChatHistory;
import com.example.myai.model.KnowledgeRelation;
import com.example.myai.model.dto.ChatRequest;
import com.example.myai.model.dto.ChatResponseChunk;
import com.example.myai.repository.ChatHistoryRepository;
import com.example.myai.repository.KnowledgeGraphRepository;
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
    private final ChatHistoryRepository chatHistoryRepository;
    private final KnowledgeGraphRepository knowledgeGraphRepository;

    public GovAiService(ChatClient.Builder builder,
                        GovRagService govRagService,
                        AffairService affairService,
                        ChatHistoryRepository chatHistoryRepository,
                        KnowledgeGraphRepository knowledgeGraphRepository) {
        this.chatClient = builder.build();
        this.govRagService = govRagService;
        this.affairService = affairService;
        this.chatHistoryRepository = chatHistoryRepository;
        this.knowledgeGraphRepository = knowledgeGraphRepository;
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
     * 核心智能咨询入口：Spring AI 多轮会话上下文 + 关系数据库持久化 + 知识图谱关联 + 分步导办引导
     */
    public Flux<ChatResponseChunk> streamConsultation(ChatRequest request) {
        String prompt = request.getPrompt();
        String category = request.getCategory();
        String sessionId = request.getSessionId() != null ? request.getSessionId() : UUID.randomUUID().toString();

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

        // 3. 读取该会话在关系数据库中的历史上下文（多轮对话连贯理解）
        List<GovChatHistory> historyList = chatHistoryRepository.findBySessionId(sessionId, 4);

        // 4. 构建给大模型的 System Prompt 与 User Prompt
        String systemInstruction = buildSystemPrompt(ragResult.getTopClauses(), hasReliablePolicy, historyList);
        String finalUserPrompt = "群众咨询问题: " + prompt;

        // 5. 组装初始元数据块 (Citation 政策出处)
        List<ChatResponseChunk> prefixChunks = new ArrayList<>();
        String topDocTitle = null;
        String topDocNumber = null;
        if (hasReliablePolicy && !ragResult.getTopClauses().isEmpty()) {
            MatchedClause top = ragResult.getTopClauses().get(0);
            topDocTitle = top.getDocTitle();
            topDocNumber = top.getDocNumber();
            Map<String, Object> citationMap = new HashMap<>();
            citationMap.put("docTitle", top.getDocTitle());
            citationMap.put("docNumber", top.getDocNumber());
            citationMap.put("issuerDept", top.getIssuerDept());
            citationMap.put("clauseNo", top.getClauseNo());
            citationMap.put("clauseText", top.getClauseText());
            prefixChunks.add(ChatResponseChunk.citation(citationMap));
        }

        // 6. 组装收尾卡片块 (办事指南卡片 + 分步导办向导 + 联办推荐)
        List<ChatResponseChunk> suffixChunks = new ArrayList<>();
        if (matchedAffair != null) {
            suffixChunks.add(ChatResponseChunk.guideCard(matchedAffair));

            // 扩展功能二：办事流程引导式卡片 (完整向导三步法: 资格自查 -> 材料准备 -> 网办指引)
            Map<String, Object> guidedSteps = buildGuidedStepsCard(matchedAffair);
            suffixChunks.add(ChatResponseChunk.guidedStepsCard(guidedSteps));
        }

        // 链式关联事项推荐卡片
        List<RecommendItem> recs = getRelatedRecommendations(prompt, matchedAffair);
        if (!recs.isEmpty()) {
            suffixChunks.add(ChatResponseChunk.recommendCard(recs));
        }

        if (!hasReliablePolicy && matchedAffair == null) {
            // 无法可靠匹配政策时，自动推送 12345 工单建议卡片
            suffixChunks.add(ChatResponseChunk.orderCard(category));
        }
        suffixChunks.add(ChatResponseChunk.done());

        // 7. 发起 Spring AI 流式调用，并在完成时持久化至关系数据库
        final String recordDocTitle = topDocTitle;
        final String recordDocNumber = topDocNumber;
        final StringBuilder replyAccumulator = new StringBuilder();

        Flux<String> textStream;
        try {
            textStream = chatClient.prompt()
                    .system(systemInstruction)
                    .user(finalUserPrompt)
                    .options(DashScopeChatOptions.builder()
                            .withModel("qwen-plus")
                            .withTemperature(0.2f)
                            .build())
                    .stream()
                    .content();
        } catch (Exception e) {
            log.error("调用大模型流式接口异常", e);
            textStream = Flux.just("您好，当前政务智能服务繁忙，建议您稍后重试或直接拨打 12345 便民热线咨询。");
        }

        // 组合完整事件流并实现自动落库持久化
        return Flux.fromIterable(prefixChunks)
                .concatWith(textStream.map(chunk -> {
                    String cleanChunk = stripEmoji(chunk);
                    replyAccumulator.append(cleanChunk);
                    return ChatResponseChunk.chunk(cleanChunk);
                }))
                .concatWith(Flux.fromIterable(suffixChunks))
                .doFinally(signal -> {
                    String fullReply = replyAccumulator.toString().trim();
                    if (!fullReply.isEmpty()) {
                        chatHistoryRepository.save(new GovChatHistory(
                                sessionId,
                                "citizen",
                                prompt,
                                fullReply,
                                recordDocTitle,
                                recordDocNumber
                        ));
                        log.info("已将问答记录持久化至关系数据库: sessionId={}, prompt={}", sessionId, prompt);
                    }
                })
                .onErrorResume(err -> {
                    log.error("流式推送中断异常", err);
                    return Flux.just(
                            ChatResponseChunk.chunk("\n\n[提示：网络通信异常，请检查网络或咨询现场政务工作人员]"),
                            ChatResponseChunk.done()
                    );
                });
    }

    /**
     * 扩展功能一：知识图谱关联检索
     */
    private List<KnowledgeRelation> retrieveKnowledgeRelations(AffairGuide matchedAffair, RagMatchResult ragResult) {
        Map<String, KnowledgeRelation> uniqueMap = new LinkedHashMap<>();
        try {
            if (matchedAffair != null) {
                List<KnowledgeRelation> affairRels = knowledgeGraphRepository.findRelated("AFFAIR", String.valueOf(matchedAffair.getId()));
                for (KnowledgeRelation r : affairRels) {
                    uniqueMap.put(r.getSourceName() + "->" + r.getRelationType() + "->" + r.getTargetName(), r);
                }
            }
            if (ragResult.isReliableMatch() && !ragResult.getTopClauses().isEmpty()) {
                MatchedClause top = ragResult.getTopClauses().get(0);
                List<KnowledgeRelation> policyRels = knowledgeGraphRepository.findByNameLike(top.getDocTitle());
                for (KnowledgeRelation r : policyRels) {
                    uniqueMap.put(r.getSourceName() + "->" + r.getRelationType() + "->" + r.getTargetName(), r);
                }
            }
        } catch (Exception e) {
            log.warn("检索政务知识图谱关联异常: {}", e.getMessage());
        }
        return new ArrayList<>(uniqueMap.values());
    }

    /**
     * 扩展功能二：办事流程引导式对话卡片构造 (资格自查 -> 材料准备 -> 网办通道)
     */
    private Map<String, Object> buildGuidedStepsCard(AffairGuide affair) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("affairId", affair.getId());
        card.put("affairCode", affair.getAffairCode());
        card.put("affairName", affair.getAffairName());
        card.put("qualifications", affair.getQualifications());
        card.put("promisedLimitDays", affair.getPromisedLimitDays());
        card.put("handlingAddress", affair.getHandlingAddress());
        card.put("onlineHandleUrl", affair.getOnlineHandleUrl());
        card.put("materials", affair.getMaterials());
        card.put("processSteps", affair.getProcessSteps());

        List<Map<String, String>> steps = new ArrayList<>();

        Map<String, String> step1 = new LinkedHashMap<>();
        step1.put("step", "1");
        step1.put("name", "资格自查");
        step1.put("desc", "智能自查准入条件");
        step1.put("prompt", "请帮我核验办理【" + affair.getAffairName() + "】的准入资格自查要点");
        steps.add(step1);

        Map<String, String> step2 = new LinkedHashMap<>();
        step2.put("step", "2");
        step2.put("name", "材料清单");
        step2.put("desc", "查看免提交材料与核验规范");
        step2.put("prompt", "办理【" + affair.getAffairName() + "】需要哪些申报材料？哪些可以电子证照免提交？");
        steps.add(step2);

        Map<String, String> step3 = new LinkedHashMap<>();
        step3.put("step", "3");
        step3.put("name", "办事指引");
        step3.put("desc", "线上与线下办事文字指引");
        step3.put("prompt", "我想办理【" + affair.getAffairName() + "】，请提供详细的线上与线下办事文字路径指引");
        steps.add(step3);

        card.put("steps", steps);
        return card;
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
            opts.add(new ClarifyOption("", "全日制大专/青年高校毕业生（学历入户）", "我是全日制学历毕业生，在广州怎么办理落户？需要什么条件？"));
            opts.add(new ClarifyOption("", "持有中级及以上技能或职称人员（技能/职称入户）", "持有中级及以上专业技术职称或技能职业资格，如何办理广州入户？"));
            opts.add(new ClarifyOption("", "在穗持居住证且社保满4年（积分制入户）", "在广州办理积分制入户需要满足什么条件？积分排名如何计算？"));
            opts.add(new ClarifyOption("", "配偶投靠与子女随迁落户", "夫妻一方为广州户籍，外地配偶如何办理投靠随迁落户广州？"));
            return new ClarifyData("户籍落户申报", "在广州办理入户有多种法定引进与迁入渠道，为向您提供最精准的政策依据与申报清单，请问您的身份符合以下哪种情形？", opts);
        }

        // 2. 租房与公租房补贴泛化提问
        if (p.equals("公租房") || p.equals("租房补贴") || p.equals("租赁补贴") || p.equals("申请公租房") || p.equals("公租房补贴")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("", "新就业无房职工及外来务工人员申领租赁补贴", "新就业无房职工在广州如何申领公共租赁住房租赁补贴？标准是多少？"));
            opts.add(new ClarifyOption("", "广州本市城镇户籍中等偏下收入家庭公租房保障", "本市户籍低收入中等偏下家庭如何申请公租房实物配租？"));
            opts.add(new ClarifyOption("", "租房提取住房公积金冲抵房租", "在广州无房租房居住，如何按月提取公积金支付房租？"));
            return new ClarifyData("住房保障与租赁补贴", "广州市公租房保障涵盖实物配租与按月发放租赁补贴两种形式，请问您的实际需求是？", opts);
        }

        // 3. 车牌指标与摇号泛化提问
        if (p.equals("车牌") || p.equals("买车") || p.equals("摇号") || p.equals("广州摇号") || p.equals("车牌摇号") || p.equals("竞价")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("", "非广州户籍人员申请中小客车增量指标摇号", "外地人在广州怎么申请中小客车增量指标摇号？医保社保需要满多久？"));
            opts.add(new ClarifyOption("", "广州本市户籍人员申请普通车摇号/竞价", "广州本市户籍人员摇号买车需要什么条件？"));
            opts.add(new ClarifyOption("", "节能车增量指标直接摇号申领", "广州节能车增量指标摇号规则是什么？中签率如何？"));
            return new ClarifyData("中小客车增量指标申请", "广州中小客车增量指标按普通车、节能车及新能源车分类配置，请问您的申请意向是？", opts);
        }

        // 4. 出入境证件泛化提问
        if (p.equals("办通行证") || p.equals("办理通行证") || p.equals("港澳通行证") || p.equals("办护照") || p.equals("出入境") || p.equals("办出入境证件")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("", "首次办理往来港澳通行证（全国通办）", "在广州办理往来港澳通行证需要带什么材料？外省外市户籍可以直接办吗？"));
            opts.add(new ClarifyOption("", "中华人民共和国普通护照首次申领", "普通护照首次申领需要什么材料？多久可以拿到护照？"));
            opts.add(new ClarifyOption("", "赴港澳旅游再次签注（智能签注机立等可取）", "去香港和澳门旅游，再次申请签注可以在智能签注机上立等可取吗？"));
            return new ClarifyData("出入境便民业务", "出入境证件现已全面推行“全国通办”，免回户籍原籍地即可在广州就近申办。请问您需要办理哪类证件？", opts);
        }

        // 5. 异地就医/医保泛化提问
        if (p.equals("异地就医") || p.equals("跨省就医") || p.equals("医保报销") || p.equals("看病报销") || p.equals("灵活就业医保") || p.equals("广州医保")) {
            List<ClarifyOption> opts = new ArrayList<>();
            opts.add(new ClarifyOption("", "广州灵活就业人员参加职工医保参保登记", "灵活就业人员在广州怎么买职工医保？需要广州户口吗？"));
            opts.add(new ClarifyOption("", "医保个人账户家庭成员共济绑定", "广州职工医保个人账户家庭共济如何绑定家庭成员（父母/配偶/子女）？"));
            opts.add(new ClarifyOption("", "跨省异地就医直接结算备案", "外地参保人员在广州看病如何办理跨省异地就医直接结算备案？"));
            return new ClarifyData("医疗保障服务", "医疗保障涉及职工医保参保、门诊定点、长期异地居住备案及家属互济等多项便民通道，请问您的办理诉求是？", opts);
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

        if (p.contains("公租房") || p.contains("补贴") || p.contains("租房")) {
            list.add(new RecommendItem("广州住房公积金无房租赁按月提取", "申领租赁补贴后，如何提取住房公积金支付剩余房租？"));
            list.add(new RecommendItem("新就业青年人才租房补贴与免租公寓申请", "广州各区新就业青年人才公寓如何申请？"));
        } else if (p.contains("落户") || p.contains("积分") || p.contains("入户") || p.contains("来穗")) {
            list.add(new RecommendItem("广州市来穗人员积分制服务核定与加分指标", "来穗人员积分制服务如何核定积分？有哪些加分项目？"));
            list.add(new RecommendItem("新引进人才住房补贴与安家费申领指引", "落户广州后如何申请新引进人才住房补贴与安家费？"));
        } else if (p.contains("车牌") || p.contains("指标") || p.contains("摇号") || p.contains("中小客车") || p.contains("驾照")) {
            list.add(new RecommendItem("机动车驾驶证期满换证“警医邮”网办到家", "广州驾驶证期满换证如何在线体检并邮寄到家？"));
            list.add(new RecommendItem("广州节能车与新能源车指标直接申领通道", "广州节能车指标摇号与新能源指标申请有什么区别？"));
        } else if (p.contains("企业") || p.contains("公司") || p.contains("开办") || p.contains("营业执照") || p.contains("刻章")) {
            list.add(new RecommendItem("广州企业开办一网通办免费领取4枚防伪印章", "新设立企业如何免费领取全套实体印章与电子印章？"));
            list.add(new RecommendItem("食品经营许可告知承诺制“证照联办”", "设立餐饮店如何一并办理营业执照与食品经营许可？"));
        } else if (p.contains("医保") || p.contains("灵活就业") || p.contains("看病")) {
            list.add(new RecommendItem("广州医保个账家庭成员共济绑定（父母/配偶/子女）", "广州医保个人账户如何绑定家庭共济？"));
            list.add(new RecommendItem("灵活就业人员医保断缴补缴待遇衔接规定", "广州灵活就业医保断缴补缴后待遇从什么时候生效？"));
        } else if (p.contains("通行证") || p.contains("护照") || p.contains("港澳") || p.contains("出入境")) {
            list.add(new RecommendItem("赴港澳旅游再次申请签注智能机立等可取", "广州哪里有24小时智能签注机？再次签注立等可取吗？"));
            list.add(new RecommendItem("普通护照首次申领办结时限与加急条件", "普通护照首次申领需要几天？"));
        }
        return list;
    }

    private String buildSystemPrompt(List<MatchedClause> clauses, boolean hasReliable, List<GovChatHistory> historyList) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是广州市人民政府门户网站（www.gz.gov.cn）“政策法规 AI 智能问答专窗·政策便民翻译官”。\n");
        sb.append("你由广州市政务服务和数据管理局指导建设，依托广州市现行规章与规范性文件权威数据库（Vector DB + RAG）为市民提供政策咨询解答。\n");
        sb.append("【核心宗旨】：项目的本质是便利人民的生活，通过 AI 把复杂的法款条例智能翻译成老百姓需要的、能听懂的语言，解决老百姓办事“看不懂政策、找不到门路、不知晓实惠”的痛点。\n");
        sb.append("【核心语言风格准则（极致简约与自然人声，拒绝机械生硬）】：\n");
        sb.append("1. 杜绝机械套路喊口号：严禁使用“能办！”、“不能办！”、“符合！”、“可以！”等生硬突兀的机器人喊话开头。请使用温和、自然、流畅、克制的人性化中文表述，开门见山直接给出结论。\n");
        sb.append("2. 极简清晰：语言如同高品质智能产品（如 Apple 产品语言般克制典雅），1-2句话清晰交代核心结果（身份适用、补贴金额/待遇、时效期限）。\n");
        sb.append("   - 优质范例：“新就业职工可以申领广州市住房租赁补贴。在穗稳定就业且无住房者，符合条件每月最高可领取 1,400 元，最长可享受 5 年。”\n");
        sb.append("   - 严禁生硬套话范例：“能办！在广州稳定工作且在穗没买房...”\n\n");
        sb.append("答复结构模板：\n");
        sb.append("【快速答疑】\n");
        sb.append("（1-2句优雅自然的人性化直接解答，切勿带感叹号口号开头）\n\n");
        sb.append("【注意事项与关键提醒】\n");
        sb.append("（精炼列出容易疏漏的关键事项或截点。公文纪律：严禁使用 ❗、✅、⚠️、📅、📌 等任何 Emoji 符号，每项以短横线或纯文字陈述）\n\n");
        sb.append("【官方政策依据】\n");
        sb.append("（注明依据的官方红头文件名称与文号，例如《广州市xxx规定》（穗府办规〔202x〕x号）。注意：正文切勿大篇幅摘抄法条原文，法定条款原文明细已由系统自动挂载至底部的“查看条文原文”抽屉供市民按需查验）\n\n");
        sb.append("（重要说明：准入门槛、申报材料与线上线下办理路径已由系统自动挂载为结构化【办事向导三步法】卡片，正文无需重复堆砌门槛和材料列表，请专注回答【快速答疑】的核心定性结论与【注意事项与关键提醒】）\n\n");

        if (historyList != null && !historyList.isEmpty()) {
            sb.append("【此前多轮对话历史上下文（会话记忆）】\n");
            for (GovChatHistory h : historyList) {
                sb.append(String.format("市民提问: %s\n助手解答: %s\n\n", h.getUserPrompt(), h.getAiReply()));
            }
            sb.append("（请结合上述历史上下文连贯理解市民的指代与连续追问，如“我符合吗”、“怎么领”、“要带什么”）\n\n");
        }

        if (hasReliable && !clauses.isEmpty()) {
            sb.append("【检索到的广州市官方权威政策法规依据】\n");
            for (int i = 0; i < clauses.size(); i++) {
                MatchedClause c = clauses.get(i);
                sb.append(String.format("法规依据 %d: 《%s》(文号:%s, 颁发机关:%s)\n条款: %s\n正文: %s\n\n",
                        i + 1, c.getDocTitle(), c.getDocNumber(), c.getIssuerDept(), c.getClauseNo(), c.getClauseText()));
            }
            sb.append("【严格答复要求】\n");
            sb.append("1. 白话转换：必须将法规术语转换为群众日常生活用语（例如将“行政相对人”转换为“办事市民”，“本市行政区域内”转换为“广州全市”）。\n");
            sb.append("2. 杜绝虚构：严禁捏造未经检索依据记载的任何数据、补贴金额或行政门槛。\n");
            sb.append("3. 严格零 Emoji 纪律：严禁在正文中出现任何表情符号、彩色图符（如 ❗、✅、⚠️、📅、📌、👉），Emoji 计数必须为 0，保持政府公文的严肃与庄重。\n");
        } else {
            sb.append("【广州官方政务政策库检索说明】\n");
            sb.append("当前检索到的政策与问题关联度较低。请向市民通俗说明：在广州市现行有效政策库中暂未检索到直接完全匹配的条款细则。\n");
            sb.append("可建议市民前往广州市人民政府门户网站查阅或拨打 12345 便民热线进行人工核实，切勿臆造政策规则。\n");
            sb.append("严格保持严肃公文体例，绝不输出任何 Emoji 表情符号。\n");
        }

        return sb.toString();
    }

    public static String stripEmoji(String text) {
        if (text == null || text.isEmpty()) return text;
        StringBuilder sb = new StringBuilder(text.length());
        int len = text.length();
        for (int i = 0; i < len; ) {
            int cp = text.codePointAt(i);
            int charCount = Character.charCount(cp);
            i += charCount;
            if ((cp >= 0x1F000 && cp <= 0x1FAFF)
                    || (cp >= 0x2600 && cp <= 0x27BF)
                    || (cp >= 0xFE00 && cp <= 0xFE0F)
                    || (cp >= 0x2300 && cp <= 0x23FF)
                    || (cp >= 0x2B00 && cp <= 0x2BFF)
                    || cp == 0x200D) {
                continue;
            }
            sb.appendCodePoint(cp);
        }
        return sb.toString();
    }
}
