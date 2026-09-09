package com.example.myai.model.dto;

import java.io.Serializable;

public class FeedbackDTO implements Serializable {
    private String sessionId;
    private int rating;         // 1-点赞满意, -1-点踩未解决
    private String reason;      // 点踩反馈原因

    public FeedbackDTO() {}

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
