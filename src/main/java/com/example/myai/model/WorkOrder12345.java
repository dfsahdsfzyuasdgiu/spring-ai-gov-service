package com.example.myai.model;

import java.io.Serializable;

/**
 * 12345 民生协同工单实体（接诉即办闭环）
 */
public class WorkOrder12345 implements Serializable {
    private Long id;
    private String orderNo;         // 12345 统一流水号 (如: 12345-20260908-001)
    private String userName;        // 群众姓名 (已脱敏)
    private String userPhone;       // 联系电话 (已脱敏)
    private String category;        // 诉求类别 (户籍/社保/医保/交通/综合等)
    private String appealContent;   // 群众反映的具体诉求或疑难问题
    private String assignedDept;    // 拟派驻承办单位 (如: 海口市人力资源和社会保障局)
    private int status;             // 状态: 0-待受理, 1-已分派处理中, 2-已答复办结
    private String replyContent;    // 官方承办答复内容
    private String createTime;      // 提交时间
    private String updateTime;      // 处理时间

    public WorkOrder12345() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getUserPhone() { return userPhone; }
    public void setUserPhone(String userPhone) { this.userPhone = userPhone; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getAppealContent() { return appealContent; }
    public void setAppealContent(String appealContent) { this.appealContent = appealContent; }
    public String getAssignedDept() { return assignedDept; }
    public void setAssignedDept(String assignedDept) { this.assignedDept = assignedDept; }
    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }
    public String getReplyContent() { return replyContent; }
    public void setReplyContent(String replyContent) { this.replyContent = replyContent; }
    public String getCreateTime() { return createTime; }
    public void setCreateTime(String createTime) { this.createTime = createTime; }
    public String getUpdateTime() { return updateTime; }
    public void setUpdateTime(String updateTime) { this.updateTime = updateTime; }
}
