package com.example.myai;

import com.example.myai.model.AffairGuide;
import com.example.myai.model.PolicyDoc;
import com.example.myai.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 广州市政务服务系统 · 全面安全性、可靠性与功能完整性自动化审计测试
 */
@SpringBootTest
@AutoConfigureMockMvc
public class GovEndpointSecurityAuditTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AffairRepository affairRepository;

    @Autowired
    private PolicyRepository policyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("R1 & R3 审计：32 项政务事项与 27 部法定政策全量完整性及广东政务服务网直达链接审计")
    void testAffairsAndPoliciesDataIntegrity() {
        List<AffairGuide> affairs = affairRepository.findAll();
        assertEquals(32, affairs.size(), "系统必须预置全部 32 项核心政务办事指南");

        for (AffairGuide affair : affairs) {
            assertNotNull(affair.getAffairCode(), "实施编码不可为空");
            assertNotNull(affair.getAffairName(), "事项名称不可为空");
            assertTrue(affair.getPromisedLimitDays() > 0, "承诺办结时限必须大于0");
            assertNotNull(affair.getQualifications(), "准入资格不可为空");

            String url = affair.getOnlineHandleUrl();
            assertNotNull(url, "办事直通链接不可为空: " + affair.getAffairName());
            assertTrue(url.startsWith("https://www.gdzwfw.gov.cn/portal/v2/search?keyword="),
                    "所有32项政务事项必须统一对齐广东政务服务网检索直达门户: " + url);
            assertTrue(url.contains("region=440100"), "政务事项链接必须精准限定广州专区代码 region=440100");

            // 级联材料与流程验证
            AffairGuide detail = affairRepository.findById(affair.getId()).orElse(null);
            assertNotNull(detail);
            assertFalse(detail.getMaterials().isEmpty(), affair.getAffairName() + " 必须包含至少一项办事材料");
            assertFalse(detail.getProcessSteps().isEmpty(), affair.getAffairName() + " 必须包含至少一个办理流程节点");
        }

        List<PolicyDoc> policies = policyRepository.findAll();
        assertEquals(27, policies.size(), "系统必须预置全部 27 部广州市现行法定红头公文与政策");
        for (PolicyDoc policy : policies) {
            assertNotNull(policy.getTitle());
            assertNotNull(policy.getDocNumber());
            PolicyDoc detail = policyRepository.findById(policy.getId()).orElse(null);
            assertNotNull(detail);
            assertFalse(detail.getClauses().isEmpty(), policy.getTitle() + " 必须包含有效政策条款");
        }
    }

    @Test
    @DisplayName("R3 审计：数据库 DDL 级联外键约束 (ON DELETE CASCADE) 与无孤儿记录审计")
    void testCascadeDeleteIntegrity() {
        // 1. 验证政策公文级联删除
        jdbcTemplate.update("INSERT INTO gov_policy_doc (id, doc_number, title, category, issuer_dept, publish_date, effective_date, status, summary) " +
                "VALUES (8888, '穗府办规〔2026〕88号', '测试政策公文', '测试', '广州市人民政府办公厅', '2026-01-01', '2026-01-01', 1, '测试公文全文')");
        jdbcTemplate.update("INSERT INTO gov_policy_clause (policy_id, clause_no, clause_text) " +
                "VALUES (8888, '第一条', '测试条款内容')");

        Integer clauseCountBefore = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM gov_policy_clause WHERE policy_id = 8888", Integer.class);
        assertEquals(1, clauseCountBefore);

        jdbcTemplate.update("DELETE FROM gov_policy_doc WHERE id = 8888");
        Integer clauseCountAfter = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM gov_policy_clause WHERE policy_id = 8888", Integer.class);
        assertEquals(0, clauseCountAfter, "政策被删除后其条款必须由外键级联删除");

        // 2. 验证政务办事指南级联删除材料与流程
        jdbcTemplate.update("INSERT INTO gov_affair_guide (id, affair_code, affair_name, category, service_object, legal_limit_days, promised_limit_days, qualifications, handling_address, online_handle_url) " +
                "VALUES (8888, 'TEST-001', '测试政务事项', '测试', '自然人', 5, 1, '资格准入', '办理地址', 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=test&region=440100')");
        jdbcTemplate.update("INSERT INTO gov_affair_material (affair_id, name, mandatory, format, sample_tip) " +
                "VALUES (8888, '测试材料', TRUE, '原件', '提示')");
        jdbcTemplate.update("INSERT INTO gov_affair_process (affair_id, step_no, step_name, description, time_cost) " +
                "VALUES (8888, 1, '测试步骤', '步骤说明', '1天')");

        jdbcTemplate.update("DELETE FROM gov_affair_guide WHERE id = 8888");
        Integer matCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM gov_affair_material WHERE affair_id = 8888", Integer.class);
        Integer procCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM gov_affair_process WHERE affair_id = 8888", Integer.class);
        assertEquals(0, matCount, "事项被删除后其材料必须由外键级联删除");
        assertEquals(0, procCount, "事项被删除后其流程必须由外键级联删除");
    }

    @Test
    @DisplayName("R1 审计：全量核心 REST 接口 HTTP 200 与 Result<T> 标准响应结构")
    void testCoreRestEndpoints() throws Exception {
        // 政策列表
        mockMvc.perform(get("/api/v1/gov/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data", hasSize(27)));

        // 办事事项列表
        mockMvc.perform(get("/api/v1/gov/affairs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data", hasSize(32)));

        // 单个事项详情
        mockMvc.perform(get("/api/v1/gov/affairs/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.affairName").value(containsString("公共租赁住房")));

        // 政策条款检索
        mockMvc.perform(get("/api/v1/gov/policy/search").param("keyword", "公租房"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray());

        // 仪表盘大屏统计（确保满意度计算非 NaN）
        mockMvc.perform(get("/api/v1/gov/dashboard/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.satisfactionRate", not(containsString("NaN"))))
                .andExpect(jsonPath("$.data.totalConsultations", greaterThanOrEqualTo(1000)));

        // 工单列表
        mockMvc.perform(get("/api/v1/gov/work-order/list"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 问答历史
        mockMvc.perform(get("/api/v1/gov/chat/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 知识图谱三元组
        mockMvc.perform(get("/api/v1/gov/chat/graph"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 双 Agent 状态接口审计
        mockMvc.perform(get("/api/v1/gov/dual-agent/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.enabled").value(true));

        mockMvc.perform(get("/api/v1/gov/chat/dual-agent/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    @DisplayName("R2 审计：异常输入、边界值与安全拦截（Null payload、参数缺失、负数ID）")
    void testEdgeCasesAndInputValidation() throws Exception {
        // 1. 负数与非法事项 ID
        mockMvc.perform(get("/api/v1/gov/affairs/-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        mockMvc.perform(get("/api/v1/gov/affairs/999999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));

        // 2. 负数与非法政策 ID
        mockMvc.perform(get("/api/v1/gov/policies/-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        mockMvc.perform(get("/api/v1/gov/policies/999999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));

        // 3. 12345 工单空载荷提交
        mockMvc.perform(post("/api/v1/gov/work-order/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        // 4. 12345 AI 研判空载荷
        mockMvc.perform(post("/api/v1/gov/work-order/ai-triage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        // 5. 12345 答复工单不存在与非法ID
        mockMvc.perform(post("/api/v1/gov/work-order/-1/reply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"replyContent\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        mockMvc.perform(post("/api/v1/gov/work-order/999999/reply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"replyContent\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));

        // 6. 统一认证空载荷登录与注册
        mockMvc.perform(post("/api/v1/gov/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        mockMvc.perform(post("/api/v1/gov/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        // 7. 删除会话历史缺失 sessionId
        mockMvc.perform(delete("/api/v1/gov/chat/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));

        // 8. 流程向导空载荷容错 (默认首步)
        mockMvc.perform(post("/api/v1/gov/chat/guide-step")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.stepNo").value(1));

        // 9. 爬虫空载荷
        mockMvc.perform(post("/api/v1/gov/chat/crawl")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    @DisplayName("R2 审计：流式对话 SSE 接口安全拦截与身份校验")
    void testChatStreamSecurity() throws Exception {
        // 1. 空 prompt 请求
        MvcResult res1 = mockMvc.perform(post("/api/v1/gov/chat/stream")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(res1))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andExpect(content().string(containsString("广州市政务政策或办事流程我可以为您效劳")));

        // 2. 未实名登录未带 token 请求
        MvcResult res2 = mockMvc.perform(post("/api/v1/gov/chat/stream")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prompt\":\"如何申请公租房？\"}"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(res2))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andExpect(content().string(containsString("auth_required")));
    }

    @Test
    @DisplayName("R1 & R4 审计：全局异常处理与 404/405 无堆栈、无白页 (No Whitelabel)")
    void testGlobalExceptionHandlerNoWhitelabel() throws Exception {
        // 1. 不存在的接口路由 -> 404 JSON (不是 Whitelabel HTML)
        mockMvc.perform(get("/api/v1/gov/non-existent-audit-test"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value(containsString("404 Not Found")));

        // 1.1 浏览器直接发起请求携带 Accept: text/html 时的 404 结构化 JSON 响应
        mockMvc.perform(get("/api/v1/gov/non-existent-audit-test").accept(MediaType.TEXT_HTML))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(404));

        // 2. 错误 HTTP Method -> 405 JSON
        mockMvc.perform(post("/api/v1/gov/policies"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(405))
                .andExpect(jsonPath("$.message").value(containsString("不支持的请求方法")));
    }

    @Test
    @DisplayName("R4 审计：客户端 JS 脚本编码无乱码、z-index 最高级与 DOMContentLoaded 保护")
    void testStaticJsScriptsIntegrity() throws Exception {
        // 嵌入脚本
        MvcResult embedRes = mockMvc.perform(get("/gz_assistant_embed.js"))
                .andExpect(status().isOk())
                .andReturn();
        String embedContent = embedRes.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertFalse(embedContent.contains("\uFFFD"), "gz_assistant_embed.js 不能存在乱码字符");
        assertTrue(embedContent.contains("z-index: 2147483647"), "gz-gov-shell 必须具有最高层级 2147483647");
        assertTrue(embedContent.contains("DOMContentLoaded"), "必须包含 DOMContentLoaded 安全防碰撞保护");
        assertTrue(embedContent.contains("广州市人民政府门户网站"), "中文公文注释必须保持纯正 UTF-8 编码");

        // 油猴脚本
        MvcResult userRes = mockMvc.perform(get("/gz_gov_ai_assistant.user.js"))
                .andExpect(status().isOk())
                .andReturn();
        String userContent = userRes.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertFalse(userContent.contains("\uFFFD"), "gz_gov_ai_assistant.user.js 不能存在乱码字符");
        assertTrue(userContent.contains("// ==UserScript=="), "必须具备标准 Tampermonkey 元数据头");
        assertTrue(userContent.contains("DOMContentLoaded"), "油猴脚本必须具备 DOM 加载防崩溃兜底");
    }
}
