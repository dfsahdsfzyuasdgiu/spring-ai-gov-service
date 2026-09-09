package com.example.myai.controller;

import com.example.myai.common.Result;
import com.example.myai.model.dto.ChatRequest;
import com.example.myai.model.dto.ChatResponseChunk;
import com.example.myai.model.dto.FeedbackDTO;
import com.example.myai.service.GovAiService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/v1/gov/chat")
@CrossOrigin(origins = "*")
public class GovChatController {

    private final GovAiService govAiService;
    // 统计好差评指标与咨询量
    public static final AtomicInteger totalConsultationCount = new AtomicInteger(1582);
    public static final AtomicInteger thumbsUpCount = new AtomicInteger(128);
    public static final AtomicInteger thumbsDownCount = new AtomicInteger(6);
    public static final Map<String, String> feedbackReasons = new ConcurrentHashMap<>();

    public GovChatController(GovAiService govAiService) {
        this.govAiService = govAiService;
    }

    /**
     * 流式政务智能咨询接口 (Server-Sent Events)
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChatResponseChunk> chatStream(@RequestBody ChatRequest request) {
        if (request.getPrompt() == null || request.getPrompt().trim().isEmpty()) {
            return Flux.just(
                    ChatResponseChunk.chunk("您好！请问有什么政务政策或办事流程我可以为您效劳？"),
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
    public Result<String> submitFeedback(@RequestBody FeedbackDTO dto) {
        if (dto.getRating() > 0) {
            thumbsUpCount.incrementAndGet();
        } else if (dto.getRating() < 0) {
            thumbsDownCount.incrementAndGet();
            if (dto.getReason() != null) {
                feedbackReasons.put(dto.getSessionId() != null ? dto.getSessionId() : "anon", dto.getReason());
            }
        }
        return Result.success("感谢您的宝贵评价！我们将持续优化政务咨询精准度。", "OK");
    }
}
