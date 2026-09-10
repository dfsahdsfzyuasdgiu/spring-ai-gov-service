package com.example.myai.model;

import java.io.Serializable;

/**
 * 政务知识图谱关联实体（实体-关系-实体 三元组）
 */
public class KnowledgeRelation implements Serializable {
    private Long id;
    private String sourceType;   // POLICY (政策公文) / AFFAIR (政务事项) / DEPT (责任部门) / TARGET (受众群体)
    private String sourceId;     // 源实体唯一标识/编码
    private String sourceName;   // 源实体名称
    private String relationType; // LEGAL_BASIS (法定依据) / JOINT_BUSINESS (业务联办) / GOVERNING_DEPT (主管责任) / APPLIES_TO (适用人群)
    private String targetType;   // 目标实体类型
    private String targetId;     // 目标实体唯一标识/编码
    private String targetName;   // 目标实体名称
    private String relationDesc; // 业务关联说明

    public KnowledgeRelation() {}

    public KnowledgeRelation(Long id, String sourceType, String sourceId, String sourceName, String relationType, String targetType, String targetId, String targetName, String relationDesc) {
        this.id = id;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.sourceName = sourceName;
        this.relationType = relationType;
        this.targetType = targetType;
        this.targetId = targetId;
        this.targetName = targetName;
        this.relationDesc = relationDesc;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSourceType() { return sourceType; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }

    public String getSourceId() { return sourceId; }
    public void setSourceId(String sourceId) { this.sourceId = sourceId; }

    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }

    public String getRelationType() { return relationType; }
    public void setRelationType(String relationType) { this.relationType = relationType; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }

    public String getRelationDesc() { return relationDesc; }
    public void setRelationDesc(String relationDesc) { this.relationDesc = relationDesc; }
}
