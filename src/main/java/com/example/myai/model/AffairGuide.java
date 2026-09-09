package com.example.myai.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * 政务服务事项办事指南实体（对接全国一体化平台六级十二项标准）
 */
public class AffairGuide implements Serializable {
    private Long id;
    private String affairCode;         // 实施编码 (例如: HZ-00102)
    private String affairName;         // 事项全称 (如 "引进人才落户登记")
    private String category;           // 业务类别 (户籍 / 公积金 / 医保 / 市监)
    private String serviceObject;      // 服务对象 (自然人 / 企业法人)
    private int legalLimitDays;        // 法定办结时限(天)
    private int promisedLimitDays;     // 承诺办结时限(天,体现极简极速)
    private String qualifications;     // 申请准入条件
    private String handlingAddress;    // 线下指定办理窗口
    private String onlineHandleUrl;    // 一网通办在线申报直达URL
    private List<MaterialItem> materials = new ArrayList<>();   // 申报材料清单
    private List<ProcessStep> processSteps = new ArrayList<>(); // 办理流程步骤

    public static class MaterialItem implements Serializable {
        private Long id;
        private String name;           // 材料名称
        private boolean mandatory;     // 是否必备 (true: 必备, false: 容缺后补)
        private String format;         // 介质形式 (电子证照免提交 / 原件复印件 / 在线填报)
        private String sampleTip;      // 材料规格或模板说明

        public MaterialItem() {}

        public MaterialItem(Long id, String name, boolean mandatory, String format, String sampleTip) {
            this.id = id;
            this.name = name;
            this.mandatory = mandatory;
            this.format = format;
            this.sampleTip = sampleTip;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public boolean isMandatory() { return mandatory; }
        public void setMandatory(boolean mandatory) { this.mandatory = mandatory; }
        public String getFormat() { return format; }
        public void setFormat(String format) { this.format = format; }
        public String getSampleTip() { return sampleTip; }
        public void setSampleTip(String sampleTip) { this.sampleTip = sampleTip; }
    }

    public static class ProcessStep implements Serializable {
        private int stepNo;
        private String stepName;
        private String description;
        private String timeCost;

        public ProcessStep() {}

        public ProcessStep(int stepNo, String stepName, String description, String timeCost) {
            this.stepNo = stepNo;
            this.stepName = stepName;
            this.description = description;
            this.timeCost = timeCost;
        }

        public int getStepNo() { return stepNo; }
        public void setStepNo(int stepNo) { this.stepNo = stepNo; }
        public String getStepName() { return stepName; }
        public void setStepName(String stepName) { this.stepName = stepName; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getTimeCost() { return timeCost; }
        public void setTimeCost(String timeCost) { this.timeCost = timeCost; }
    }

    public AffairGuide() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAffairCode() { return affairCode; }
    public void setAffairCode(String affairCode) { this.affairCode = affairCode; }
    public String getAffairName() { return affairName; }
    public void setAffairName(String affairName) { this.affairName = affairName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getServiceObject() { return serviceObject; }
    public void setServiceObject(String serviceObject) { this.serviceObject = serviceObject; }
    public int getLegalLimitDays() { return legalLimitDays; }
    public void setLegalLimitDays(int legalLimitDays) { this.legalLimitDays = legalLimitDays; }
    public int getPromisedLimitDays() { return promisedLimitDays; }
    public void setPromisedLimitDays(int promisedLimitDays) { this.promisedLimitDays = promisedLimitDays; }
    public String getQualifications() { return qualifications; }
    public void setQualifications(String qualifications) { this.qualifications = qualifications; }
    public String getHandlingAddress() { return handlingAddress; }
    public void setHandlingAddress(String handlingAddress) { this.handlingAddress = handlingAddress; }
    public String getOnlineHandleUrl() { return onlineHandleUrl; }
    public void setOnlineHandleUrl(String onlineHandleUrl) { this.onlineHandleUrl = onlineHandleUrl; }
    public List<MaterialItem> getMaterials() { return materials; }
    public void setMaterials(List<MaterialItem> materials) { this.materials = materials; }
    public List<ProcessStep> getProcessSteps() { return processSteps; }
    public void setProcessSteps(List<ProcessStep> processSteps) { this.processSteps = processSteps; }
}
