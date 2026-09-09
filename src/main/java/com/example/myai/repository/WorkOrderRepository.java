package com.example.myai.repository;

import com.example.myai.common.DataMaskUtils;
import com.example.myai.model.WorkOrder12345;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class WorkOrderRepository {

    private final Map<Long, WorkOrder12345> store = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1000);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public WorkOrderRepository() {
        initSampleWorkOrders();
    }

    private void initSampleWorkOrders() {
        WorkOrder12345 o1 = new WorkOrder12345();
        o1.setId(1001L);
        o1.setOrderNo("12345-20260908-0101");
        o1.setUserName(DataMaskUtils.maskName("陈建国"));
        o1.setUserPhone(DataMaskUtils.maskPhone("13912345678"));
        o1.setCategory("户籍管理");
        o1.setAppealContent("全日制自考专升本毕业，在海口有固定住所，线上申请落户时学信网认证未能通过，提示需线下复核，请问该去哪个窗口办理？");
        o1.setAssignedDept("海口市公安局户政处");
        o1.setStatus(2);
        o1.setCreateTime("2026-09-08 09:15:22");
        o1.setUpdateTime("2026-09-08 11:30:10");
        o1.setReplyContent("您好！自考专升本学历如学信网未及时同步电子备案，可携带毕业证书原件及省自考办证明，至龙华区政务服务中心公安专区12号窗口办理人工核实认证，审核无误后可现场签发《准迁证》。");
        store.put(o1.getId(), o1);

        WorkOrder12345 o2 = new WorkOrder12345();
        o2.setId(1002L);
        o2.setOrderNo("12345-20260908-0102");
        o2.setUserName(DataMaskUtils.maskName("李晓雯"));
        o2.setUserPhone(DataMaskUtils.maskPhone("18887654321"));
        o2.setCategory("住房保障");
        o2.setAppealContent("婚前购买的二手房，现在想提取婚后新缴存的公积金，网签合同号在公积金APP中提示未联网，该如何解决？");
        o2.setAssignedDept("海南省住房公积金管理局海口分局");
        o2.setStatus(1);
        o2.setCreateTime("2026-09-08 13:40:05");
        o2.setUpdateTime("2026-09-08 14:10:00");
        o2.setReplyContent("已转派技术部门核验住建存量房网签数据链，工作人员将在24小时内电话回访联系。");
        store.put(o2.getId(), o2);
    }

    public List<WorkOrder12345> findAll() {
        List<WorkOrder12345> list = new ArrayList<>(store.values());
        list.sort((a, b) -> b.getId().compareTo(a.getId())); // 最新工单在前
        return list;
    }

    public Optional<WorkOrder12345> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    public WorkOrder12345 create(String userName, String userPhone, String category, String appealContent, String assignedDept) {
        WorkOrder12345 o = new WorkOrder12345();
        long id = idGen.incrementAndGet();
        o.setId(id);
        o.setOrderNo("12345-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + id);
        o.setUserName(DataMaskUtils.maskName(userName));
        o.setUserPhone(DataMaskUtils.maskPhone(userPhone));
        o.setCategory(category != null && !category.isEmpty() ? category : "综合咨询");
        o.setAppealContent(appealContent);
        o.setAssignedDept(assignedDept != null && !assignedDept.isEmpty() ? assignedDept : "海口市12345政务服务便民热线中心");
        o.setStatus(0); // 待受理
        o.setCreateTime(LocalDateTime.now().format(FMT));
        store.put(id, o);
        return o;
    }

    public boolean reply(Long id, String replyContent) {
        WorkOrder12345 o = store.get(id);
        if (o != null) {
            o.setReplyContent(replyContent);
            o.setStatus(2); // 办结
            o.setUpdateTime(LocalDateTime.now().format(FMT));
            return true;
        }
        return false;
    }
}
