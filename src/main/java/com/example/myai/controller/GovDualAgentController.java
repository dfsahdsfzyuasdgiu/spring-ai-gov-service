package com.example.myai.controller;

import com.example.myai.common.Result;
import com.example.myai.service.DualAgentProxyService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 政务双 Agent 联邦路由状态与探针监控控制器
 */
@RestController
@RequestMapping("/api/v1/gov/dual-agent")
@CrossOrigin(origins = "*")
public class GovDualAgentController {

    private final DualAgentProxyService dualAgentProxyService;

    public GovDualAgentController(DualAgentProxyService dualAgentProxyService) {
        this.dualAgentProxyService = dualAgentProxyService;
    }

    /**
     * 探针状态检测：返回当前与远端双 Agent 系统的联通状态与健康指标
     */
    @GetMapping("/status")
    public Result<Map<String, Object>> getStatus() {
        return Result.success(dualAgentProxyService.checkStatus());
    }
}
