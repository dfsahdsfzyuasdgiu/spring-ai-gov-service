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
        if (category == null) return "海口市12345政务热线服务中心";
        switch (category) {
            case "户籍管理": return "海口市公安局户政处";
            case "住房保障": return "海南省住房公积金管理局海口分局";
            case "医疗保险": return "海口市医疗保障局";
            case "企业开办": return "海口市市场监督管理局";
            default: return "海口市综合行政审批服务局";
        }
    }
}
