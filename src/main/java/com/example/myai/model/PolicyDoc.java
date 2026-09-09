package com.example.myai.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * 政务政策法规红头公文实体
 */
public class PolicyDoc implements Serializable {
    private Long id;
    private String docNumber;      // 官方发文字号 (例如: 琼府办〔2024〕15号)
    private String title;          // 公文标题全称
    private String category;       // 归属业务分类 (户籍管理 / 住房保障 / 医疗保险 / 企业开办 等)
    private String issuerDept;     // 发文机关 / 委办局
    private String publishDate;    // 印发日期
    private String effectiveDate;  // 施行日期
    private int status;            // 效力状态: 1-现行有效, 2-已废止, 3-部分条款失效
    private String summary;        // 政策简明核心要点
    private List<PolicyClause> clauses = new ArrayList<>(); // 结构化分条款正文

    public static class PolicyClause implements Serializable {
        private String clauseNo;   // 条款标号 (如 "第一条", "第二条第(三)款")
        private String clauseText; // 条款原文详细内容

        public PolicyClause() {}

        public PolicyClause(String clauseNo, String clauseText) {
            this.clauseNo = clauseNo;
            this.clauseText = clauseText;
        }

        public String getClauseNo() {
            return clauseNo;
        }

        public void setClauseNo(String clauseNo) {
            this.clauseNo = clauseNo;
        }

        public String getClauseText() {
            return clauseText;
        }

        public void setClauseText(String clauseText) {
            this.clauseText = clauseText;
        }
    }

    public PolicyDoc() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDocNumber() {
        return docNumber;
    }

    public void setDocNumber(String docNumber) {
        this.docNumber = docNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getIssuerDept() {
        return issuerDept;
    }

    public void setIssuerDept(String issuerDept) {
        this.issuerDept = issuerDept;
    }

    public String getPublishDate() {
        return publishDate;
    }

    public void setPublishDate(String publishDate) {
        this.publishDate = publishDate;
    }

    public String getEffectiveDate() {
        return effectiveDate;
    }

    public void setEffectiveDate(String effectiveDate) {
        this.effectiveDate = effectiveDate;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<PolicyClause> getClauses() {
        return clauses;
    }

    public void setClauses(List<PolicyClause> clauses) {
        this.clauses = clauses;
    }
}
