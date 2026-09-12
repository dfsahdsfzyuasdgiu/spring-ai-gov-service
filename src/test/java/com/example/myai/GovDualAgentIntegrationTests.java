package com.example.myai;

import com.example.myai.model.dto.ChatRequest;
import com.example.myai.model.dto.ChatResponseChunk;
import com.example.myai.service.DualAgentProxyService;
import com.example.myai.service.GovAiService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class GovDualAgentIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DualAgentProxyService dualAgentProxyService;

    @Autowired
    private GovAiService govAiService;

    @Test
    @DisplayName("双 Agent 探针状态接口与健康指标完整性测试")
    void testDualAgentStatusCheck() throws Exception {
        mockMvc.perform(get("/api/v1/gov/dual-agent/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.enabled").value(true))
                .andExpect(jsonPath("$.data.baseUrl").value("http://149.118.133.163:6001"));

        Map<String, Object> statusMap = dualAgentProxyService.checkStatus();
        assertNotNull(statusMap);
        assertTrue((Boolean) statusMap.get("enabled"));
        assertEquals("http://149.118.133.163:6001", statusMap.get("baseUrl"));
    }

    @Test
    @DisplayName("双 Agent 熔断与平滑降级测试：远端不可用时本地引擎无感知接管")
    void testDualAgentFallbackToLocal() {
        ChatRequest req = new ChatRequest();
        req.setPrompt("如何提取住房公积金？");
        req.setCategory("公积金");
        req.setToken("valid-token");

        // 当远端服务不可用时，govAiService.streamConsultation 必须自动平滑降级至本地引擎，并成功吐出事件流
        Flux<ChatResponseChunk> flux = govAiService.streamConsultation(req);
        assertNotNull(flux);

        List<ChatResponseChunk> chunks = flux.collectList().block();
        assertNotNull(chunks);
        assertFalse(chunks.isEmpty(), "降级流必须包含有效的回答数据");

        boolean hasChunkOrCard = chunks.stream().anyMatch(c ->
                "chunk".equals(c.getType()) || "clarify_card".equals(c.getType()) || "ambiguity".equals(c.getType())
        );
        assertTrue(hasChunkOrCard, "降级流中必须包含解答文本或多情形选择卡片");
    }

    @Test
    @DisplayName("双 Agent SSE 全生命周期报文解析与映射协议审计测试")
    void testDualAgentSseStreamParsing() throws Exception {
        com.sun.net.httpserver.HttpServer server = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress(0), 0);
        server.createContext("/api/chat/stream", exchange -> {
            byte[] sseData = ("event: session\n" +
                    "data: {\"sessionId\": \"test-session-123\"}\n\n" +
                    "event: progress\n" +
                    "data: {\"stage\": \"RETRIEVING\", \"message\": \"正在检索事项库并精排...\"}\n\n" +
                    "event: route\n" +
                    "data: {\"intent\": \"SERVICE\", \"region\": \"天河区\"}\n\n" +
                    "event: ambiguity\n" +
                    "data: {\"isAmbiguous\": true, \"message\": \"请选择情形\", \"scenarios\": [{\"index\": 1, \"label\": \"租房提取\"}]}\n\n" +
                    "event: matched_item\n" +
                    "data: {\"itemId\": \"item-01\", \"itemName\": \"食品经营许可\", \"deptName\": \"天河区市监局\"}\n\n" +
                    "event: chunk\n" +
                    "data: {\"content\": \"这是广州双Agent协同给出的回答。\"}\n\n" +
                    "event: done\n" +
                    "data: {\"completed\": true, \"totalTimeMs\": 500}\n\n").getBytes(java.nio.charset.StandardCharsets.UTF_8);

            exchange.getResponseHeaders().set("Content-Type", "text/event-stream; charset=utf-8");
            exchange.sendResponseHeaders(200, sseData.length);
            exchange.getResponseBody().write(sseData);
            exchange.getResponseBody().close();
        });
        server.start();

        int port = server.getAddress().getPort();
        try {
            DualAgentProxyService customProxy = new DualAgentProxyService(new com.fasterxml.jackson.databind.ObjectMapper());
            java.lang.reflect.Field baseField = DualAgentProxyService.class.getDeclaredField("baseUrl");
            baseField.setAccessible(true);
            baseField.set(customProxy, "http://127.0.0.1:" + port);

            List<ChatResponseChunk> chunks = customProxy.streamChat("测试问答", "test-session-123")
                    .collectList()
                    .block();

            assertNotNull(chunks);
            assertTrue(chunks.stream().anyMatch(c -> "session".equals(c.getType())));
            assertTrue(chunks.stream().anyMatch(c -> "progress".equals(c.getType())));
            assertTrue(chunks.stream().anyMatch(c -> "route".equals(c.getType())));
            assertTrue(chunks.stream().anyMatch(c -> "ambiguity".equals(c.getType())));
            assertTrue(chunks.stream().anyMatch(c -> "matched_item".equals(c.getType())));
            assertTrue(chunks.stream().anyMatch(c -> "chunk".equals(c.getType()) && c.getContent().contains("广州双Agent协同")));
            assertTrue(chunks.stream().anyMatch(c -> "done".equals(c.getType())));
        } finally {
            server.stop(0);
        }
    }
}
