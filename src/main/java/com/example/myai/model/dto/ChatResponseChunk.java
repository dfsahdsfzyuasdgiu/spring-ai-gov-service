package com.example.myai.model.dto;

import com.example.myai.model.AffairGuide;
import java.io.Serializable;

/**
 * SSE 流式报文响应载荷
 */
public class ChatResponseChunk implements Serializable {
    private String type;            // "chunk", "citation", "guide_card", "order_card", "done"
    private String content;         // 增量文本
    private Object data;            // 携带的结构化卡片数据 (出处信息或导办事项)

    public ChatResponseChunk() {}

    public static ChatResponseChunk chunk(String content) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("chunk");
        c.setContent(content);
        return c;
    }

    public static ChatResponseChunk citation(Object citationData) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("citation");
        c.setData(citationData);
        return c;
    }

    public static ChatResponseChunk guideCard(AffairGuide guide) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("guide_card");
        c.setData(guide);
        return c;
    }

    public static ChatResponseChunk orderCard(String defaultCategory) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("order_card");
        c.setContent(defaultCategory);
        return c;
    }

    public static ChatResponseChunk clarifyCard(Object clarifyData) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("clarify_card");
        c.setData(clarifyData);
        return c;
    }

    public static ChatResponseChunk recommendCard(Object recommendData) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("recommend_card");
        c.setData(recommendData);
        return c;
    }

    public static ChatResponseChunk graphCard(Object graphData) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("graph_card");
        c.setData(graphData);
        return c;
    }

    public static ChatResponseChunk guidedStepsCard(Object stepsData) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("guided_steps_card");
        c.setData(stepsData);
        return c;
    }

    public static ChatResponseChunk custom(String type, String content) {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType(type);
        c.setContent(content);
        return c;
    }

    public static ChatResponseChunk done() {
        ChatResponseChunk c = new ChatResponseChunk();
        c.setType("done");
        c.setContent("[DONE]");
        return c;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }
}
