package com.example.myai.model.dto;

import java.io.Serializable;

public class WorkOrderSubmitDTO implements Serializable {
    private String userName;
    private String userPhone;
    private String category;
    private String appealContent;
    private String assignedDept;
    private String summary;

    public WorkOrderSubmitDTO() {}

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
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
}
