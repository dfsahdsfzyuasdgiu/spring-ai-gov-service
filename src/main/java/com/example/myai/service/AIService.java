package com.example.myai.service;

import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import com.alibaba.cloud.ai.dashscope.image.DashScopeImageOptions;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.image.ImageModel;
import org.springframework.ai.image.ImagePrompt;
import org.springframework.ai.image.ImageResponse;
import org.springframework.stereotype.Service;

@Service
public class AIService {

    // Spring AI 官方推荐的通用对话客户端
    private final ChatClient chatClient;
    // Spring AI 通义万象图像生成客户端
    private final ImageModel imageModel;

    // 构造器注入：Spring Boot 会自动注入 ChatClient.Builder 和 ImageModel
    public AIService(ChatClient.Builder builder, ImageModel imageModel) {
        this.chatClient = builder.build();
        this.imageModel = imageModel;
    }

    /**
     * 通用对话方法
     * @param question 用户输入的问题
     * @param modelName 动态指定的模型名（如 qwen-plus, qwen-turbo, qwen-max）
     */
    public String ask(String question, String modelName) {
        return chatClient.prompt()
                .user(question) // 设置用户的提问
                // 核心知识点：通过 DashScopeChatOptions 动态指定本次调用的模型
                .options(DashScopeChatOptions.builder()
                        .withModel(modelName)
                        .build())
                .call()       // 发起远程调用
                .content();   // 提取大模型返回的文本内容
    }

    /**
     * 练习 5：通义万象文生图
     * @param prompt 图像描述词
     * @return 生成的图片在线访问 URL
     */
    public String generateImage(String prompt) {
        return generateImage(prompt, "wanx-v1");
    }

    /**
     * 练习 5：通义万象文生图（支持动态指定模型）
     * @param prompt 图像描述词
     * @param modelName 模型名称（例如 wanx2.1-t2i-plus 或 wanx-v1）
     * @return 生成的图片在线访问 URL
     */
    public String generateImage(String prompt, String modelName) {
        ImagePrompt imagePrompt = new ImagePrompt(prompt,
                DashScopeImageOptions.builder()
                        .withModel(modelName)
                        .build());
        ImageResponse response = imageModel.call(imagePrompt);
        if (response != null && response.getResult() != null && response.getResult().getOutput() != null) {
            return response.getResult().getOutput().getUrl();
        }
        return "未能成功生成图片链接";
    }

    /**
     * 文本自动换行辅助方法（以空格为界限按单词换行，默认在指定字符宽度处折行，防止控制台单行过长）
     * @param text 待折行的长文本
     * @param maxLineLength 每行最大字符数（如 70）
     * @return 自动插入换行符后的文本
     */
    public static String wrapText(String text, int maxLineLength) {
        if (text == null || text.length() <= maxLineLength) {
            return text;
        }
        String[] paragraphs = text.split("\r?\n");
        StringBuilder result = new StringBuilder();
        for (int p = 0; p < paragraphs.length; p++) {
            String paragraph = paragraphs[p];
            if (paragraph.length() <= maxLineLength) {
                result.append(paragraph);
            } else {
                String[] words = paragraph.split(" ");
                StringBuilder currentLine = new StringBuilder();
                for (String word : words) {
                    if (currentLine.length() + word.length() + 1 > maxLineLength && currentLine.length() > 0) {
                        result.append(currentLine).append("\n");
                        currentLine.setLength(0);
                    }
                    if (currentLine.length() > 0) {
                        currentLine.append(" ");
                    }
                    currentLine.append(word);
                }
                if (currentLine.length() > 0) {
                    result.append(currentLine);
                }
            }
            if (p < paragraphs.length - 1) {
                result.append("\n");
            }
        }
        return result.toString();
    }
}