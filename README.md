# 广州市政务政策法规 AI 智能咨询与导办系统
### 基于 SpringBoot + SpringAI 的新一代政务政策大模型便民服务平台

<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg" alt="Spring Boot 3.3.4">
  <img src="https://img.shields.io/badge/Spring%20AI%20Alibaba-1.0.0--M2.1-orange.svg" alt="Spring AI Alibaba">
  <img src="https://img.shields.io/badge/Java-17-blue.svg" alt="Java 17">
  <img src="https://img.shields.io/badge/Database-H2%20(MySQL%20Mode)-yellow.svg" alt="H2 Database">
  <img src="https://img.shields.io/badge/UI%20Style-Square%20Gov%20Doc%20(Zero%20Emoji)-red.svg" alt="Zero Emoji Gov Style">
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License">
</p>

---

## 🏛️ 项目定位与建设宗旨

本项目严格依据课题指标规范，基于 **SpringBoot 3.3.4 + SpringAI + 阿里云百炼大模型（通义千问）** 研发。

**核心建设宗旨**：
> **“把复杂的法款条例智能翻译成老百姓能听懂的语言，项目的本质是便利人民的生活。”**

针对传统政务服务中公文术语晦涩、跨部门政策分散、群众“看不懂、来回跑”、以及通用大模型存在“政策事实性虚构（幻觉）”等痛点，本系统实现：
1. **权威公文严格直溯**：依托广州现行真实公文规章切片，提供精准法条依据直溯，绝不信口胡编；
2. **百姓视角大白话翻译**：大模型自动将法律条款拆解为资格门槛、待遇标准、办事要点与注意事项；
3. **沉浸式全文字办事指引**：彻底剔除容易打断办事的外部跳转链接，通过纯文字交互分步引导市民线上与线下办事路径；
4. **严肃规范的政务视觉体系**：遵循党政机关严肃庄重规范，界面全直角公文风格（`border-radius: 0`），**全篇严格 0 Emoji、0 卡通图案**，常驻标志性 **“快速答疑”** 徽标与单行最简 **“复制”** 功能。

---

## 🌟 核心功能与特色亮点

### 1. 政策法规大白话翻译与法定公文直溯
- 深度对接广州真实政策公文库，群众提问后由 RAG 检索增强引擎实时召回匹配公文；
- 大模型以老百姓听得懂、接地气的语言提炼准入条件与办理要点；
- 回复底部挂载 **“法定政策公文直溯”** 卡片，展示真实发文字号（如《广州市公共租赁住房保障办法》穗府办规〔2024〕6号），支持一键点击抽屉查验法条原文。

### 2. Spring AI 多轮会话上下文管理与持久化 (Session Memory)
- 基于关系数据库表 `gov_chat_history` 实现问答会话持久化存储；
- 具备多轮指代消解与记忆能力。例如用户首轮提问“广州新就业无房职工公租房租赁补贴的标准是多少？”，次轮紧接着追问“外地人在广州也能申请吗？”，AI 能够自动结合上下文准确判定仍为该项补贴的户籍准入条件，无需用户重复提问背景；
- 专窗顶栏提供 **“历史”** 记录抽屉，支持随时回溯过往多轮问答或一键清空会话。

### 3. 扩展功能一：政务知识图谱三元组关联检索
- 系统在关系数据库中内置并维护了政务知识图谱三元组（`gov_knowledge_relation` 表）；
- 支持 4 类核心政务关联链路：
  - **`LEGAL_BASIS`（法定依据）**：事项 ➔ 政策文件（如 公租房补贴 ➔ 穗府办规〔2024〕6号）
  - **`GOVERNING_DEPT`（主管部门）**：政策 ➔ 实施委办局（如 积分入户 ➔ 广州市来穗人员服务管理局）
  - **`JOINT_BUSINESS`（业务联办）**：事项 ➔ “高效办成一件事”联办事项（如 申领租房补贴 ➔ 联办无房公积金提取）
  - **`APPLIES_TO`（适用主体）**：政策 ➔ 受惠群众群体（如 青年人才、持居住证来穗人员）
- 在回答下方以可视化三元组链路卡片展示，辅助市民全面了解关联权责与业务。

### 4. 扩展功能二：办事流程引导式对话向导（纯文字全流程指引）
- 回答中动态挂载分步向导卡片：
  - **【步骤一：资格自查】**：自动调用后台办事指南准入要点，帮助群众自检；
  - **【步骤二：材料清单】**：清单化展示申报材料，高亮标注“电子证照免提交”或大数据自动比对材料；
  - **【步骤三：办事指引】**：**无跳转链接、纯文字办事引导**。清晰告知：
    - 承诺办结时限（如 3 个工作日）；
    - 线上手机端具体操作路径（微信“穗好办”小程序搜索方式与刷脸申报步骤）；
    - 线下办事网点具体窗口地址；
    - 办结短信提醒说明。

### 5. 广州政务数据采集引擎 (Crawler Engine)
- 内置 `GovCrawlerService`，提供自动化数据采集接口；
- 支持传入广州政务网公文 URL 或直接传入政务网页 HTML，自动正则提取公文发文字号、发文机关、成文日期、政策分类及章节条款，并结构化持久化落库。

### 6. 双模前端支持（油猴脚本 + 本地门户底座）
- **本地政务仿真底座**：访问 `http://localhost:8080/` 即可进入广州市人民政府门户（www.gz.gov.cn）仿真平台；
- **油猴插件实网运行**：提供 `gz_gov_ai_assistant.user.js`，安装到 Tampermonkey 后可直接在真实广州市政务官网（`https://www.gz.gov.cn`、`https://zwfw.gd.gov.cn`）右下角自适应挂载运行；
- **Shadow DOM 样式隔离**：采用 Shadow DOM 物理隔离，确保助手样式与宿主网站原生样式互不干扰。

---

## 🛠️ 技术架构与技术栈

| 层次 | 技术选型 | 版本 / 说明 |
| :--- | :--- | :--- |
| **基础开发框架** | Spring Boot | 3.3.4 (Java 17 LTS) |
| **AI 交互框架** | Spring AI Alibaba | 1.0.0-M2.1 (通义千问 `qwen-plus` 流式调用) |
| **持久化数据库** | H2 Database | 嵌入式文件模式 (`./data/gz_gov_ai.mv.db`)，MySQL 兼容语法，重启不丢数据 |
| **数据初始化规范** | Spring SQL Init | `schema.sql` + `data.sql`，严格配置 `UTF-8` 编码 |
| **数据采集爬虫** | Jsoup + Regex Engine | 广州市政务公文发文字号、条款与办事要素结构化抽取 |
| **流式通信协议** | Server-Sent Events (SSE) | HTTP/1.1 `text/event-stream` 打字机流式响应 |
| **前端交互** | 原生 JavaScript + Shadow DOM | 无外部依赖，轻量极速，完全避免样式污染 |
| **浏览器插件适配** | Tampermonkey (油猴) | 支持一键唤起安装，全网段自动匹配注入 |

---

## 🗄️ 数据库核心数据表结构

系统在 `src/main/resources/schema.sql` 中定义了 7 张核心业务表，并在 `src/main/resources/data.sql` 中内置了广州市真实政务数据：

```text
gov_policy_doc            ── 广州市现行法定政策法规公文表 (发文字号、发布机构、成文日期、摘要)
gov_policy_clause         ── 政策法规详细条款切片表 (条款编号、法定原文内容)
gov_affair_guide          ── 政务办事指南事项表 (实施编码、事项全称、法定/承诺时限、准入条件、办理地址)
gov_affair_material       ── 办事指南申报材料清单表 (材料名称、是否必备、免交方式、样本提示)
gov_affair_process        ── 办事流程环节步骤表 (环节序号、环节名称、办理内容、耗时估算)
gov_chat_history          ── 多轮会话问答历史表 (sessionId、用户提问、AI大白话回复、公文溯源、落库时间)
gov_knowledge_relation    ── 政务知识图谱三元组表 (source_type, source_name, relation_type, target_name)
```

---

## 🚀 快速启动与运行指南

### 1. 环境要求
- **JDK 17** 及以上环境（配置好 `JAVA_HOME`）；
- 网络可连接阿里云百炼 DashScope API（已在 `application.properties` 中预置密钥）。

### 2. 构建与启动

```powershell
# 1. 进入项目根目录
cd spring-ai-alibaba

# 2. 使用内置 Maven Wrapper 一键打包
.\mvnw.cmd clean package -DskipTests

# 3. 运行生成的 Fat JAR (强制 UTF-8 编码)
java -Dfile.encoding=UTF-8 -jar target/spring-ai-alibaba-0.0.1-SNAPSHOT.jar
```

服务启动成功后，Tomcat 监听在 `8080` 端口。

---

## 💻 体验与测试指南

### 方式 A：直接在浏览器中打开本地仿真平台（最简便）

在浏览器直接访问：  
👉 **`http://localhost:8080/`** （或 `http://localhost:8080/test_gz_assistant.html`）

**操作流程**：
1. 页面加载广州市人民政府门户网站仿真底座；
2. 屏幕右下角点击蓝底白字的 **“快速答疑”** 徽标展开专窗；
3. 输入测试问题即可开始多轮问答。

---

### 方式 B：通过油猴脚本在真实广州政务网上运行

1. 确保浏览器已安装 **Tampermonkey（油猴）** 插件；
2. 在浏览器地址栏中直接访问：  
   👉 **`http://localhost:8080/gz_gov_ai_assistant.user.js`**
3. 油猴将自动弹出【安装脚本】界面，点击左侧 **【安装】**；
4. 打开真实的广州市政务网站（如 **`https://www.gz.gov.cn`**），刷新后右下角即可自动加载助手！

---

## 📋 真实测试用例验收清单

| 用例编号 | 测试提问 (Prompt) | 验收要点 |
| :--- | :--- | :--- |
| **用例 1** | `广州新就业无房职工公租房租赁补贴的标准是多少？` | • 大白话提取出“300元/月”、“最长24个月”等核心指标；<br/>• 严格直溯《广州市公共租赁住房保障办法》（穗府办规〔2024〕6号）；<br/>• 输出政务知识图谱卡片与办事流程向导。 |
| **用例 2** | 接上文追问：`外地人在广州也能申请这个补贴吗？` | • **Spring AI 多轮上下文记忆验证**：提问中未提“租房补贴”，系统能根据 Session 自动关联上一轮主体，准确解答户籍不限、需连续满6个月社保。 |
| **用例 3** | `广州积分制入户需要多少分？社保要求几年？` | • 准确拆解《广州市积分制入户管理办法》（穗府规〔2023〕1号）硬性门槛；<br/>• 关联展示主管单位（广州市来穗人员服务管理局）。 |
| **用例 4** | `外地户籍在广州摇号小客车车牌需要什么条件？` | • 准确调取《广州市中小客车总量调控管理办法》（穗府办规〔2023〕15号）关于有效居住证及近2年连续24个月医保要求。 |
| **用例 5** | 点击回答下方的 **【步骤1：资格自查】**、**【步骤2：材料清单】**、**【步骤3：办事指引】** | • **流程向导交互测试**：分步下发准入要点、电子证照免提交清单、以及**无跳转链接**的全流程文字办事指引。 |
| **用例 6** | 点击回答右下角的 **“复制”** 按钮 | • 一键无损提取干净纯文本官方答复。 |
| **用例 7** | 点击顶栏 **“历史”** 按钮 | • 展开会话抽屉，检查数据库持久化记录，支持一键清空。 |

---

## 🔌 核心 API 接口清单

| 接口路径 | 方法 | 说明 |
| :--- | :--- | :--- |
| `/api/v1/gov/chat/stream` | `POST` | SSE 流式政策智能咨询接口（返回大白话正文、公文出处、知识图谱、流程向导卡片） |
| `/api/v1/gov/chat/guide-step` | `POST` | 办事流程引导式对话向导交互接口（分步返回自查要点、材料清单、纯文字办事路径） |
| `/api/v1/gov/chat/history` | `GET` | 查询会话历史持久化记录（支持按 `sessionId` 过滤） |
| `/api/v1/gov/chat/history` | `DELETE` | 清空指定或全部会话记录 |
| `/api/v1/gov/chat/graph` | `GET` | 检索政务知识图谱关联三元组（支持关键字过滤） |
| `/api/v1/gov/chat/crawl` | `POST` | 广州政务政策公文爬虫采集接口（输入 URL 或 HTML 自动解析入库） |
| `/gz_gov_ai_assistant.user.js`| `GET` | 油猴脚本一键分发安装端点 |

---

## 📁 核心工程目录结构

```text
spring-ai-alibaba/
├── pom.xml                                     # Maven 依赖配置 (Spring Boot 3.3.4, Spring AI, UTF-8 配置)
├── README.md                                   # 项目权威说明文档 (广州政务全功能专版)
├── DEVELOPMENT.md                              # 架构设计与技术实现详述规范
├── gz_gov_ai_assistant.user.js                # 广州政务 AI 智能问答油猴前端脚本 (全直角、0 Emoji、纯文字引导)
├── src/main/
│   ├── java/com/example/myai/
│   │   ├── SpringAiAlibabaApplication.java    # Spring Boot 主启动类
│   │   ├── common/                             # 通用响应类 (Result, DataMaskUtils)
│   │   ├── controller/
│   │   │   ├── GovChatController.java         # 智能咨询 SSE 流式接口、导办向导交互、爬虫触发
│   │   │   └── GovPortalController.java       # 门户根路径与油猴脚本分发路由控制器
│   │   ├── model/                              # 数据模型 (PolicyDoc, AffairGuide, KnowledgeRelation 等)
│   │   ├── repository/                         # 数据库持久层 (JdbcTemplate 查询 H2 关系数据表)
│   │   └── service/
│   │       ├── GovAiService.java              # Spring AI 多轮对话、知识图谱召回、卡片拼装核心服务
│   │       └── GovCrawlerService.java         # 广州政务公文与办事数据爬虫引擎
│   └── resources/
│       ├── application.properties              # 应用配置 (H2 数据库、UTF-8 脚本初始化、DashScope 密钥)
│       ├── schema.sql                          # 7 张核心业务表 DDL 定义 (UTF-8)
│       ├── data.sql                            # 广州真实公文、办事指南与知识图谱初始数据 (UTF-8)
│       └── static/                             # 静态资源 (仿真门户 test_gz_assistant.html, 嵌入脚本等)
└── data/
    └── gz_gov_ai.mv.db                        # H2 嵌入式关系数据库持久化文件 (运行自动生成)
```

---

## 📄 开源许可证

本项目基于 [Apache License 2.0](LICENSE) 协议发布。
