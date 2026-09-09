package com.example.myai;

import com.example.myai.service.AIService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class SpringAiAlibabaApplicationTests {

    @Autowired
    private AIService aiService;

    @Autowired(required = false)
    private org.springframework.ai.image.ImageModel imageModel;

    /**
     * 练习 1：Qwen-Plus 文本摘要测试（传入500字技术文章，三句话总结核心要点）
     */
    @Test
    void test1_QwenPlusSummary() {
        System.out.println("\n================================================================================");
        System.out.println("【练习 1】Qwen-Plus 模型测试 - 文本摘要（传入500字技术文章，三句话总结核心要点）");
        System.out.println("================================================================================");
        String article = "近年来，随着以大型语言模型（LLM）为代表的生成式人工智能技术爆发式发展，软件开发范式正在经历一场深刻的智能化变革。"
                + "在企业级 Java 应用开发领域，Spring 框架作为事实上的行业标准，如何将强大的大模型能力无缝引入现有的微服务架构，成为了广大开发者面临的核心课题。"
                + "为此，Spring 官方重磅推出了 Spring AI 项目，旨在为人工智能工程提供统一、现代化的应用开发基础设施。"
                + "传统的 AI 应用接入通常面临诸多挑战，例如不同模型供应商（如阿里云通义千问、OpenAI、Anthropic 等）的 API 规范、鉴权机制以及响应结构各不相同，导致系统迁移和多模型适配成本高昂。"
                + "Spring AI 借鉴了 Spring 家族一贯的抽象哲学，通过提供一致的 Client 接口封装，屏蔽了底层各厂商接口的异构性，使开发者能够用统一的编程范式调用不同的基础大模型。"
                + "此外，框架还原生集成了提示词工程管理（Prompt Management）、检索增强生成（RAG）管道、向量数据库客户端（Vector Store）以及结构化输出解析等企业级核心能力，并深度结合 Spring Boot 的自动装配体系，极大降低了在微服务体系中落地大语言模型应用的门槛与运维复杂度。";

        String prompt = "请阅读以下约500字的技术文章，并严格用3句话总结其核心要点：\n\n" + article;

        System.out.println("【输入文章字数】: " + article.length() + " 字");
        System.out.println("【输入技术文章内容】:\n" + article + "\n");
        String result = aiService.ask(prompt, "qwen-plus");
        System.out.println("【Qwen-Plus 实际返回结果（三句话摘要）】:\n" + result);
        System.out.println("================================================================================\n");
    }

    /**
     * 练习 2：Qwen-Plus 多语言专业技术翻译测试
     */
    @Test
    void test2_QwenPlusTranslation() {
        System.out.println("\n================================================================================");
        System.out.println("【练习 2】Qwen-Plus 模型测试 - 多语言翻译（保持专业术语准确性）");
        System.out.println("================================================================================");
        String question = "请将以下中文技术文档翻译成专业英文，注意保持专业术语准确：在分布式高并发系统中，"
                + "微服务架构通常采用熔断限流机制与分布式事务解决方案，以确保系统的最终一致性与服务的高可用。";
        System.out.println("【输入问题】:\n" + question + "\n");
        String result = aiService.ask(question, "qwen-plus");
        System.out.println("【Qwen-Plus 实际返回结果（已自动折行）】:\n" + AIService.wrapText(result, 70));
        System.out.println("================================================================================\n");
    }

    /**
     * 练习 3：Qwen-Turbo 极速代码语法纠错测试
     */
    @Test
    void test3_QwenTurboCodeFix() {
        System.out.println("\n================================================================================");
        System.out.println("【练习 3】Qwen-Turbo 模型测试 - 极速代码语法纠错");
        System.out.println("================================================================================");
        String question = "请快速找出以下Java代码的语法错误并给出修复后的代码：\n"
                + "public class Test {\n"
                + "    public static void main(String[] args) {\n"
                + "        int count = 10\n"
                + "        System.out.println(count)\n"
                + "    }\n"
                + "}";
        System.out.println("【输入代码与问题】:\n" + question + "\n");
        String result = aiService.ask(question, "qwen-turbo");
        System.out.println("【Qwen-Turbo 实际返回结果】:\n" + result);
        System.out.println("================================================================================\n");
    }

    /**
     * 练习 4：Qwen-Max 复杂逻辑推理与秒杀系统架构设计
     */
    @Test
    void test4_QwenMaxArchitecture() {
        System.out.println("\n================================================================================");
        System.out.println("【练习 4】Qwen-Max 模型测试 - 复杂逻辑推理与系统架构设计");
        System.out.println("================================================================================");
        String question = "请为我设计一个支持百万级并发的电商秒杀系统，要求给出分层系统架构的文字描述，并说明各个环节的核心技术选型与理由。";
        System.out.println("【输入问题】:\n" + question + "\n");
        String result = aiService.ask(question, "qwen-max");
        System.out.println("【Qwen-Max 实际返回结果】:\n" + result);
        System.out.println("================================================================================\n");
    }

    /**
     * 练习 5：通义万象 AI 文生图测试
     */
    @Test
    void test5_WanxImageGeneration() {
        System.out.println("\n================================================================================");
        System.out.println("【练习 5】通义万象模型测试 - AI 文生图");
        System.out.println("================================================================================");
        String prompt = "一只可爱的金毛幼犬在草地上奔跑，阳光明媚，写实风格，高清摄影";
        System.out.println("【输入提示词】: " + prompt + "\n");
        System.out.println("正在请求通义万象模型生成图片，请稍候...");
        String imageUrl = aiService.generateImage(prompt);
        System.out.println("【生成的图片链接（可直接在浏览器中打开预览）】:\n" + imageUrl);
        System.out.println("================================================================================\n");
    }

    /**
     * 一键运行：连续执行全部 5 个测试并在控制台按序打印输出
     */
    @Test
    void testRunAll() {
        test1_QwenPlusSummary();
        test2_QwenPlusTranslation();
        test3_QwenTurboCodeFix();
        test4_QwenMaxArchitecture();
        test5_WanxImageGeneration();
    }
}
