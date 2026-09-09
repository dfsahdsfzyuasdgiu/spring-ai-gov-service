package com.example.myai.controller;

import com.example.myai.service.AIService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
public class ChatController {

    private final AIService aiService;

    // 构造器注入刚才写的 AIService
    public ChatController(AIService aiService) {
        this.aiService = aiService;
    }

    /**
     * 对外暴露的 HTTP GET 接口：
     * 访问地址示例：/ai/chat?input=你好&model=qwen-turbo
     *
     * @param input 用户输入的问题
     * @param model 调用的模型，如果不传，默认使用 qwen-plus
     */
    @GetMapping("/chat")
    public String chat(@RequestParam String input,
                       @RequestParam(defaultValue = "qwen-plus") String model) {
        return aiService.ask(input, model);
    }

    /**
     * 练习 5：通义万象文生图接口
     * 访问地址示例：/ai/image?prompt=一只可爱的猫咪
     */
    @GetMapping("/image")
    public String generateImage(@RequestParam String prompt,
                                @RequestParam(defaultValue = "wanx-v1") String model) {
        return aiService.generateImage(prompt, model);
    }
}