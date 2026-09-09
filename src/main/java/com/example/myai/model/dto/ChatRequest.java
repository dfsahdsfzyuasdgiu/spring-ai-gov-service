package com.example.myai.model.dto;

import java.io.Serializable;

public class ChatRequest implements Serializable {
    private String sessionId;       // 会话标识 UUID
    private String prompt;          // 群众提问文本
    private String category;        // 可选限定分类 (户籍/社保/医保/市监)
    private String token;           // 用户鉴权令牌 (未登录为空)

    public ChatRequest() {}

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
