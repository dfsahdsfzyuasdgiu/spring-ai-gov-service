# 🏛️ 广州市政务服务与政策法规 AI 智能专窗
> 纯前端伴随式政务智能问答插件 · 直连云端 Dual-Agent 双智能体协同系统

<p align="center">
  <img src="https://img.shields.io/badge/Version-3.8.0-brightgreen.svg" alt="Version">
  <img src="https://img.shields.io/badge/Type-Pure%20Frontend%20Script-blue.svg" alt="Frontend">
  <img src="https://img.shields.io/badge/Style%20Isolation-Shadow%20DOM-blueviolet.svg" alt="Shadow DOM">
  <img src="https://img.shields.io/badge/Cloud%20Engine-149.118.133.163:6001-orange.svg" alt="Cloud Engine">
</p>

---

## 📖 项目简介

本项目为广州市政务服务与政策法规 AI 助手的前端实现，以**油猴脚本（Tampermonkey UserScript）**与**网页嵌入脚本（Embed Script）**方式运行。无需部署任何本地后端，挂载在官方政务网站（如广州市人民政府网、广东政务服务网）即可为市民提供智能政策咨询、事项导办与在线申报直达。

---

## 🚀 快速上手

### 1. 安装与使用
1. 安装浏览器扩展：[Tampermonkey（油猴）](https://www.tampermonkey.net/)；
2. 打开油猴管理面板，点击 **「添加新脚本」**；
3. 打开本项目中的 [`gz_gov_ai_assistant.user.js`](./gz_gov_ai_assistant.user.js)，**全选复制全部内容**并粘贴保存（Ctrl+S）；
4. 访问 [广州市人民政府门户网](https://www.gz.gov.cn/)，点击右下角常驻的**「叻仔 · 政策问答」**徽标即可开启问答。

> **提示**：首次连接若油猴弹出跨域权限提示，请选择**「总是允许此域名」**。

---

## ✨ 核心特性

- **静默待命模式**：进站默认收起大窗口，仅右下角悬浮徽标待命，不打扰正常浏览，点击主动唤起；
- **智能 Markdown 渲染**：自动将模型输出解析为政务蓝白自适应表格、层级小节标题、要点清单与流程指示符；
- **一键直达申报按钮**：将“进入申办 / 在线办理”等链接自动渲染为高对比度直达胶囊按钮，点击直接在新标签页打开申报入口；
- **滚轮横向滑动**：鼠标放置在顶部的「提问记录」或底部的「推荐主题」上，直接上下滚动滚轮即可水平平滑浏览词条；
- **历史跳转与一键重置**：点击历史标签平滑跳转并高亮定位；点击右上角 🔄 按钮一键彻底清空对话记录与本地缓存；
- **物理隔离与跨域穿透**：基于 Shadow DOM 彻底隔离样式，利用 `GM_xmlhttpRequest` 穿透 HTTPS 混合内容限制直连云端。

---

## 📂 项目结构

```text
├── gz_gov_ai_assistant.user.js   # 【核心】Tampermonkey 油猴用户脚本（全网政务站点挂载）
├── gz_assistant_embed.js         # 【核心】网页嵌入集成脚本（普通网页 script 标签引入）
├── DEVELOPMENT.md                # 【核心】开发文档：通信协议、真流式打字机与排错指南
├── backend_architecture_guide.md # 【参考】后端架构设计、微服务拓扑与答辩全景指南
└── README.md                     # 【说明】项目使用说明文档
```

---

## 🌐 云端接口配置

- **云端服务**：`http://149.118.133.163:6001`
- **流式接口**：`POST /api/chat/stream`
- **鉴权口令**：`Bearer gov-rag-sec-2026-auth-token`
- **健康检查**：`GET http://149.118.133.163:6001/api/health`

---

## 📄 开源协议

本项目采用 Apache 2.0 开源协议。
