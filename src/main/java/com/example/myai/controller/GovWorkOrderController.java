package com.example.myai.controller;

import com.example.myai.common.Result;
import com.example.myai.model.WorkOrder12345;
import com.example.myai.model.dto.WorkOrderSubmitDTO;
import com.example.myai.service.WorkOrderService;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/gov/work-order")
@CrossOrigin(origins = "*")
public class GovWorkOrderController {

    private final WorkOrderService workOrderService;
    private final ChatClient chatClient;

    public GovWorkOrderController(WorkOrderService workOrderService, ChatClient.Builder builder) {
        this.workOrderService = workOrderService;
        this.chatClient = builder.build();
    }

    /**
     * 12345 诉求 AI 智能归口研判与摘要提炼
     */
    @PostMapping("/ai-triage")
    public Result<Map<String, Object>> aiTriage(@RequestBody Map<String, String> body) {
        String content = body.get("appealContent");
        if (content == null || content.trim().isEmpty()) {
            return Result.error("诉求事实不能为空");
        }

        Map<String, Object> res = new HashMap<>();
        String suggestedCategory = "12345民情";
        String suggestedDept = "海口市综合行政审批服务局";
        String urgentLevel = "常规诉求 (3个工作日限时办结)";
        String summary = content.length() > 25 ? content.substring(0, 25) + "..." : content;

        // 基础政务业务领域智能识别
        if (content.contains("落户") || content.contains("户口") || content.contains("身份证") || content.contains("投靠")) {
            suggestedCategory = "户籍管理";
            suggestedDept = "海口市公安局户政处";
        } else if (content.contains("医保") || content.contains("就医") || content.contains("生育津贴") || content.contains("住院")) {
            suggestedCategory = "社保医保";
            suggestedDept = "海口市医疗保障局";
        } else if (content.contains("公积金") || content.contains("房租") || content.contains("租房") || content.contains("电梯") || content.contains("加装")) {
            suggestedCategory = "住房保障";
            suggestedDept = "海南省住房公积金管理局海口分局 / 属地住建局";
        } else if (content.contains("驾照") || content.contains("驾驶证") || content.contains("换证") || content.contains("车辆")) {
            suggestedCategory = "车辆驾驶";
            suggestedDept = "海口市公安局交通警察支队车管所";
        } else if (content.contains("护照") || content.contains("港澳") || content.contains("通行证") || content.contains("签注")) {
            suggestedCategory = "出入境服务";
            suggestedDept = "海口市公安局出入境管理支队";
        } else if (content.contains("公司") || content.contains("营业执照") || content.contains("个体户") || content.contains("开办")) {
            suggestedCategory = "企业开办";
            suggestedDept = "海口市市场监督管理局";
        }

        // 调用大模型提取规范公文标题与责任归口
        try {
            String aiPrompt = "你是一名12345便民热线派单专家。请研判群众诉求：“" + content + "”。\n" +
                    "请给出精炼规范的政务工单摘要标题（16字以内，如：关于反映老旧小区施工扰民协调诉求），以及建议处置部门。按以下格式输出：\n" +
                    "标题：xxx\n" +
                    "部门：xxx";
            String aiResp = chatClient.prompt()
                    .user(aiPrompt)
                    .call()
                    .content();
            if (aiResp != null && !aiResp.isEmpty()) {
                for (String line : aiResp.split("\n")) {
                    if (line.contains("标题：") || line.contains("标题:")) {
                        summary = line.replaceAll(".*标题[：:]", "").trim();
                    }
                    if (line.contains("部门：") || line.contains("部门:")) {
                        suggestedDept = line.replaceAll(".*部门[：:]", "").trim();
                    }
                }
            }
        } catch (Exception ignored) {}

        res.put("suggestedCategory", suggestedCategory);
        res.put("suggestedDept", suggestedDept);
        res.put("urgentLevel", urgentLevel);
        res.put("summary", summary);
        return Result.success("AI智能研判归口成功", res);
    }

    /**
     * 群众在线提报 12345 模拟工单
     */
    @PostMapping("/submit")
    public Result<WorkOrder12345> submitOrder(@RequestBody WorkOrderSubmitDTO dto) {
        if (dto.getAppealContent() == null || dto.getAppealContent().trim().isEmpty()) {
            return Result.error("诉求内容不能为空");
        }
        WorkOrder12345 created = workOrderService.submit(dto);
        return Result.success("12345诉求登记成功，承办部门将加急核实！", created);
    }

    /**
     * 管理端获取工单列表
     */
    @GetMapping("/list")
    public Result<List<WorkOrder12345>> listOrders() {
        return Result.success(workOrderService.listAll());
    }

    /**
     * 管理端官方答复工单
     */
    @PostMapping("/{id}/reply")
    public Result<String> replyOrder(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String content = body.get("replyContent");
        if (content == null || content.trim().isEmpty()) {
            return Result.error("答复内容不能为空");
        }
        boolean ok = workOrderService.reply(id, content);
        if (ok) {
            return Result.success("工单已答复并办结！", "OK");
        }
        return Result.error(404, "工单不存在");
    }
}
