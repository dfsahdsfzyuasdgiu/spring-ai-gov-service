# 智能政务咨询与导办系统 (AI Government Service System)

<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg" alt="Spring Boot 3.3.4">
  <img src="https://img.shields.io/badge/Spring%20AI%20Alibaba-1.0.0--M2.1-orange.svg" alt="Spring AI Alibaba">
  <img src="https://img.shields.io/badge/Java-17-blue.svg" alt="Java 17">
  <img src="https://img.shields.io/badge/Vue.js-3.x-4fc08d.svg" alt="Vue 3">
  <img src="https://img.shields.io/badge/ECharts-5.x-red.svg" alt="ECharts 5">
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License">
</p>

---

## 🏛️ 项目简介

本项目是一款**基于 Spring Boot 3 + Spring AI Alibaba + Vue 3 的新一代智能政务咨询与导办系统**。

严格遵循国务院《关于进一步优化政务服务提升行政效能推动“高效办成一件事”的指导意见》（国发〔2024〕3号）、国家一体化政务服务平台、上海“随申办”、浙江“浙里办”及“12345”接诉即办工作规范。

系统依托阿里云百炼通义千问大模型与本地真实法定红头公文切片，有效解决了通用大模型在严肃政务领域的**“政策事实性幻觉”**难题，实现了政策法规精准溯源、智能导办“边聊边办”、跨部门链式推荐以及 12345 民情工单闭环流转。

---

## 🌟 核心特色亮点

### 1. 📜 严格法条切片溯源（严肃防幻觉引擎）
- 严禁商业大模型信口胡编，回答基于本地公文法规库双路召回；
- 答案顶部自动挂载 `📜 法定依据` 徽章，点击即可弹出公文原始发文字号与法规章节全文；
- 对超出知识库范围或荒谬违规提问，设置严格置信度过滤门槛并推送 12345 兜底建议。

### 2. 📋 边聊边办导办卡片 (Function Calling 风格)
- 识别办事意向后，动态下发办事指南卡片：展示承诺办结时限、实施机关与准入前置条件；
- **交互式申报材料 Checklist**：群众可逐项勾选已备齐的材料，一键计算材料自检完成度；
- **一键在线预约申报**：自动预填实名信息，生成统一办件流水号。

### 3. 🎯 多轮交互式条件追问与精准澄清 (Slot-filling & Clarification)
- 针对群众“我要落户”、“提取公积金”、“办通行证”等模糊宽泛提问，前置推送交互式情形选项卡片（Condition Chips）；
- 群众点击对应身份（如大专人才、技能证书、随迁投靠），一键直达精准导办流程，消除多轮沟通摩擦。

### 4. 🔗 “高效办成一件事”——链式关联事项推荐 (One-Thing Chain)
- 贯彻国发〔2024〕3号文件精神，在某项核心业务办理完毕后，系统主动推送 2~3 个强相关的下游政务业务推荐徽章（如落户后主动推荐“👉 申领住房补贴”、“👉 档案托管”、“👉 外省社保转移”）；
- 打破部门壁垒，推动政务服务从“接听回答”走向“链式协同与主动服务”。

### 5. 🤖 12345 诉求提交时的“AI 智能归口研判” (AI Triage)
- 群众提报 12345 诉求时，点击【🤖 AI 智能辅助归口研判】；
- 大模型实时对口语化复杂长文进行语义解析，一秒自动提炼**公文式摘要标题**、**推荐承办委办局**（如公安户政、住建、人社等）与**时限等级**，自动回填表单，提升工单派发效率。

### 6. 📊 政务态势感知与民情研判大数据看板 (`/admin.html`)
- **四大核心 KPI**：累计智能咨询人次、群众满意率、12345 诉求工单量、AI 平均响应时延；
- **ECharts 大数据可视化**：民生诉求分类权重环形饼图、近 7 日受理量波动趋势折线图；
- **三大管理工作台**：12345 工单接办批复台、法定政策库台账、办事指南库清单。

---

## 🛠️ 技术架构体系

| 层次 | 技术组件 | 规格 / 说明 |
| :--- | :--- | :--- |
| **基础框架** | Spring Boot | 3.3.4 (Java 17) |
| **AI 框架** | Spring AI Alibaba | 1.0.0-M2.1 (通义千问 DashScope) |
| **网络协议** | Server-Sent Events (SSE) | HTTP/1.1 打字机流式输出 |
| **前端架构** | Vue 3 | 3.3.4 (响应式单页，免 Node 构建) |
| **图表看板** | Apache ECharts | 5.4.3 |
| **安全合规** | DataMaskUtils | 国标 GB/T 35273-2020 敏感信息自动脱敏 |

---

## 🚀 快速启动指南

### 1. 环境准备
- **JDK 17** 及以上
- 具备有效的 **阿里云百炼 (DashScope) API Key**（若未配置，系统内置完备的规则引擎兜底）

### 2. 配置 API Key
在 `src/main/resources/application.properties` 中配置您的密钥：
```properties
# 方式一：直接在配置文件中配置
spring.ai.dashscope.api-key=sk-your-dashscope-api-key-here

# 方式二：或者通过操作系统环境变量注入 DASHSCOPE_API_KEY
# export DASHSCOPE_API_KEY="sk-..."
```

### 3. 编译打包与启动
```powershell
# 使用内置 Maven Wrapper 一键打包
.\mvnw.cmd clean package -DskipTests

# 运行生成的 Fat JAR
java -jar target/spring-ai-alibaba-0.0.1-SNAPSHOT.jar
```

### 4. 浏览器访问
- **群众端智能咨询与导办门户**：`http://localhost:8080/index.html`
- **管理端态势感知与工单大屏**：`http://localhost:8080/admin.html`

> **演示账号**：
> - 超级管理员：账号 `admin` / 密码 `admin123`
> - 普通市民：账号 `user` / 密码 `123456`（亦支持手机号 13876543210 验证码快捷登录或新用户实名注册）

---

## 📁 目录结构说明

```text
spring-ai-alibaba/
├── pom.xml                               # Maven 依赖配置
├── README.md                             # 项目说明文档
├── DEVELOPMENT.md                        # 详细技术实现与设计开发规范文档
├── src/main/
│   ├── java/com/example/myai/
│   │   ├── SpringAiAlibabaApplication.java # Spring Boot 启动类
│   │   ├── common/                       # 工具类与统一定义 (DataMaskUtils, Result)
│   │   ├── controller/                   # REST 控制器 (Chat, Auth, Affair, WorkOrder, Dashboard)
│   │   ├── model/                        # 实体与 DTO 模型
│   │   ├── repository/                   # 线程安全内存仓储库
│   │   └── service/                      # AI 对话、RAG 检索、工单、办事指南核心服务
│   └── resources/
│       ├── application.properties        # 应用配置文件
│       └── static/                       # 前端单页应用 (index.html, admin.html, css/, js/)
```

---

## 📖 详细开发设计文档

更详尽的架构设计、RAG 防幻觉机制、多轮交互状态机、数据库 ER 关系及全部 API 接口规范，请参阅：
👉 [《系统详细开发文档》(DEVELOPMENT.md)](./DEVELOPMENT.md)

---

## 📄 开源许可证

本项目基于 [Apache License 2.0](LICENSE) 协议发布。
