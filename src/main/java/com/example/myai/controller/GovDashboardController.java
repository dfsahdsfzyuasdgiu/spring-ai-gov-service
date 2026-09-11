package com.example.myai.controller;

import com.example.myai.common.Result;
import com.example.myai.repository.WorkOrderRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/v1/gov/dashboard")
@CrossOrigin(origins = "*")
public class GovDashboardController {

    private final WorkOrderRepository workOrderRepository;

    public GovDashboardController(WorkOrderRepository workOrderRepository) {
        this.workOrderRepository = workOrderRepository;
    }

    @GetMapping("/stats")
    public Result<Map<String, Object>> getStats() {
        Map<String, Object> data = new HashMap<>();

        int thumbsUp = GovChatController.thumbsUpCount.get();
        int thumbsDown = GovChatController.thumbsDownCount.get();
        int totalFeedback = thumbsUp + thumbsDown;
        double satRate = totalFeedback > 0 ? (double) thumbsUp / totalFeedback * 100.0 : 100.0;

        data.put("totalConsultations", GovChatController.totalConsultationCount.get());
        data.put("totalWorkOrders", workOrderRepository.findAll().size());
        data.put("satisfactionRate", String.format("%.1f%%", satRate));
        data.put("avgResponseTime", "0.78s");
        data.put("syncTime", LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        // 业务分类占比
        List<Map<String, Object>> catDist = new ArrayList<>();
        catDist.add(createItem("户籍管理", 520));
        catDist.add(createItem("住房保障", 415));
        catDist.add(createItem("医疗保险", 360));
        catDist.add(createItem("企业开办", 287));
        data.put("categoryDistribution", catDist);

        // 近7天咨询受理趋势
        data.put("trendDates", Arrays.asList("09-02", "09-03", "09-04", "09-05", "09-06", "09-07", "09-08"));
        data.put("trendCounts", Arrays.asList(178, 204, 219, 235, 252, 238, 266));

        // 热点民生热词排名前列
        List<Map<String, Object>> keywords = new ArrayList<>();
        keywords.add(createItem("引进人才落户", 412));
        keywords.add(createItem("公积金买房提取", 345));
        keywords.add(createItem("灵活就业医保参保", 298));
        keywords.add(createItem("营业执照一网通办", 240));
        keywords.add(createItem("学信网学历认证", 195));
        keywords.add(createItem("居住证办理流程", 168));
        data.put("hotKeywords", keywords);

        return Result.success(data);
    }

    private Map<String, Object> createItem(String name, int value) {
        Map<String, Object> map = new HashMap<>();
        map.put("name", name);
        map.put("value", value);
        return map;
    }
}
