package com.example.myai.service;

import com.example.myai.model.WorkOrder12345;
import com.example.myai.model.dto.WorkOrderSubmitDTO;
import com.example.myai.repository.WorkOrderRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;

    public WorkOrderService(WorkOrderRepository workOrderRepository) {
        this.workOrderRepository = workOrderRepository;
    }

    public List<WorkOrder12345> listAll() {
        return workOrderRepository.findAll();
    }

    public Optional<WorkOrder12345> getById(Long id) {
        return workOrderRepository.findById(id);
    }

    public WorkOrder12345 submit(WorkOrderSubmitDTO dto) {
        String dept = (dto.getAssignedDept() != null && !dto.getAssignedDept().trim().isEmpty())
                ? dto.getAssignedDept().trim()
                : getRecommendedDept(dto.getCategory());
        return workOrderRepository.create(
                dto.getUserName(),
                dto.getUserPhone(),
                dto.getCategory(),
                dto.getAppealContent(),
                dept
        );
    }

    public boolean reply(Long id, String replyContent) {
        return workOrderRepository.reply(id, replyContent);
    }

    private String getRecommendedDept(String category) {
        if (category == null) return "广州市12345政务服务便民热线中心";
        switch (category) {
            case "户籍管理": return "广州市公安局户政管理支队";
            case "住房保障": return "广州住房公积金管理中心";
            case "医疗保险": return "广州市医疗保障局";
            case "企业开办": return "广州市市场监督管理局";
            default: return "广州市政务服务和数据管理局";
        }
    }
}
