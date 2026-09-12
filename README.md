# 广州市政务服务与政策法规 AI 智能专窗
### 纯前端伴随式浏览器插件 (Tampermonkey / Web Embed) · 云端 Dual-Agent 协同驱动

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Pure%20Frontend%20Extension-brightgreen.svg" alt="Architecture">
  <img src="https://img.shields.io/badge/Dual--Agent-Cloud%20Engine%20(6001)-blue.svg" alt="Dual-Agent Engine">
  <img src="https://img.shields.io/badge/Browser-Tampermonkey%20%2F%20ScriptCat-orange.svg" alt="Tampermonkey">
  <img src="https://img.shields.io/badge/Style%20Isolation-Shadow%20DOM%20Closed-blueviolet.svg" alt="Shadow DOM">
  <img src="https://img.shields.io/badge/Stream-SSE%20Full%20Lifecycle-yellow.svg" alt="SSE Stream">
  <img src="https://img.shields.io/badge/Server%20Dependency-Zero%20(No%20Local%20Backend)-brightgreen.svg" alt="Zero Server">
</p>

---

## 一、 项目定位与分工协作

本项目为**广州市政务服务与政策法规 AI 智能专窗**的前端交付成果，专注于以**无感伴随式浏览器插件（Tampermonkey UserScript）**与**网页嵌入脚本（Web Embed）**的形式，赋能广州市各级政务门户网站，为市民与企业提供“查政策、办政务、找入口、解疑难”的一站式民生智能导办体验。

### 团队敏捷协同分工
* **前端研发（本项目仓库）**：
  - 负责纯前端浏览器扩展插件的架构设计与实现；
  - 1:1 复刻广州政务官方“叻仔”视觉体系与适老化字号无级缩放；
  - 采用 Web Component / Shadow DOM 技术实现样式与 DOM 物理隔离，确保零样式冲突挂载于任意官方政务网站；
  - 深度对接云端 Dual-Agent 引擎的 SSE 全生命周期事件流，实现打字机流式渲染、意图消除歧义交互、政策公文法定溯源及广东政务服务网直达导航。
* **云端后端与知识库研发（团队协同）**：
  - 部署于云端高性能服务器（`http://149.118.133.163:6001`）；
  - 负责双智能体协同架构（导办 Agent + 政策 Agent）、Milvus 向量数据库与知识切片检索、大模型推理及 SSE 事件流下发。

---

## 二、 核心特性与技术亮点

### 1. 零服务器依赖，即插即用
* 仓库全面去除过时的本地 Java/Spring Boot/Maven 及本地数据库依赖；
* 前端采用原生高兼容 JavaScript，纯静态分发，无需配置任何本地运行环境或开启本地后端服务。

### 2. 真实政务网站物理隔离无感挂载 (Shadow DOM)
* 挂载在**广州市人民政府门户网（`gz.gov.cn`）**、**广东政务服务网广州分厅（`gdzwfw.gov.cn`）**等真实站点时，采用 `attachShadow({ mode: 'open' })` 构建私有渲染上下文；
* 彻底隔离宿主网站与助手浮窗之间的 CSS 样式，杜绝外部样式库对界面的干扰。

### 3. 广州政务官方“叻仔”原生视觉与适老化关怀
* **官方数字人形象**：集成广州政务官方 IP“叻仔”专属标识、政务专员头衔与天蓝微光渐变网格底纹；
* **适老化无障碍字号**：集成“大 | 中 | 小”字号无级切换，满足长辈长者清晰大字阅读需求；
* **高频主题轮播与快速提问**：覆盖身份证、居住证、港澳签注、公积金、医保、创业补贴等高频民生事项，点击自动清空输入框并即刻发起查询。

### 4. 深度对接云端 Dual-Agent 全生命周期 SSE
前端完整解析后端同学下发的所有 SSE 事件类型：
| 事件名 | 前端响应与呈现逻辑 |
| :--- | :--- |
| `session` | 绑定并持久化服务端会话 `sessionId` |
| `progress` | 顶部状态栏呈现“政策库切片检索中 / 办事逻辑规整中...”实时进度反馈 |
| `route` | 动态识别路由分支：政务导办路线 / 政策法规解读路线 |
| `ambiguity` | **智能消除歧义**：当市民诉求存在多种细分场景（如港澳个人旅游/团队旅游、公积金租房提取/还贷提取）时，动态生成场景选择按钮，点击即可直达精准分支并清空输入框残留 |
| `matched_item` | 智能展示识别命中的广州政务高频办事事项与实施编码 |
| `references` | 渲染法条溯源卡片，严格展示《广州市住房公积金提取管理办法》`穗公积金规字〔2023〕1号` 等法定发文字号，点击展开查验原文 |
| `chunk` | 高性能打字机流式字符渲染，支持自然 Markdown 智能排版 |
| `done` | 交互闭环，解锁输入状态，附带“广东政务服务网具体事项直达入口” |
| `error` | 优雅故障降级，友好提示重试并引导拨打 12345 政务服务便民热线 |

---

## 三、 仓库核心文件清单

```text
├── gz_gov_ai_assistant.user.js   # 【核心】Tampermonkey 油猴用户脚本（全网政务站点自动挂载）
├── gz_assistant_embed.js         # 【核心】网页嵌入集成脚本（任意网页通过 script 标签一行加载）
├── api_integration.md            # 【规范】云端 Dual-Agent 接口集成规范文档
└── README.md                     # 【文档】项目综合说明文档
```

---

## 四、 快速使用指南

### 油猴插件挂载运行（覆盖真实官方政务网站）
1. 在 Chrome / Edge / Firefox 浏览器安装 **Tampermonkey（油猴）** 扩展；
2. 在浏览器中打开本仓库的 `gz_gov_ai_assistant.user.js`，油猴插件将自动识别并弹出安装界面，点击**“安装”**；
3. 打开真实官方政务网站直接测试体验：
   - 广州市人民政府门户网：[https://www.gz.gov.cn/](https://www.gz.gov.cn/)
   - 广东政务服务网广州分厅：[https://www.gdzwfw.gov.cn/?region=440100](https://www.gdzwfw.gov.cn/?region=440100)
4. 页面右下角将自动唤起**广州政务 AI 智能专窗**，点击展开即可与云端双智能体展开交互。

---

## 五、 云端接口通信契约

* **云端基地址**：`http://149.118.133.163:6001`
* **流式接口**：`POST /api/chat/stream`
* **请求头**：
  - `Content-Type: application/json`
  - `Authorization: Bearer gov-rag-sec-2026-auth-token`
* **请求体**：
  ```json
  {
    "query": "如何在广州办理港澳通行证签注？",
    "sessionId": "optional-session-id"
  }
  ```
* 详细契约请参阅 [api_integration.md](./api_integration.md)。

---

## 六、 许可与致谢

本项目遵循 Apache 2.0 开源许可。政务政策法规与办事数据来源于广州市人民政府及广东政务服务网公开渠道。
