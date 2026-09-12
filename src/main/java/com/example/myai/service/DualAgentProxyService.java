package com.example.myai.service;

import com.example.myai.model.dto.ChatResponseChunk;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

/**
 * 政务双 Agent 协同系统代理服务 (方案 A: 后端网关联邦接入)
 * 对接同学提供的 Dual-Agent Government RAG API (公网: http://149.118.133.163:6001)
 * 具备 Bearer Token 自动注入、SSE 实时事件流解析与高可用熔断快速降级能力
 */
@Service
public class DualAgentProxyService {

    private static final Logger log = LoggerFactory.getLogger(DualAgentProxyService.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${gov.dual-agent.enabled:true}")
    private boolean enabled = true;

    @Value("${gov.dual-agent.base-url:http://149.118.133.163:6001}")
    private String baseUrl = "http://149.118.133.163:6001";

    @Value("${gov.dual-agent.auth-token:gov-rag-sec-2026-auth-token}")
    private String authToken = "gov-rag-sec-2026-auth-token";

    @Value("${gov.dual-agent.connect-timeout-ms:3000}")
    private int connectTimeoutMs = 3000;

    @Value("${gov.dual-agent.read-timeout-ms:25000}")
    private int readTimeoutMs = 25000;

    public DualAgentProxyService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(3000))
                .build();
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    /**
     * 探针健康检查：测试远端 6001 服务连接性及响应延时
     */
    public Map<String, Object> checkStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("enabled", enabled);
        status.put("baseUrl", baseUrl);
        status.put("authTokenMasked", maskToken(authToken));
        status.put("connectTimeoutMs", connectTimeoutMs);
        status.put("readTimeoutMs", readTimeoutMs);

        if (!enabled) {
            status.put("online", false);
            status.put("message", "双 Agent 代理路由已关闭 (gov.dual-agent.enabled=false)");
            return status;
        }

        long start = System.currentTimeMillis();
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/health"))
                    .timeout(Duration.ofMillis(connectTimeoutMs))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            long latency = System.currentTimeMillis() - start;
            status.put("latencyMs", latency);
            status.put("httpStatus", resp.statusCode());

            if (resp.statusCode() == 200) {
                status.put("online", true);
                try {
                    status.put("remoteHealth", objectMapper.readValue(resp.body(), Object.class));
                } catch (Exception ignored) {
                    status.put("remoteHealth", resp.body());
                }
            } else {
                status.put("online", false);
                status.put("error", "HTTP Status " + resp.statusCode());
            }
        } catch (Exception e) {
            status.put("online", false);
            status.put("latencyMs", System.currentTimeMillis() - start);
            status.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
        }

        return status;
    }

    /**
     * 流式调用远端双 Agent 问答接口: POST /api/chat/stream
     * 响应格式 text/event-stream，映射转换为本系统的 ChatResponseChunk
     */
    public Flux<ChatResponseChunk> streamChat(String query, String sessionId) {
        if (!enabled) {
            return Flux.error(new IllegalStateException("DualAgentProxy is disabled"));
        }

        return Flux.<ChatResponseChunk>create(sink -> {
            try {
                Map<String, Object> payloadMap = new HashMap<>();
                payloadMap.put("query", query);
                if (sessionId != null && !sessionId.trim().isEmpty()) {
                    payloadMap.put("sessionId", sessionId.trim());
                }
                String requestJson = objectMapper.writeValueAsString(payloadMap);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/api/chat/stream"))
                        .header("Content-Type", "application/json; charset=utf-8")
                        .header("Accept", "text/event-stream")
                        .header("Authorization", "Bearer " + authToken)
                        .timeout(Duration.ofMillis(readTimeoutMs))
                        .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                        .build();

                log.info("向远端双 Agent 发起流式咨询请求: url={}/api/chat/stream, query={}", baseUrl, query);

                HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

                if (response.statusCode() != 200) {
                    throw new RuntimeException("DualAgent HTTP Error: " + response.statusCode());
                }

                try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                    String line;
                    String currentEvent = "message";
                    StringBuilder dataBuffer = new StringBuilder();

                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("event:")) {
                            currentEvent = line.substring(6).trim();
                        } else if (line.startsWith("data:")) {
                            if (dataBuffer.length() > 0) {
                                dataBuffer.append("\n");
                            }
                            dataBuffer.append(line.substring(5).trim());
                        } else if (line.trim().isEmpty()) {
                            if (dataBuffer.length() > 0) {
                                String dataStr = dataBuffer.toString().trim();
                                dataBuffer.setLength(0);
                                if (!dataStr.isEmpty()) {
                                    dispatchSseEvent(currentEvent, dataStr, sink);
                                }
                                currentEvent = "message";
                            }
                        }
                    }

                    if (dataBuffer.length() > 0) {
                        dispatchSseEvent(currentEvent, dataBuffer.toString().trim(), sink);
                    }
                    sink.complete();
                }
            } catch (Throwable t) {
                log.warn("调用远端双 Agent 异常: {}", t.getMessage());
                sink.error(t);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private void dispatchSseEvent(String eventType, String dataStr, reactor.core.publisher.FluxSink<ChatResponseChunk> sink) {
        if ("[DONE]".equalsIgnoreCase(dataStr)) {
            sink.next(ChatResponseChunk.done());
            return;
        }

        try {
            JsonNode root = objectMapper.readTree(dataStr);

            // 如果没有显式 event:，检查 json 内部是否有 type
            String effectiveEvent = eventType;
            if ("message".equalsIgnoreCase(effectiveEvent) && root.has("type")) {
                effectiveEvent = root.get("type").asText();
            }

            switch (effectiveEvent.toLowerCase()) {
                case "session":
                    String sessId = root.has("sessionId") ? root.get("sessionId").asText() : "";
                    sink.next(ChatResponseChunk.customWithData("session", sessId, objectMapper.convertValue(root, Map.class)));
                    break;

                case "progress":
                    String stage = root.has("stage") ? root.get("stage").asText() : "";
                    String msg = root.has("message") ? root.get("message").asText() : "";
                    sink.next(ChatResponseChunk.progress(objectMapper.convertValue(root, Map.class), msg));
                    break;

                case "route":
                    String intent = root.has("intent") ? root.get("intent").asText() : "";
                    sink.next(ChatResponseChunk.route(objectMapper.convertValue(root, Map.class), intent));
                    break;

                case "ambiguity":
                    String ambMsg = root.has("message") ? root.get("message").asText()
                            : (root.has("question") ? root.get("question").asText() : "请选择具体办理情形");
                    sink.next(ChatResponseChunk.ambiguity(objectMapper.convertValue(root, Map.class), ambMsg));
                    break;

                case "matched_item":
                    sink.next(ChatResponseChunk.matchedItem(objectMapper.convertValue(root, Map.class)));
                    break;

                case "references":
                    // 转换为出处标签，兼容前端现有 citation 抽屉
                    if (root.has("chunks") && root.get("chunks").isArray() && !root.get("chunks").isEmpty()) {
                        JsonNode first = root.get("chunks").get(0);
                        Map<String, Object> cit = new LinkedHashMap<>();
                        cit.put("docTitle", first.path("title").asText("法定公文规范"));
                        cit.put("clauseNo", first.path("articleLabel").asText(""));
                        cit.put("issuerDept", first.path("level").asText("国家/省市政务法规库"));
                        cit.put("clauseText", first.path("content").asText(""));
                        sink.next(ChatResponseChunk.citation(cit));
                    } else {
                        sink.next(ChatResponseChunk.citation(objectMapper.convertValue(root, Map.class)));
                    }
                    break;

                case "chunk":
                    String chunkContent = "";
                    if (root.has("content")) {
                        chunkContent = root.get("content").asText();
                    } else if (root.has("text")) {
                        chunkContent = root.get("text").asText();
                    }
                    if (!chunkContent.isEmpty()) {
                        sink.next(ChatResponseChunk.chunk(GovAiService.stripEmoji(chunkContent)));
                    }
                    break;

                case "done":
                    sink.next(ChatResponseChunk.done());
                    break;

                case "error":
                    String errMsg = root.has("message") ? root.get("message").asText() : "远端处理异常";
                    log.warn("远端返回 error 事件: {}", errMsg);
                    sink.error(new RuntimeException("Remote dual-agent error: " + errMsg));
                    break;

                default:
                    // 默认按文本 chunk 或携带数据处理
                    if (root.has("content") || root.has("text")) {
                        String txt = root.has("content") ? root.get("content").asText() : root.get("text").asText();
                        sink.next(ChatResponseChunk.chunk(GovAiService.stripEmoji(txt)));
                    } else {
                        sink.next(ChatResponseChunk.customWithData(effectiveEvent, "", objectMapper.convertValue(root, Map.class)));
                    }
                    break;
            }
        } catch (Exception e) {
            log.debug("解析 SSE 数据行不是标准 JSON，作为纯文本处理: {}", dataStr);
            sink.next(ChatResponseChunk.chunk(GovAiService.stripEmoji(dataStr)));
        }
    }

    private String maskToken(String token) {
        if (token == null || token.length() <= 8) {
            return "******";
        }
        return token.substring(0, 4) + "..." + token.substring(token.length() - 4);
    }
}
