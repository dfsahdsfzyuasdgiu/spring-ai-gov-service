package com.example.myai.controller;

import com.example.myai.common.Result;
import com.example.myai.model.AffairGuide;
import com.example.myai.model.PolicyDoc;
import com.example.myai.repository.PolicyRepository;
import com.example.myai.service.AffairService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/gov")
@CrossOrigin(origins = "*")
public class GovAffairController {

    private final PolicyRepository policyRepository;
    private final AffairService affairService;

    public GovAffairController(PolicyRepository policyRepository, AffairService affairService) {
        this.policyRepository = policyRepository;
        this.affairService = affairService;
    }

    /**
     * 获取法定政策公文列表
     */
    @GetMapping("/policies")
    public Result<List<PolicyDoc>> listPolicies(@RequestParam(required = false) String category) {
        return Result.success(policyRepository.findByCategory(category));
    }

    /**
     * 获取指定政策详情
     */
    @GetMapping("/policies/{id}")
    public Result<PolicyDoc> getPolicy(@PathVariable Long id) {
        if (id == null || id <= 0) {
            return Result.error(400, "政策ID无效");
        }
        return policyRepository.findById(id)
                .map(Result::success)
                .orElseGet(() -> Result.error(404, "政策不存在"));
    }

    /**
     * 获取政务服务标准办事指南列表
     */
    @GetMapping("/affairs")
    public Result<List<AffairGuide>> listAffairs(@RequestParam(required = false) String category) {
        return Result.success(affairService.listByCategory(category));
    }

    /**
     * 获取指定事项办事指南详情（含材料与流程）
     */
    @GetMapping("/affairs/{id}")
    public Result<AffairGuide> getAffair(@PathVariable Long id) {
        if (id == null || id <= 0) {
            return Result.error(400, "政务事项ID无效");
        }
        return affairService.getById(id)
                .map(Result::success)
                .orElseGet(() -> Result.error(404, "政务事项不存在"));
    }

    /**
     * 模糊检索政策条款与法规出处结构化数据 (支持 keyword 模糊检索)
     */
    @GetMapping({"/policy/search", "/policies/search"})
    public Result<List<Map<String, Object>>> searchPolicyClauses(@RequestParam(required = false, defaultValue = "") String keyword) {
        return Result.success(policyRepository.searchClauses(keyword));
    }
}
