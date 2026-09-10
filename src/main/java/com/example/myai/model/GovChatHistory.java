package com.example.myai.model;

import java.io.Serializable;
import java.util.Date;

/**
 * 群众与政务 AI 助手对话历史持久化实体
 */
public class GovChatHistory implements Serializable {
    private Long id;
    private String sessionId;
    private String userId;
    private String userPrompt;
    private String aiReply;
    private String docTitle;
    private String docNumber;
    private Date createTime;

    public GovChatHistory() {}

    public GovChatHistory(String sessionId, String userId, String userPrompt, String aiReply, String docTitle, String docNumber) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.userPrompt = userPrompt;
        this.aiReply = aiReply;
        this.docTitle = docTitle;
        this.docNumber = docNumber;
        this.createTime = new Date();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUserPrompt() { return userPrompt; }
    public void setUserPrompt(String userPrompt) { this.userPrompt = userPrompt; }

    public String getAiReply() { return aiReply; }
    public void setAiReply(String aiReply) { this.aiReply = aiReply; }

    public String getDocTitle() { return docTitle; }
    public void setDocTitle(String docTitle) { this.docTitle = docTitle; }

    public String getDocNumber() { return docNumber; }
    public void setDocNumber(String docNumber) { this.docNumber = docNumber; }

    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
}
