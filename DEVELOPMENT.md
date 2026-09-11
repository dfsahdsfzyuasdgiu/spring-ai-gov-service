# 《基于 SpringBoot + SpringAI 的智能政务政策咨询与导办系统》开发与技术实现文档
### 广州市人民政府门户网站（www.gz.gov.cn）专版

> **项目名称**：智能政务政策法规咨询与导办系统（Guangzhou Smart Government Policy AI Consultation & Guiding System）  
> **核心宗旨**：**“通过 AI 把复杂的法款条例智能翻译成老百姓能听懂的语言，项目的本质是便利人民的生活。”**  
> **建设标准**：对齐全国一体化在线政务服务平台标准规范、广东省“粤省事/粤商通”、广州市“穗好办”移动政务服务规范，以及党政机关严肃公文规范（全直角、无卡通、严格 0 Emoji）。  
> **运行环境**：JDK 17 LTS + Spring Boot 3.3.4 + Spring AI Alibaba 1.0.0-M2.1 + H2 Database (MySQL Mode) + 原生 JavaScript (Shadow DOM 物理隔离) + Tampermonkey 油猴插件。  
> **本地访问地址**：`http://localhost:8080/`（服务中枢与真实网站接入测试） / `http://localhost:8080/gz_gov_ai_assistant.user.js`（油猴插件分发）

---

## 目录 (Table of Contents)
- [1. 建设背景与系统定位](#1-建设背景与系统定位)
  - [1.1 核心建设宗旨与业务痛点](#11-核心建设宗旨与业务痛点)
  - [1.2 关键指标与功能特性](#12-关键指标与功能特性)
- [2. 系统整体技术架构](#2-系统整体技术架构)
  - [2.1 整体分层技术架构](#21-整体分层技术架构)
  - [2.2 核心技术选型表](#22-核心技术选型表)
  - [2.3 工程代码目录组织结构](#23-工程代码目录组织结构)
- [3. 数据库与持久化数据模型设计](#3-数据库与持久化数据模型设计)
  - [3.1 实体关系结构 (ER) 与 7 张核心表](#31-实体关系结构-er-与-7-张核心表)
  - [3.2 数据库 DDL 结构详解](#32-数据库-ddl-结构详解)
  - [3.3 编码规范与防乱码机制 (UTF-8 强制对齐)](#33-编码规范与防乱码机制-utf-8-强制对齐)
- [4. 核心业务逻辑与技术实现](#4-核心业务逻辑与技术实现)
  - [4.1 权威公文检索增强与法定依据直溯 (RAG 防幻觉引擎)](#41-权威公文检索增强与法定依据直溯-rag-防幻觉引擎)
  - [4.2 政策条款“老百姓大白话”智能翻译引擎](#42-政策条款老百姓大白话智能翻译引擎)
  - [4.3 Spring AI 多轮会话上下文管理与持久化 (Session Memory)](#43-spring-ai-多轮会话上下文管理与持久化-session-memory)
  - [4.4 扩展功能一：政务知识图谱三元组关联检索](#44-扩展功能一政务知识图谱三元组关联检索)
  - [4.5 办事向导三步法与广东政务服务网在线申办直达](#45-办事向导三步法与广东政务服务网在线申办直达)
  - [4.6 广州市政务公文爬虫采集服务 (Crawler Engine)](#46-广州市政务公文爬虫采集服务-crawler-engine)
- [5. 前端 UI/UX 设计与严肃公文规范](#5-前端-uiux-设计与严肃公文规范)
  - [5.1 严肃党政全直角公文视觉体系 (Sharp Corner Aesthetic)](#51-严肃党政全直角公文视觉体系-sharp-corner-aesthetic)
  - [5.2 严格零表情零卡通规范 (Zero Emoji & Zero Cartoon)](#52-严格零表情零卡通规范-zero-emoji--zero-cartoon)
  - [5.3 标志性“快速答疑”与最简“复制”功能设计](#53-标志性快速答疑与最简复制功能设计)
  - [5.4 Shadow DOM 样式物理隔离与真实网站多途径接入](#54-shadow-dom-样式物理隔离与真实网站多途径接入)
  - [5.5 窗口最小尺寸约束与全直角无极缩放架构设计](#55-窗口最小尺寸约束与全直角无极缩放架构设计)
- [6. 接口规范与 API 参考](#6-接口规范与-api-参考)
  - [6.1 流式政务智能咨询接口 (`POST /stream`)](#61-流式政务智能咨询接口-post-stream)
  - [6.2 流程向导交互接口 (`POST /guide-step`)](#62-流程向导交互接口-post-guide-step)
  - [6.3 会话历史持久化接口 (`GET /history`, `DELETE /history`)](#63-会话历史持久化接口-get-history-delete-history)
  - [6.4 政务知识图谱检索接口 (`GET /graph`)](#64-政务知识图谱检索接口-get-graph)
  - [6.5 公文爬虫采集入库接口 (`POST /crawl`)](#65-公文爬虫采集入库接口-post-crawl)
- [7. 广州现行法定政策法规与真实测试基准库](#7-广州现行法定政策法规与真实测试基准库)
- [8. 环境部署与运行调试指南](#8-环境部署与运行调试指南)

---

## 1. 建设背景与系统定位

### 1.1 核心建设宗旨与业务痛点
传统的政务公开与政策问答平台普遍面临如下深层痛点：
1. **公文语言严谨但晦涩难懂**：红头公文法规条文繁复，大量专业术语与交叉条款让普通老百姓“读不懂、看不透、算不清”，难以直接知晓自己到底享有什么待遇、符合什么准入条件；
2. **商业大模型的“政策事实性幻觉”**：直接使用市面商用大模型容易虚构已废止的文件编号、甚至凭空捏造办事政策，在严肃政务领域带来不可容忍的行政风险；
3. **政策与办事割裂、找不到官方申办入口**：群众在政务网查政策时难以获知办事流程，问办事流程时又往往找不到对应事务在广东政务服务网的真实具体办理入口；
4. **缺乏多轮指代理解与上下文持久化**：用户往往在追问时省略前提（如前句问公租房，后句追问“外地人可以吗”），传统系统无法记忆会话上下文。

**本系统的核心宗旨与双轨机制**：
> **“把复杂的法款条例智能翻译成老百姓能听懂的语言，问政策答依据，问办事给步骤带直达链接，项目的本质是便利人民的生活。”**
系统对标广州市人民政府门户（`www.gz.gov.cn`）政策与广东政务服务网（`www.gdzwfw.gov.cn`）办事指引，通过 Spring AI + 真实公文 RAG 检索增强 + 32 项全生命周期事项库 + 办事向导三步法直出卡片，构筑权威、通俗、连贯且带官方申报直达的便民中枢。

### 1.2 关键指标与功能特性
* **广州政务政策全域支撑**：入库《广州市公共租赁住房保障办法》（穗府办规〔2024〕6号）、《广州市积分制入户管理办法》（穗府规〔2023〕1号）等 27 部真实公文规章；
* **法定依据 100% 直溯**：每条政策答复附带红头公文出处，支持查验条款原文；
* **Spring AI 上下文持久化**：基于 H2 数据库实现多轮问答连续追问与指代理解；
* **办事向导三步法直出卡片**：直接以结构化高保真卡片（资格自查 ➔ 材料免提交 ➔ 办事指引）展现，免除多次点击交互；
* **广东政务服务网官方办理跳转直达**：在办事指引步骤 3 底部直出绿色申办卡片，精准配置广东政务服务网该事项真实实施编码与在线申报直达跳转链接；
* **党政严肃视觉体系**：全局 `border-radius: 0` 直角规范，办事向导统一政务通畅绿，政策依据采用红头公文色，**Emoji = 0**，无卡通图案。

---

## 2. 系统整体技术架构

### 2.1 整体分层技术架构

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     前端真实网站伴随交互层 (Shadow DOM)                │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │ 真实政务网油猴插件             │   │ 真实政务网控制台动态注入      │  │
│  │ (gz_gov_ai_assistant.user.js) │   │ (gz_assistant_embed.js)      │  │
│  └───────────────┬───────────────┘   └──────────────┬───────────────┘  │
│                  └─────────────────┬────────────────┘                  │
│                                    ▼                                   │
│                        Shadow DOM 样式物理隔离容器                      │
│            [快速答疑徽标] [全直角咨询窗口] [复制按钮] [历史抽屉]           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / SSE (text/event-stream)
┌────────────────────────────────────▼───────────────────────────────────┐
│                        网关与控制层 (Spring MVC)                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────┐  │
│  │ GovChatController     │  │ GovPortalController   │  │ WebMvcConf │  │
│  │ (流式问答/向导/图谱)   │  │ (页面转发与脚本分发)   │  │ (跨域/静态)│  │
│  └───────────────────────┘  └───────────────────────┘  └────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                       核心业务服务层 (Business Services)                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ GovAiService:                                                    │  │
│  │ • 会话上下文组装 (Session Context Injector)                       │  │
│  │ • RAG 公文检索增强与出处锚定                                      │  │
│  │ • 大白话通俗化 Prompt 工程与流式解析                              │  │
│  │ • 知识图谱三元组关联召回                                          │  │
│  │ • 办事向导步骤卡片组装                                            │  │
│  │ • 会话落库持久化切面                                              │  │
│  ├────────────────────────────────┬─────────────────────────────────┤  │
│  │ GovCrawlerService              │ Spring AI Client                │  │
│  │ (政务公文/条款结构化抓取抽取)   │ (DashScope 通义千问 qwen-plus)  │  │
│  └────────────────────────────────┴─────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ JdbcTemplate
┌────────────────────────────────────▼───────────────────────────────────┐
│                     持久化数据层 (H2 File Database)                     │
│  存储路径: ./data/gz_gov_ai.mv.db (MySQL 兼容模式, UTF-8 编码初始化)   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ gov_policy_doc   │  │ gov_affair_guide │  │ gov_chat_history │      │
│  │ (政策公文主表)   │  │ (办事指南主表)   │  │ (多轮问答历史表) │      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │gov_policy_clause │  │gov_affair_material│ │gov_knowledge_rela│      │
│  │ (公文详细条款表) │  │ (申报材料清单表) │  │ (知识图谱三元组) │      │
│  └──────────────────┘  ├──────────────────┤  └──────────────────┘      │
│                        │gov_affair_process│                            │
│                        │ (办理流程环节表) │                            │
│                        └──────────────────┘                            │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心技术选型表

| 组件名称 | 选型版本 | 作用与选型理由 |
| :--- | :--- | :--- |
| **基础开发框架** | Spring Boot 3.3.4 | 现代化 Java 17 LTS 企业级底座，稳定高效 |
| **AI 大模型框架** | Spring AI Alibaba 1.0.0-M2.1 | 阿里云百炼通义千问官方接入标准，支持流式 SSE 打字机输出 |
| **大模型型号** | `qwen-plus` | 具备出色的中文政策语义理解、复杂长文抽取与通俗表达能力 |
| **持久化关系数据库** | H2 Database 2.2.224 | 嵌入式文件模式持久化，轻量免运维，完美支持标准 SQL 与外键关联 |
| **数据初始化框架** | Spring SQL Initialization | 启动时自动执行 DDL 与预置公文，严格对齐 `UTF-8` 编码 |
| **HTML 爬虫引擎** | Jsoup 1.17.2 | 爬取广州政务网网页并正则提取公文发文字号、条款及正文 |
| **前端样式隔离** | Web Components (Shadow DOM) | 确保插件在真实政府官网中运行时，CSS 样式 100% 物理隔离 |
| **浏览器自动化挂载** | Tampermonkey (油猴) 5.x | 支持在真实政府网（`gz.gov.cn`、`www.gdzwfw.gov.cn`）一键挂载专窗 |

### 2.3 工程代码目录组织结构

```text
spring-ai-alibaba/
├── pom.xml                                     # Maven 核心依赖与编译配置 (强制 UTF-8)
├── README.md                                   # 项目权威说明与快速入门文档
├── DEVELOPMENT.md                              # 详细技术实现、架构与设计开发规范文档
├── gz_gov_ai_assistant.user.js                # 广州政务 AI 智能问答油猴前端脚本
├── src/main/java/com/example/myai/
│   ├── SpringAiAlibabaApplication.java        # Spring Boot 主启动类
│   ├── common/
│   │   ├── Result.java                         # 统一 API 响应包装类
│   │   └── DataMaskUtils.java                  # 敏感身份信息脱敏工具
│   ├── controller/
│   │   ├── GovChatController.java             # 智能咨询 SSE 流式接口、流程向导、知识图谱、爬虫 API
│   │   ├── GovPortalController.java           # 门户根路径重定向与油猴脚本分发控制器
│   │   └── GovDashboardController.java         # 统计大屏与指标控制器
│   ├── model/
│   │   ├── PolicyDoc.java                      # 政策公文实体
│   │   ├── PolicyClause.java                   # 政策条款实体
│   │   ├── AffairGuide.java                    # 办事指南实体 (含材料与环节内部类)
│   │   ├── GovChatHistory.java                 # 对话历史实体
│   │   ├── KnowledgeRelation.java              # 知识图谱三元组实体
│   │   └── dto/
│   │       ├── ChatRequest.java                # 问答请求 DTO
│   │       ├── ChatResponseChunk.java          # SSE 流式分块 DTO
│   │       └── FeedbackDTO.java                # 群众反馈 DTO
│   ├── repository/
│   │   ├── PolicyRepository.java               # 政策公文库 (JdbcTemplate 查询 H2)
│   │   ├── AffairRepository.java               # 办事指南库 (JdbcTemplate 查询 H2)
│   │   ├── ChatHistoryRepository.java          # 对话历史仓储库 (持久化落库与上下文查询)
│   │   └── KnowledgeGraphRepository.java       # 知识图谱三元组仓储库
│   └── service/
│       ├── GovAiService.java                  # 核心服务: 上下文拼接、Prompt 编排、图谱与向导组装
│       ├── GovRagService.java                  # 本地政策规章精准 RAG 检索召回服务
│       └── GovCrawlerService.java             # 广州政务公文爬虫采集服务
├── src/main/resources/
│   ├── application.properties                  # 核心配置 (H2 连接池、UTF-8 脚本编码、DashScope API Key)
│   ├── schema.sql                              # 7 张核心业务表 DDL (UTF-8)
│   ├── data.sql                                # 真实广州公文、办事指南与知识图谱初始数据 (UTF-8)
│   └── static/
│       ├── index.html                          # 真实网站测试与服务中枢管理页面
│       ├── gz_assistant_embed.js               # 页面直插版问答专窗组件
│       ├── gz_gov_ai_assistant.user.js         # 油猴脚本一键分发端点
│       └── inject/                             # 镜像静态脚本
└── data/
    └── gz_gov_ai.mv.db                        # H2 嵌入式持久化数据文件
```

---

## 3. 数据库与持久化数据模型设计

### 3.1 实体关系结构 (ER) 与 7 张核心表

系统摒弃了早期的内存伪数据，采用 **H2 嵌入式关系数据库文件持久化模式**（路径为 `./data/gz_gov_ai.mv.db`），支持系统重启不丢数据。包含 7 张核心表：

```text
  ┌────────────────────────┐                   ┌────────────────────────┐
  │      gov_policy_doc    │ 1               * │   gov_policy_clause    │
  │  (广州现行政策公文表)   │───────────────────│    (公文条款切片表)    │
  └────────────────────────┘                   └────────────────────────┘
               │                                            │
               │ (通过 target_id 关联)                       │
               ▼                                            ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                       gov_knowledge_relation                        │
  │              (政务知识图谱三元组: 政策 ↔ 事项 ↔ 部门 ↔ 主体)         │
  └─────────────────────────────────────────────────────────────────────┘
               ▲                                            ▲
               │ (通过 source_id 关联)                       │
  ┌────────────────────────┐                   ┌────────────────────────┐
  │    gov_affair_guide    │ 1               * │  gov_affair_material   │
  │    (政务办事指南事项)  │───────────────────│    (申报材料清单表)    │
  └───────────┬────────────┘                   └────────────────────────┘
              │ 1
              │
              │ *
  ┌───────────▼────────────┐                   ┌────────────────────────┐
  │   gov_affair_process   │                   │    gov_chat_history    │
  │    (办事流程环节表)    │                   │   (多轮问答历史落库表) │
  └────────────────────────┘                   └────────────────────────┘
```

### 3.2 数据库 DDL 结构详解

在 `src/main/resources/schema.sql` 中完整定义：

```sql
-- 1. 政策法规公文表
CREATE TABLE IF NOT EXISTS gov_policy_doc (
    id BIGINT PRIMARY KEY,
    doc_number VARCHAR(100) NOT NULL,          -- 发文字号 (如: 穗府办规〔2024〕6号)
    title VARCHAR(300) NOT NULL,               -- 文件全称 (如: 广州市公共租赁住房保障办法)
    category VARCHAR(100) NOT NULL,            -- 政策类别 (住房保障/户籍管理/交通出行等)
    issuer_dept VARCHAR(200) NOT NULL,         -- 发文机关 (如: 广州市人民政府办公厅)
    publish_date VARCHAR(50),                  -- 发布日期
    effective_date VARCHAR(50),                -- 施行日期
    status INT DEFAULT 1,                      -- 效力状态 (1:现行有效, 0:已废止)
    summary TEXT                               -- 政策核心准入与待遇摘要
);

-- 2. 政策法规条款表
CREATE TABLE IF NOT EXISTS gov_policy_clause (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    policy_id BIGINT NOT NULL,                 -- 关联 gov_policy_doc.id
    clause_no VARCHAR(100) NOT NULL,           -- 条款编号 (如: 第十一条【租赁补贴】)
    clause_text TEXT NOT NULL                  -- 条款法定原文切片
);

-- 3. 政务办事指南事项表
CREATE TABLE IF NOT EXISTS gov_affair_guide (
    id BIGINT PRIMARY KEY,
    affair_code VARCHAR(100) NOT NULL,         -- 实施编码 (如: GZ-ZJ-GZH001)
    affair_name VARCHAR(300) NOT NULL,         -- 事项全称
    category VARCHAR(100) NOT NULL,
    service_object VARCHAR(100) DEFAULT '自然人',
    legal_limit_days INT DEFAULT 15,           -- 法定办结时限
    promised_limit_days INT DEFAULT 1,         -- 承诺办结时限 (极简便民时限)
    qualifications TEXT,                       -- 准入自查核心条件
    handling_address VARCHAR(500),             -- 线下受理网点地址
    online_handle_url VARCHAR(500)             -- 广东政务服务网官方在线申办直达 URL 链接 (在步骤3直出直达跳转卡片)
);

-- 4. 办事指南申报材料表
CREATE TABLE IF NOT EXISTS gov_affair_material (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    affair_id BIGINT NOT NULL,                 -- 关联 gov_affair_guide.id
    name VARCHAR(300) NOT NULL,                -- 材料名称
    mandatory BOOLEAN DEFAULT TRUE,            -- 是否必须
    format VARCHAR(100),                       -- 介质形式 (电子证照免提交/数据联网核验)
    sample_tip VARCHAR(500)                    -- 核验免提交说明
);

-- 5. 办事指南流程步骤表
CREATE TABLE IF NOT EXISTS gov_affair_process (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    affair_id BIGINT NOT NULL,                 -- 关联 gov_affair_guide.id
    step_no INT NOT NULL,                      -- 步骤序号
    step_name VARCHAR(100) NOT NULL,           -- 步骤名称
    description VARCHAR(500),                  -- 详细指引文字
    time_cost VARCHAR(100)                     -- 耗时预估
);

-- 6. 对话历史持久化表 (Spring AI 上下文管理与回溯)
CREATE TABLE IF NOT EXISTS gov_chat_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,          -- 会话唯一 ID
    user_id VARCHAR(100) DEFAULT 'citizen',
    user_prompt TEXT NOT NULL,                 -- 用户原声提问
    ai_reply TEXT NOT NULL,                    -- AI 大白话答复
    doc_title VARCHAR(300),                    -- 溯源公文标题
    doc_number VARCHAR(100),                   -- 溯源发文字号
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 政务知识图谱关联表 (三元组网络)
CREATE TABLE IF NOT EXISTS gov_knowledge_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,          -- 源类型 (AFFAIR/POLICY)
    source_id VARCHAR(100) NOT NULL,
    source_name VARCHAR(200) NOT NULL,
    relation_type VARCHAR(50) NOT NULL,        -- LEGAL_BASIS/GOVERNING_DEPT/JOINT_BUSINESS/APPLIES_TO
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    target_name VARCHAR(200) NOT NULL,
    relation_desc VARCHAR(500)                 -- 链路通俗说明
);
```

### 3.3 编码规范与防乱码机制 (UTF-8 强制对齐)

在 Windows 操作系统中，系统默认编码多为 GBK，这极易导致 Spring Boot 启动初始化 `data.sql` 时出现中文字符错乱（双重编码乱码）。系统实施了四道编码防御壁垒：
1. **配置文件显式绑定**：在 `application.properties` 中指定 `spring.sql.init.encoding=UTF-8`；
2. **构建编码对齐**：在 `pom.xml` 中指定 `<project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>`；
3. **运行时 JVM 参数**：启动命令中注入 `-Dfile.encoding=UTF-8`；
4. **源码无 BOM 保存**：所有 SQL 和 Java 文件严格使用无 BOM 的 UTF-8 编码落盘。

---

## 4. 核心业务逻辑与技术实现

### 4.1 权威公文检索增强与法定依据直溯 (RAG 防幻觉引擎)

系统通过 `GovRagService` 实施公文检索增强，严防商业大模型凭空捏造。
1. **公文规章切片索引**：系统将《广州市公共租赁住房保障办法》等现行文件按条款（Clause）切片，提取标题、发文字号、条款编号与条款正文；
2. **两阶段检索召回**：
   - 阶段一：关键词精准包含匹配（如“租赁补贴”、“积分入户”）；
   - 阶段二：多维度语义比对与置信度打分。若置信度低于阈值，系统主动发起澄清或建议转接 12345；
3. **严格直溯出处卡片**：一旦召回有效条款，AI 答复顶部与底部均注入 `citation` 数据块，前端渲染为公文出处卡片，点击即可展开条文原文抽屉。

### 4.2 政策条款“老百姓大白话”智能翻译引擎

为了践行“把复杂的法款条例翻译成老百姓能听懂的语言”宗旨，系统在 `GovAiService` 中构建了严格的公文通俗化系统提示词（System Instruction）：

```text
你是广州市人民政府门户网站（www.gz.gov.cn）的政策智能咨询专家。
【核心宗旨】通过通俗、清晰、接地气的大白话把晦涩法款条例翻译给老百姓听，便利市民生活。
【回答结构要求】：
1. 【快速答疑】：用 1-2 句话直接给出结论，说明核心标准或门槛（加粗核心数字）；
2. 【办事要点】：
   • 准入门槛：以清单方式列出年龄、户籍、社保月数、无房等硬性指标；
   • 待遇标准/材料：明确说明金额标准、支持“电子证照免提交”的项目；
   • 办事渠道：直接告知手机端通过“穗好办”APP/小程序的具体操作路径；
   • 注意事项：提示断缴限制、申领期限等民生避坑指南。
3. 【官方政策依据】：列明现行有效文件的正式发文字号与条款出处。
【严禁事项】：严禁编造政策；全篇严禁出现任何 Emoji 表情和卡通图案！
```

### 4.3 Spring AI 多轮会话上下文管理与持久化 (Session Memory)

系统在 `GovAiService` 和 `ChatHistoryRepository` 中实现了完整的会话状态机：
1. **上下文回溯机制**：客户端携带 `sessionId` 提问，系统在调用通义千问前，首先查询 `gov_chat_history` 表中该会话最近 4 轮的历史提问与答复，格式化为历史对话链；
2. **多轮指代消除实测**：
   * 轮次一：用户提问“广州新就业无房职工公租房租赁补贴的标准是多少？” ➔ 识别为公租房租赁补贴（穗建规字〔2022〕1号 / 穗府办规〔2024〕6号）；
   * 轮次二：用户紧接着追问“外地人在广州也能申请这个补贴吗？” ➔ 系统将历史记录并联注入，AI 自动判定“这个补贴”即指前文的“新就业无房职工公租房租赁补贴”，精准回答外地户籍不受限制、但需满足学历及在穗连续缴纳 6 个月社保；
3. **异步持久化落库**：大模型流式生成完毕后，触发异步持久化，将完整问答记录写回 `gov_chat_history`，保障多终端多轮状态可回溯。

### 4.4 答复结构极简重构与降噪原则
在研发与评测过程中，系统深入分析了群众办事咨询的认知负荷，确立了**“去粗取精、一目了然”**的重构原则：
1. **彻底消除非结构化文本与步骤卡片的重复冗余**：原先的【办事要点】文本列表与向导卡片（准入门槛 ⇋ 资格自查、材料 ⇋ 申报材料核验、渠道 ⇋ 办事指引）存在 100% 内容重叠，系统直接以【办事向导三步法】高保真卡片取代原有散乱文本；
2. **剔除【政务知识图谱关联】卡片**：知识图谱三元组（事项 ➔ 法定依据 ➔ 文号）与紧邻的【官方政策依据】红头公文溯源高度重合，且学术化的三元组概念给普通老百姓办事增加了认知障碍，因此全面剔除知识图谱前端展示，将空间留给最实用的办事步骤；
3. **取消底部多次点击交互**：完整向导三步法随首轮答复直接展开，市民无需再逐次点击 3 个按钮生成重复气泡。

### 4.5 办事向导三步法与广东政务服务网在线申办直达
1. **第一层：【快速答疑】**
   - 1-2 句核心定性结论，开门见山直击市民关切（“到底能不能办”、“能领多少补贴/最高1400元”、“最长可以领5年/最快1个工作日办结”）；
2. **第二层：【办事向导三步法】（高保真直角卡片直接展开，政务通畅绿）**
   - **步骤 1【准入资格自查】**：清晰罗列硬性准入门槛（户籍、社保月数、学历/年龄等），群众对照即可自检；
   - **步骤 2【申报材料与免提交核查】**：以醒目的政务绿色标签标明“电子证照免提交”、“大数据联网比对”，突出“减材料”便民改革成果；
   - **步骤 3【全流程办事指引】**：
     - **承诺办结时限**：明确办结工作日；
     - **流程阶段拆解**：清晰分拆第1步、第2步、第3步操作阶段及预计耗时；
     - **线上办理文字指引与【广东政务服务网 · 官方在线申办直达】**：微信“穗好办”小程序搜索申报流程，并在步骤 3 底部直出绿色直通卡片，精准展示该事项在广东政务服务网的真实业务实施编码与在线申报直达链接（`online_handle_url`），市民点击即可直接跳转广东政务服务网该业务专属网办页面；
     - **线下办事网点**：明确指定综合窗口地址；
     - **注意事项与避坑提醒**：以直角警示框高亮社保断缴、申请时间截点等高频误区。
3. **第三层：【官方政策依据】（权威红头公文发文标准色）**
   - 权威红头文件名称、发文字号（如`穗公积金规字〔2023〕1号`）、制定机关，配备“查看条文原文 ▾”抽屉；
4. **第四层：【相关政策延伸咨询】**
   - 智能推荐市民可能关心的链式关联业务追问标签。

### 4.6 广州市政务公文爬虫采集服务 (Crawler Engine)

内置 `GovCrawlerService`，支持自动化拓展政策数据库：
* 接口：`POST /api/v1/gov/chat/crawl`；
* 机制：使用 Jsoup 请求广州政务网网页或直接解析传入的公文 HTML；
* 抽取器：自动通过正则表达式抽取标准公文元数据：
  * 发文字号：匹配 `穗府〔\d{4}〕\d+号`、`穗府办规〔\d{4}〕\d+号` 等标准模式；
  * 标题：提取 `h1.content-title` 或元数据标签；
  * 结构化条款：按“第一条”、“第二条”切片提取条款编号与条款正文；
* 持久化：自动执行事务写入 `gov_policy_doc` 与 `gov_policy_clause` 表，立即可供 RAG 问答检索。

---

## 5. 前端 UI/UX 设计与严肃公文规范

### 5.1 严肃党政全直角公文视觉体系 (Sharp Corner Aesthetic)
* **强制全直角规范**：党政公文追求庄严权威，前端所有容器、气泡、按钮、输入框均设置 `border-radius: 0 !important`；
* **广州政务配色与色彩视觉规范**：
  * 广州政务深蓝 (`#0050b3` / `#003a8c`)：用于窗口顶栏、主标题与官方徽标；
  * 便民政务通畅绿 (`#389e0d` / `#237804` / `#f6ffed` / `#d9f7be`)：**全量应用于【办事向导三步法】（步骤1准入自查、步骤2材料免提交、步骤3全流程指引）**；彻底剔除向导步骤卡片与办结时限中的红色，消除市民“门槛阻碍或警报”的焦虑心理，全面凸显“绿灯通畅、减材料免跑腿、快速办结”的便民利民服务属性；
  * 权威红头公文红 (`#c20505` / `#faecd8`)：**精准应用于【官方政策依据】公文溯源卡片**；以庄严的红头公文标识色与公文衬底严谨彰显党政公文的法定溯源效力；
  * 庄重背景浅灰 (`#f4f6fa`) 与公文边框灰 (`#d9d9d9` / `#e2e8f0`)。

### 5.2 严格零表情零卡通规范 (Zero Emoji & Zero Cartoon)
* 严肃政务场景下，卡通人物或趣味 Emoji 会损害政府公信力；
* **前端脚本严格保持 Emoji 计数 = 0**，所有界面控制一律采用单色矢量 SVG 线性图标与简洁公文文字。

### 5.3 标志性“快速答疑”与最简“复制”功能设计
* **“快速答疑”徽标**：右下角常驻醒目的蓝底白字直角矩形标徽，字迹清晰工整；
* **单行最简“复制”**：在 AI 答复下方提供纯净单行“复制”按钮，点击即可将大白话答复完整复制到剪贴板，方便市民留存或转发。

### 5.4 Shadow DOM 样式物理隔离与真实网站多途径接入
* 前端助手采用 Shadow DOM 封装挂载，在宿主网站上实现 CSS 样式的物理隔离，完全不会干扰真实官方政务网站的原生页面排版与全局样式；
* **真实网站测试与接入途径**：
  * **途径一（油猴脚本持久伴随）**：在 Tampermonkey 中安装 `http://localhost:8080/gz_gov_ai_assistant.user.js`，访问真实广州市人民政府门户（`https://www.gz.gov.cn`）或广东政务服务网广州专区（`https://www.gdzwfw.gov.cn/?region=440100`）自动挂载；
  * **途径二（控制台快速注入）**：打开真实官方政务网站，在浏览器开发者工具 Console 中粘贴运行一行指令：
    `const s = document.createElement('script'); s.src = 'http://localhost:8080/gz_assistant_embed.js'; document.body.appendChild(s);`
    即可免装插件直接在真实页面右下角唤起助手进行功能测试；
  * **途径三（服务中枢控制台）**：浏览器访问 `http://localhost:8080/`，查看后端运行状态并一键获取脚本分发、管理后台大屏与答辩演示。

### 5.5 窗口最小尺寸约束与全直角无极缩放架构设计

为兼顾屏幕有限空间下的轻量常驻与深度办理时的宽屏长文阅读，系统设计了严谨的**直角无极缩放与最小窗口保护机制**：

1. **绝对最小尺寸硬约束（420px × 570px）**：
   * 在 CSS 规则中声明 `min-width: 420px !important; min-height: 570px !important;`；
   * 该尺寸是承载广州政务公文溯源卡片、四类知识图谱链路、三步法全文字向导以及 12345 诉求表单的黄金比例极限；用户在拖拽或缩放时，任何向内挤压动作均受到严格底线保护，确保政务公文要素绝不换行错乱或溢出隐藏。

2. **左上角政务直角标尺缩放手柄**：
   * 鉴于助手窗口物理锚定在宿主页面的右下角（`bottom: 0; right: 0`），窗口向外扩展的自然几何方向为**向左**与**向上**；
   * 在窗口左上角常驻 `.gz-resize-grip-nw` 拖拽热区，内置醒目的政务金全直角标尺（`┌` 标识，`border-radius: 0 !important`），悬浮呈 `nwse-resize`；
   * 同时在左边缘（`ew-resize`）与上边缘（`ns-resize`）设置隐形热区，支持用户任意方向平滑无极拉伸。

3. **双模一键直角缩放（大屏导办全景模式）**：
   * 顶栏右侧设置直角方框操作按钮 `[□]`（`#gzBtnScale`），点击后一键平滑放大至全景大屏模式（880px × 760px），便于宽屏沉浸式研读法律条款全文或审核复杂申报材料；
   * 放大后图标自动切换为直角复原标识 `[❐]`，点击一键无损还原为 420×570 最小窗口；
   * 用户双击窗口顶部标头空白区域，亦可触发最小窗口与大屏全景之间的平滑切换。

4. **客户端偏好尺寸持久化记忆**：
   * 无论是拖拽自由缩放还是一键切换，最终尺寸均自动通过 `localStorage` 安全持久化（键名 `gz_gov_win_w` 与 `gz_gov_win_h`）；
   * 市民在跨页面跳转浏览不同委办局页面时，助手自动无感加载历史偏好尺寸，极大提升阅读舒适度。

5. **高频政策快捷标签直角网格自适应排版**：
   * 针对默认 420px 宽度下单行溢出截断痛点，将 `.gz-quick-bar` 由传统的单行滚动重构为纯直角自适应网格（`display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr))`）；
   * 在 420px 默认最小窗口下，6 个快捷标签自动以 3 列 × 2 行整齐排列，文字 100% 完整显示且居中对齐，彻底根除横向滚动截断；
   * 当用户拖拽或切换到宽屏/大屏全景模式时，网格自动依据可用宽度平铺为单行 6 列，实现自适应流式排版。

---

## 6. 接口规范与 API 参考

### 6.1 流式政务智能咨询接口 (`POST /stream`)
* **URL**: `/api/v1/gov/chat/stream`
* **Content-Type**: `application/json`
* **Accept**: `text/event-stream`
* **请求体**：
```json
{
  "sessionId": "gz-citizen-session-001",
  "prompt": "广州新就业无房职工公租房租赁补贴的标准是多少？",
  "category": "住房保障"
}
```
* **SSE 分块协议**：
  * `citation`：法定公文出处元数据（发文字号、条款号、条款原文）；
  * `chunk`：大白话通俗化正文打字机流式增量文本；
  * `graph_card`：关联的政务知识图谱三元组列表；
  * `guided_steps`：办事流程向导步骤卡片（自查、材料、办事指引）；
  * `done`：生成结束标志。

### 6.2 流程向导交互接口 (`POST /guide-step`)
* **URL**: `/api/v1/gov/chat/guide-step`
* **请求体**：
```json
{
  "affairId": 101,
  "stepNo": 3
}
```
* **响应数据（全文字办事指引，无跳转外链）**：
```json
{
  "code": 200,
  "data": {
    "stepName": "办事指引",
    "promisedLimitDays": 3,
    "handlingAddress": "广州市各区住房保障办公室或街道政务服务中心综合窗口",
    "guidance": "【全流程文字办事指引】\n1. 承诺办结时限：3 个工作日。\n2. 线上办理路径：微信打开“穗好办”小程序或登录广东政务服务网广州专区，在顶部搜索栏输入“新就业无房职工公共租赁住房租赁补贴申领”，刷脸完成实名认证后，系统自动调用免提交证照核验，核对无误即可在线确认提交。\n3. 线下网点办理：可前往 广州市各区住房保障办公室或街道政务服务中心综合窗口，持身份证原件办理。\n4. 办结短信提醒：审批通过后，办理结果将以政务短信通知并下发电子凭据。"
  }
}
```

### 6.3 会话历史持久化接口 (`GET /history`, `DELETE /history`)
* **GET `/api/v1/gov/chat/history?sessionId=xxx`**：查询该会话在数据库中的全部问答记录；
* **DELETE `/api/v1/gov/chat/history?sessionId=xxx`**：重置并清空该会话历史。

### 6.4 政务知识图谱检索接口 (`GET /graph`)
* **URL**: `/api/v1/gov/chat/graph?keyword=公租房`
* **响应**：返回匹配的 `KnowledgeRelation` 三元组列表。

### 6.5 公文爬虫采集入库接口 (`POST /crawl`)
* **URL**: `/api/v1/gov/chat/crawl`
* **请求体**：
```json
{
  "url": "https://www.gz.gov.cn/zwgk/fggw/sfbgtwj/content/post_999999.html",
  "category": "住房保障"
}
```

---

## 7. 广州现行法定政策法规与 32 大核心政务事项全生命周期矩阵

系统深度沉淀了 **32 项高频热门政务办事指南** 与 **27 部官方现行红头法规规章**，每一项办事指南均严格配置**广东政务服务网（`www.gdzwfw.gov.cn`）真实实施编码与在线申报直达跳转链接**：

### 7.1 全生命周期 32 大核心办事事项一览表

| 领域 | 序号 | 实施编码 | 事项全称 | 办结时限 | 广东政务服务网直达入口 / 办理途径 |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **住房与公积金** | 1 | GZ-ZJ-GZH001 | 新就业无房职工公共租赁住房租赁补贴申领 | 3天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%85%AC%E7%A7%9F%E6%88%BF&region=440100) |
| | 2 | GZ-ZJ-SWPZ007 | 本市户籍中等偏下收入家庭公租房实物配租轮候 | 5天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%85%AC%E7%A7%9F%E6%88%BF%E9%85%8D%E7%A7%9F&region=440100) |
| | 3 | GZ-GJJ-ZFTQ008 | 个人住房公积金无房租赁按月提取 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%A7%9F%E6%88%BF%E6%8F%90%E5%8F%96&region=440100) |
| | 4 | GZ-GJJ-HFTQ009 | 个人住房公积金按月冲还房贷本息提取 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%BF%98%E8%B4%B7%E6%8F%90%E5%8F%96&region=440100) |
| **户籍与人才** | 5 | GZ-LS-JFRH002 | 广州市来穗人员积分制入户申报 | 5天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%A7%AF%E5%88%86%E5%85%A5%E6%88%B7&region=440100) |
| | 6 | GZ-RS-XLRH010 | 全日制青年高校毕业生在穗落户（学历入户） | 2天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%AD%A6%E5%8E%86%E5%85%A5%E6%88%B7&region=440100) |
| | 7 | GZ-RS-RCBT011 | 广州市新引进人才住房补贴与安家费申领 | 3天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%BA%BA%E6%89%8D%E8%A1%A5%E8%B4%B4&region=440100) |
| | 8 | GZ-GA-JZZ012 | 广东省居住证首次申领与电子居住证签注 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%B1%85%E4%BD%8F%E8%AF%81&region=440100) |
| | 9 | GZ-GA-XSE013 | 新生儿出生登记与随父/随母落户申报 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%96%B0%E7%94%9F%E5%84%BF%E5%87%BA%E7%94%9F%E7%99%BB%E8%AE%B0&region=440100) |
| **交通与车管** | 10 | GZ-JT-CPYH003 | 广州市中小客车个人增量指标摇号申请 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%B8%AD%E5%B0%8F%E5%AE%A2%E8%BD%A6%E6%8C%87%E6%A0%87&region=440100) |
| | 11 | GZ-JT-JNC014 | 节能车增量指标直接摇号申领 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%8A%82%E8%83%BD%E8%BD%A6%E6%8C%87%E6%A0%87&region=440100) |
| | 12 | GZ-GA-JSZ015 | 机动车驾驶证期满换证“警医邮”网办到家 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%A9%BE%E9%A9%B6%E8%AF%81%E6%9C%9F%E6%BB%A1%E6%8D%A2%E8%AF%81&region=440100) |
| | 13 | GZ-GA-CLNJ016 | 机动车免检车辆电子检验合格标志申领 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%85%8D%E6%A3%80%E6%A0%87%E5%BF%97&region=440100) |
| **出入境便民** | 14 | GZ-GA-GAQZ006 | 往来港澳通行证及团队旅游签注申领（全国通办） | 7天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%B8%AF%E6%BE%B3%E9%80%9A%E8%A1%8C%E8%AF%81&region=440100) |
| | 15 | GZ-GA-ZNJ017 | 赴港澳旅游再次签注（智能签注机立等可取） | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%B8%AF%E6%BE%B3%E7%AD%BE%E6%B3%A8&region=440100) |
| | 16 | GZ-GA-HZ018 | 中华人民共和国普通护照首次申领与加急 | 7天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%8A%A4%E7%85%A7&region=440100) |
| | 17 | GZ-GA-TW019 | 大陆居民往来台湾通行证及赴台签注申领 | 7天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%8F%B0%E6%B9%BE%E9%80%9A%E8%A1%8C%E8%AF%81&region=440100) |
| **医疗保障** | 18 | GZ-YB-LHJY005 | 灵活就业人员职工基本医疗保险参保登记 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%81%B5%E6%B4%BB%E5%B0%B1%E4%B8%9A%E5%8C%BB%E4%BF%9D&region=440100) |
| | 19 | GZ-YB-CXJM020 | 城乡居民基本医疗保险年度参保登记 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%9F%8E%E4%B9%A1%E5%B1%85%E6%B0%91%E5%8C%BB%E4%BF%9D&region=440100) |
| | 20 | GZ-YB-JTGJ021 | 职工医保个人账户家庭成员共济绑定 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%AE%B6%E5%BA%AD%E5%85%B1%E6%B5%8E&region=440100) |
| | 21 | GZ-YB-YDJY022 | 跨省异地就医直接结算联网备案 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%BC%82%E5%9C%B0%E5%B0%B1%E5%8C%BB%E5%A4%87%E6%A1%88&region=440100) |
| | 22 | GZ-YB-SYJT023 | 职工生育保险待遇申领与生育津贴核发 | 3天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%94%9F%E8%82%B2%E6%B4%A5%E8%B4%B4&region=440100) |
| **就业与社保** | 23 | GZ-RS-SYBX024 | 失业保险金与失业补助金按月申领 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%A4%B1%E4%B8%9A%E4%BF%9D%E9%99%A9%E9%87%91&region=440100) |
| | 24 | GZ-RS-JNBT025 | 职业技能提升补贴与职业技能等级证书奖补 | 3天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%8A%80%E8%83%BD%E6%8F%90%E5%8D%87%E8%A1%A5%E8%B4%B4&region=440100) |
| | 25 | GZ-RS-LHBT026 | 高校毕业生灵活就业社会保险补贴 | 2天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%81%B5%E6%B4%BB%E5%B0%B1%E4%B8%9A%E7%A4%BE%E4%BF%9D%E8%A1%A5%E8%B4%B4&region=440100) |
| **营商环境与创新** | 26 | GZ-SC-QYKB004 | 开办企业一网通办设立登记与免费发章 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%BC%81%E4%B8%9A%E5%BC%80%E5%8A%9E&region=440100) |
| | 27 | GZ-SC-GZQ027 | 个体工商户转型升级为企业（个转企）直接登记 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%B8%AA%E8%BD%AC%E4%BC%81&region=440100) |
| | 28 | GZ-SC-SPXK028 | 食品经营许可告知承诺制“证照联办” | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%A3%9F%E5%93%81%E7%BB%8F%E8%90%A5%E8%AE%B8%E5%8F%AF&region=440100) |
| | 29 | GZ-KJ-GXJS029 | 高新技术企业认定培育入库奖励补贴 | 5天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%AB%98%E6%96%B0%E6%8A%80%E6%9C%AF%E4%BC%81%E4%B8%9A&region=440100) |
| | 30 | GZ-SC-JYZX030 | 企业简易注销登记一网公告办结 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%AE%80%E6%98%93%E6%B3%A8%E9%94%80&region=440100) |
| **老龄与青年** | 31 | GZ-MZ-LNYD031 | 广州市老年人优待卡申领与长寿保健金发放 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%80%81%E5%B9%B4%E4%BA%BA%E4%BC%98%E5%BE%85%E5%8D%A1&region=440100) |
| | 32 | GZ-TW-QNYZ032 | 广州各区青年人才驿站免租住宿与人才公寓申请 | 1天 | [广东政务服务网直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%9D%92%E5%B9%B4%E9%A9%BF%E7%AB%99&region=440100) |

### 7.2 27 部广州市现行法定红头公文数据库

涵盖穗府办规〔2024〕6号、穗府规〔2023〕1号、穗府办规〔2023〕15号、穗市监规〔2024〕2号、穗医保规〔2023〕5号、国移发〔2023〕18号、穗公积金规〔2023〕5号、穗人社规字〔2023〕3号、穗府办规〔2022〕17号（生育保险）、穗府办规〔2023〕18号（高新技术企业奖补）、穗府办规〔2021〕8号（老年优待长寿金）等27部现行规章与规范性公文，全部支撑 RAG 向量切片与溯源。

---

## 8. 环境部署与运行调试指南

### 8.1 环境依赖与前置准备
1. 操作系统：Windows 10/11、Linux、macOS 均可；
2. 运行环境：**Java 17 LTS** 及以上；
3. 阿里云百炼 API Key：在 `application.properties` 中已预配置好 DashScope 密钥。

### 8.2 构建与强制 UTF-8 启动命令

```powershell
# 1. 切换到项目根目录
cd c:\Users\Lenovo\Desktop\实验项目\spring-ai-alibaba\spring-ai-alibaba

# 2. 执行 Maven 一键打包 (自动跳过单元测试)
.\mvnw.cmd clean package -DskipTests

# 3. 强制以 UTF-8 编码启动服务 (根除 Windows 下数据库中文字符集错乱，PowerShell 中需加引号)
java "-Dfile.encoding=UTF-8" -jar target\spring-ai-alibaba-0.0.1-SNAPSHOT.jar
```

### 8.3 控制台与端点核验
* **服务中枢与真实网站测试中心**：浏览器访问 `http://localhost:8080/`
* **H2 数据库管理控制台**：浏览器访问 `http://localhost:8080/h2-console`
  * JDBC URL: `jdbc:h2:file:./data/gz_gov_ai`
  * 用户名: `sa`，密码: 留空
* **油猴脚本一键分发端点**：`http://localhost:8080/gz_gov_ai_assistant.user.js`
* **健康检查 / 图谱测试**：`http://localhost:8080/api/v1/gov/chat/graph`

---
*版权所有 © 2026 广州市政策法规 AI 智能问答系统研发团队。遵循 Apache License 2.0 协议。*
