package com.example.myai.controller;

import com.example.myai.common.Result;
import com.example.myai.model.AffairGuide;
import com.example.myai.model.GovChatHistory;
import com.example.myai.model.KnowledgeRelation;
import com.example.myai.model.dto.ChatRequest;
import com.example.myai.model.dto.ChatResponseChunk;
import com.example.myai.model.dto.FeedbackDTO;
import com.example.myai.repository.AffairRepository;
import com.example.myai.repository.ChatHistoryRepository;
import com.example.myai.repository.KnowledgeGraphRepository;
import com.example.myai.service.GovAiService;
import com.example.myai.service.GovCrawlerService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/v1/gov/chat")
@CrossOrigin(origins = "*")
public class GovChatController {

    private final GovAiService govAiService;
    private final ChatHistoryRepository chatHistoryRepository;
    private final KnowledgeGraphRepository knowledgeGraphRepository;
    private final AffairRepository affairRepository;
    private final GovCrawlerService govCrawlerService;

    // 统计好差评指标与咨询量
    public static final AtomicInteger totalConsultationCount = new AtomicInteger(1582);
    public static final AtomicInteger thumbsUpCount = new AtomicInteger(128);
    public static final AtomicInteger thumbsDownCount = new AtomicInteger(6);
    public static final Map<String, String> feedbackReasons = new ConcurrentHashMap<>();

    public GovChatController(GovAiService govAiService,
                             ChatHistoryRepository chatHistoryRepository,
                             KnowledgeGraphRepository knowledgeGraphRepository,
                             AffairRepository affairRepository,
                             GovCrawlerService govCrawlerService) {
        this.govAiService = govAiService;
        this.chatHistoryRepository = chatHistoryRepository;
        this.knowledgeGraphRepository = knowledgeGraphRepository;
        this.affairRepository = affairRepository;
        this.govCrawlerService = govCrawlerService;
    }

    /**
     * 流式政务智能咨询接口 (Server-Sent Events)
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChatResponseChunk> chatStream(@RequestBody(required = false) ChatRequest request) {
        if (request == null || request.getPrompt() == null || request.getPrompt().trim().isEmpty()) {
            return Flux.just(
                    ChatResponseChunk.chunk("您好！请问有什么广州市政务政策或办事流程我可以为您效劳？"),
                    ChatResponseChunk.done()
            );
        }
        // 未实名登录拦截
        if (request.getToken() == null || request.getToken().trim().isEmpty()) {
            return Flux.just(
                    ChatResponseChunk.chunk("您好！为了落实国家政务服务“高效办成一件事”实名制办件与咨询安全规范，请您先完成实名登录后，再进行智能咨询与业务导办。"),
                    ChatResponseChunk.custom("auth_required", "请先登录"),
                    ChatResponseChunk.done()
            );
        }
        totalConsultationCount.incrementAndGet();
        return govAiService.streamConsultation(request);
    }

    /**
     * 群众好差评评价接口
     */
    @PostMapping("/feedback")
    public Result<String> submitFeedback(@RequestBody(required = false) FeedbackDTO dto) {
        if (dto == null) {
            return Result.error(400, "评价内容不能为空");
        }
        if (dto.getRating() > 0) {
            thumbsUpCount.incrementAndGet();
        } else if (dto.getRating() < 0) {
            thumbsDownCount.incrementAndGet();
            if (dto.getReason() != null && !dto.getReason().trim().isEmpty()) {
                feedbackReasons.put(dto.getSessionId() != null ? dto.getSessionId() : "anon", dto.getReason().trim());
            }
        }
        return Result.success("感谢您的宝贵评价！我们将持续优化政务咨询精准度。", "OK");
    }

    /**
     * 查询指定会话或全局最近的对话历史 (Spring AI 对话上下文与持久化管理)
     */
    @GetMapping("/history")
    public Result<List<GovChatHistory>> getChatHistory(@RequestParam(required = false) String sessionId,
                                                      @RequestParam(defaultValue = "10") int limit) {
        int safeLimit = (limit <= 0) ? 10 : Math.min(limit, 100);
        if (sessionId != null && !sessionId.trim().isEmpty()) {
            return Result.success(chatHistoryRepository.findBySessionId(sessionId.trim(), safeLimit));
        }
        return Result.success(chatHistoryRepository.findRecent(safeLimit));
    }

    /**
     * 清空指定会话的历史记录
     */
    @DeleteMapping("/history")
    public Result<String> clearChatHistory(@RequestParam(required = false) String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            return Result.error(400, "会话标识 sessionId 不能为空");
        }
        int rows = chatHistoryRepository.clearBySessionId(sessionId.trim());
        return Result.success("会话历史清理成功，已删除 " + rows + " 条记录", "OK");
    }

    /**
     * 扩展功能一：政务知识图谱关联检索
     */
    @GetMapping("/graph")
    public Result<List<KnowledgeRelation>> getKnowledgeRelations(@RequestParam(required = false) String entityType,
                                                                 @RequestParam(required = false) String entityId,
                                                                 @RequestParam(required = false) String keyword) {
        String cleanType = entityType != null ? entityType.trim() : null;
        String cleanId = entityId != null ? entityId.trim() : null;
        String cleanKw = keyword != null ? keyword.trim() : null;

        if (cleanType != null && !cleanType.isEmpty() && cleanId != null && !cleanId.isEmpty()) {
            return Result.success(knowledgeGraphRepository.findRelated(cleanType, cleanId));
        }
        if (cleanKw != null && !cleanKw.isEmpty()) {
            return Result.success(knowledgeGraphRepository.findByNameLike(cleanKw));
        }
        return Result.success(knowledgeGraphRepository.findAll());
    }

    /**
     * 扩展功能二：办事流程引导式对话向导交互接口
     */
    @PostMapping("/guide-step")
    public Result<Map<String, Object>> handleGuideStep(@RequestBody(required = false) Map<String, Object> body) {
        Long affairId = 101L;
        int stepNo = 1;
        if (body != null) {
            Object aObj = body.get("affairId");
            if (aObj != null) {
                try {
                    affairId = Long.parseLong(aObj.toString().trim());
                } catch (Exception ignored) {}
            }
            Object sObj = body.get("stepNo");
            if (sObj != null) {
                try {
                    stepNo = Integer.parseInt(sObj.toString().trim());
                } catch (Exception ignored) {}
            }
        }

        AffairGuide affair = affairRepository.findById(affairId).orElse(null);
        if (affair == null) {
            return Result.error(404, "未找到对应的办事指南事项");
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("affairId", affair.getId());
        resp.put("affairName", affair.getAffairName());
        resp.put("stepNo", stepNo);

        if (stepNo == 1) {
            resp.put("stepName", "资格自查");
            resp.put("qualifications", affair.getQualifications());
            resp.put("guidance", "请对照上述准入条件确认是否符合申报资质。若符合，请点击进入【步骤二：材料核验】查看必备清单。");
            resp.put("nextStep", 2);
            resp.put("nextStepName", "材料清单核验");
        } else if (stepNo == 2) {
            resp.put("stepName", "材料清单");
            resp.put("materials", affair.getMaterials());
            resp.put("guidance", "已为您自动筛查该事项的申报材料清单。大部分核心材料已支持‘电子证照免提交’或大数据自动联网比对。");
            resp.put("nextStep", 3);
            resp.put("nextStepName", "办事路径与时限");
        } else {
            resp.put("stepName", "办事指引");
            resp.put("promisedLimitDays", affair.getPromisedLimitDays());
            resp.put("handlingAddress", affair.getHandlingAddress());
            resp.put("processSteps", affair.getProcessSteps());
            resp.put("guidance", "【全流程文字办事指引】\n" +
                    "1. 承诺办结时限：" + affair.getPromisedLimitDays() + " 个工作日。\n" +
                    "2. 线上办理路径：微信打开“穗好办”小程序或登录广东政务服务网广州专区，在顶部搜索栏输入“" + affair.getAffairName() + "”，刷脸完成实名认证后，系统自动调用免提交证照核验，核对无误即可在线确认提交。\n" +
                    "3. 线下网点办理：可前往 " + (affair.getHandlingAddress() != null ? affair.getHandlingAddress() : "广州市各区或街道政务服务中心综合窗口") + "，持身份证原件办理。\n" +
                    "4. 办结短信提醒：审批通过后，办理结果将以政务短信通知并下发电子凭据。");
        }

        return Result.success(resp);
    }

    /**
     * 广州政务政策与办事公文爬虫采集触发接口
     */
    @PostMapping("/crawl")
    public Result<Object> triggerCrawler(@RequestBody(required = false) Map<String, String> body) {
        if (body == null) {
            return Result.error(400, "请求体不能为空");
        }
        String url = body.get("url") != null ? body.get("url").trim() : null;
        String category = body.get("category") != null ? body.get("category").trim() : null;
        String html = body.get("html") != null ? body.get("html").trim() : null;
        if ((url == null || url.isEmpty()) && (html == null || html.isEmpty())) {
            return Result.error(400, "URL 或 HTML 不能为空");
        }
        GovCrawlerService.CrawlResult res = govCrawlerService.crawlPolicyByUrl(url != null ? url : "https://www.gz.gov.cn/zwgk/fggw/sample", category, html);
        if (res.isSuccess()) {
            return Result.success(res.getMessage(), res.getPolicyDoc());
        } else {
            return Result.error(500, res.getMessage());
        }
    }
}
