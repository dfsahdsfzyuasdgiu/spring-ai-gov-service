package com.example.myai;

import com.example.myai.service.AIService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;

@SpringBootApplication
public class SpringAiAlibabaApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpringAiAlibabaApplication.class, args);
    }

    /**
     * 内置控制台自测 Runner：
     * 项目启动成功后，会自动触发此方法，依次调用 5 个测试并在 IDEA 控制台直接输出大模型结果！
     */
    @Bean
    @Profile("exercise")
    public CommandLineRunner runner(AIService aiService) {
        return args -> {
            System.out.println("\n################################################################################");
            System.out.println("                     🚀 [阿里AI五大模型练习内置自测试验开始]                     ");
            System.out.println("################################################################################\n");

            // 1. Qwen-Plus 文本摘要
            System.out.println("================================================================================");
            System.out.println("【练习 1】Qwen-Plus 模型 - 文本摘要（传入500字技术文章，三句话总结要点）");
            System.out.println("================================================================================");
            String article = "近年来，随着以大型语言模型（LLM）为代表的生成式人工智能技术爆发式发展，软件开发范式正在经历一场深刻的智能化变革。"
                    + "在企业级 Java 应用开发领域，Spring 框架作为事实上的行业标准，如何将强大的大模型能力无缝引入现有的微服务架构，成为了广大开发者面临的核心课题。"
                    + "为此，Spring 官方重磅推出了 Spring AI 项目，旨在为人工智能工程提供统一、现代化的应用开发基础设施。"
                    + "传统的 AI 应用接入通常面临诸多挑战，例如不同模型供应商（如阿里云通义千问、OpenAI、Anthropic 等）的 API 规范、鉴权机制以及响应结构各不相同，导致系统迁移和多模型适配成本高昂。"
                    + "Spring AI 借鉴了 Spring 家族一贯的抽象哲学，通过提供一致的 Client 接口封装，屏蔽了底层各厂商接口的异构性，使开发者能够用统一的编程范式调用不同的基础大模型。"
                    + "此外，框架还原生集成了提示词工程管理（Prompt Management）、检索增强生成（RAG）管道、向量数据库客户端（Vector Store）以及结构化输出解析等企业级核心能力，"
                    + "并深度结合 Spring Boot 的自动装配体系，极大降低了在微服务体系中落地大语言模型应用的门槛与运维复杂度。";
            String prompt = "请阅读以下约500字的技术文章，并严格用3句话总结其核心要点：\n\n" + article;
            String summary = aiService.ask(prompt, "qwen-plus");
            System.out.println(summary);
            System.out.println();

            // 2. Qwen-Plus 专业翻译
            System.out.println("================================================================================");
            System.out.println("【练习 2】Qwen-Plus 模型 - 多语言翻译（保持专业术语准确性）");
            System.out.println("================================================================================");
            String translation = aiService.ask("请将以下中文技术文档翻译成专业英文，注意保持专业术语准确：在分布式高并发系统中，"
                    + "微服务架构通常采用熔断限流机制与分布式事务解决方案，以确保系统的最终一致性与服务的高可用。", "qwen-plus");
            System.out.println(AIService.wrapText(translation, 70));
            System.out.println();

            // 3. Qwen-Turbo 语法纠错
            System.out.println("================================================================================");
            System.out.println("【练习 3】Qwen-Turbo 模型 - 极速代码语法纠错");
            System.out.println("================================================================================");
            String codeFix = aiService.ask("请快速找出以下Java代码的语法错误并给出修复后的代码：int count = 10 System.out.println(count)", "qwen-turbo");
            System.out.println(codeFix);
            System.out.println();

            // 4. Qwen-Max 复杂架构设计与推理
            System.out.println("================================================================================");
            System.out.println("【练习 4】Qwen-Max 模型 - 复杂逻辑推理与系统架构设计");
            System.out.println("================================================================================");
            String architecture = aiService.ask("请为我设计一个支持百万级并发的电商秒杀系统，要求给出分层系统架构的文字描述，并说明各个环节的核心技术选型与理由。", "qwen-max");
            System.out.println(architecture);
            System.out.println();

            // 5. 通义万象 文生图
            System.out.println("================================================================================");
            System.out.println("【练习 5】通义万象模型 - AI 文生图（输入提示词生成图片）");
            System.out.println("================================================================================");
            String imagePrompt = "一只可爱的金毛幼犬在草地上奔跑，阳光明媚，写实风格，高清摄影";
            System.out.println("【提示词 Prompt】: " + imagePrompt);
            System.out.println("正在调用通义万象大模型生成图片中，请稍候...");
            try {
                String imageUrl = aiService.generateImage(imagePrompt);
                System.out.println("【通义万象图片生成成功】！");
                System.out.println("【图片在线访问 URL（可直接在浏览器中打开）】:\n" + imageUrl);
            } catch (Exception e) {
                System.err.println("图片生成异常: " + e.getMessage());
            }

            System.out.println("\n################################################################################");
            System.out.println("                     ✅ [阿里AI模型内置自测试验全部完成]                       ");
            System.out.println("################################################################################\n");
        };
    }

}
