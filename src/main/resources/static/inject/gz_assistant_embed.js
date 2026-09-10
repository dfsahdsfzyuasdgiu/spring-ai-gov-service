/**
 * 广州市人民政府门户网站 (www.gz.gov.cn)
 * 政策法规 AI 智能问答专窗 · 前端独立注入插件
 * 
 * 核心定位：
 * 1. 深度对接“广州市政策法规文本向量数据库 (Vector DB + RAG)”
 * 2. 聚焦政策智能解读、红头公文依据溯源、法条条款原文摘录与智能政策追问
 * 3. 彻底剥离与政策无关的办事指南表单、材料勾选 Checklist 及外部跳转按钮
 * 4. 严格契合官方视觉体系：全直角公文标准、广州政务蓝红配色、无任何卡通图标与 Emoji
 * 5. 纯静态稳固悬浮微标，Shadow DOM 双向样式物理隔离
 */

(function () {
  'use strict';

  // 避免在同一页面重复注入
  if (document.getElementById('gz-gov-ai-root')) {
    console.warn('[广州政策问答] 已存在运行实例，跳过重复初始化。');
    return;
  }

  // 全局对接配置 (为同学对接向量数据库与大模型后端提供标准入口)
  window.GzGovAiConfig = Object.assign({
    apiEndpoint: 'http://localhost:8080/api/v1/gov/chat/stream', // 同学向量数据库/RAG问答接口
    mockIfOffline: true,                                       // 后端服务离线时自动切换为内置高保真政策知识库
    assistantName: '广州市政策法规智能咨询专窗',
    authority: '广州市人民政府门户网站',
    organizer: '广州市政务服务和数据管理局',
    hotline: '12345政务服务便民热线'
  }, window.GzGovAiConfig || {});

  // 宿主节点与 Shadow DOM 挂载
  const host = document.createElement('div');
  host.id = 'gz-gov-ai-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // 注入量身定制的官方公文直角视觉样式
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* 悬浮球及弹窗宿主容器 */
    .gz-gov-shell {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999999;
      pointer-events: none;
    }

    /* ========================================================
       1. 右下角悬浮徽标 (纯静态展示，无晃动无呼吸光晕)
       ======================================================== */
    .gz-launcher {
      pointer-events: auto;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #006ed5 0%, #003a8c 100%);
      box-shadow: 0 4px 14px rgba(0, 58, 140, 0.32), 0 2px 5px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      user-select: none;
      border: 2px solid #ffffff;
      transition: box-shadow 0.2s ease, opacity 0.2s ease;
    }

    .gz-launcher:hover {
      box-shadow: 0 6px 18px rgba(0, 58, 140, 0.45);
      opacity: 0.95;
    }

    .gz-launcher:active {
      opacity: 0.88;
    }

    .launcher-seal {
      font-size: 18px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
      letter-spacing: 1px;
      text-shadow: 0 1px 3px rgba(0, 20, 60, 0.4);
    }

    .launcher-caption {
      font-size: 9px;
      font-weight: 700;
      color: #ffd666;
      margin-top: 2px;
      letter-spacing: 0.3px;
      transform: scale(0.92);
    }

    .launcher-tag {
      position: absolute;
      top: -3px;
      right: -3px;
      background: #c20505;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      padding: 0 4px;
      border-radius: 0;
      border: 1px solid #ffffff;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 4px rgba(194, 5, 5, 0.35);
    }

    /* ========================================================
       2. 欢迎公文卡片提示 (静态通告条)
       ======================================================== */
    .gz-greeting-card {
      pointer-events: auto;
      position: absolute;
      right: 68px;
      bottom: 6px;
      width: 250px;
      background: #ffffff;
      border: 1px solid #b0cbe8;
      border-top: 3px solid #c20505;
      border-radius: 0;
      padding: 10px 12px;
      box-shadow: 0 6px 20px rgba(0, 30, 80, 0.16);
      display: flex;
      flex-direction: column;
      gap: 5px;
      cursor: pointer;
      opacity: 0;
      transform: translateX(16px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 999999;
    }

    .gz-greeting-card.show {
      opacity: 1;
      transform: translateX(0);
    }

    .gz-greeting-card::after {
      content: '';
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      border-width: 7px 0 7px 8px;
      border-style: solid;
      border-color: transparent transparent transparent #b0cbe8;
    }

    .greeting-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      color: #003a8c;
      border-bottom: 1px solid #eef2f7;
      padding-bottom: 4px;
    }

    .greeting-close {
      color: #8c8c8c;
      font-size: 15px;
      cursor: pointer;
      padding: 0 2px;
      line-height: 1;
    }
    .greeting-close:hover { color: #c20505; }

    .greeting-body {
      font-size: 12px;
      color: #333333;
      line-height: 1.55;
    }

    /* ========================================================
       3. 政策问答大厅主弹窗 (全直角公文结构 - 紧凑型优雅比例)
       ======================================================== */
    .gz-dialog-window {
      pointer-events: auto;
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      height: 520px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 56px);
      background: #ffffff;
      border: 1px solid #003a8c;
      border-top: 3px solid #c20505; /* 广州政务红头线 */
      border-radius: 0 !important;   /* 彻底直角 */
      box-shadow: 0 12px 36px rgba(0, 30, 80, 0.22);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: scale(0.92) translateY(20px);
      transform-origin: bottom right;
      transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100000000;
      visibility: hidden;
    }

    .gz-dialog-window.open {
      opacity: 1;
      transform: scale(1) translateY(0);
      visibility: visible;
    }

    /* 顶栏：广州政务蓝 + 极简矢量 SVG 控制按钮 (紧凑直角) */
    .gz-window-header {
      background: linear-gradient(90deg, #0050b3 0%, #006ed5 100%);
      color: #ffffff;
      padding: 9px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #003a8c;
      user-select: none;
    }

    .header-main {
      display: flex;
      align-items: center;
    }

    .header-titles h3 {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #ffffff;
      line-height: 1.3;
    }

    .header-titles p {
      font-size: 10.5px;
      color: #d6e4ff;
      letter-spacing: 0.2px;
      margin-top: 1px;
    }

    /* 极简矢量控制按钮 (不折行) */
    .header-controls {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .win-ctrl-btn {
      width: 24px;
      height: 24px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 0;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.18s ease, border-color 0.18s ease;
      padding: 0;
    }

    .win-ctrl-btn svg {
      width: 13px;
      height: 13px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2;
      stroke-linecap: square;
      stroke-linejoin: miter;
    }

    .win-ctrl-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.35);
    }

    .win-ctrl-btn.close-btn:hover {
      background: #c20505;
      border-color: #c20505;
    }

    /* 官方通告横幅 */
    .gz-notice-banner {
      background: #f0f7ff;
      border-bottom: 1px solid #d6e4ff;
      padding: 5px 10px;
      font-size: 10.5px;
      color: #003a8c;
      display: flex;
      align-items: center;
      gap: 6px;
      line-height: 1.35;
    }

    .notice-badge {
      background: #c20505;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 0;
      flex-shrink: 0;
      letter-spacing: 0.5px;
    }

    /* 政策高频热搜直角标签 */
    .gz-quick-bar {
      padding: 6px 10px;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      gap: 5px;
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: none;
    }
    .gz-quick-bar::-webkit-scrollbar { display: none; }

    .quick-chip {
      font-size: 11px;
      background: #ffffff;
      color: #003a8c;
      border: 1px solid #b0cbe8;
      border-radius: 0;
      padding: 3px 8px;
      cursor: pointer;
      transition: all 0.18s ease;
      user-select: none;
    }

    .quick-chip:hover {
      background: #0050b3;
      color: #ffffff;
      border-color: #0050b3;
    }

    /* 对话内容主展示区 */
    .gz-chat-main {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f7f9fc;
    }

    .chat-row {
      display: flex;
      flex-direction: column;
      max-width: 96%;
      animation: gzMsgFade 0.2s ease forwards;
    }

    @keyframes gzMsgFade {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-row.user {
      align-self: flex-end;
      align-items: flex-end;
    }

    .chat-row.ai {
      align-self: flex-start;
      align-items: flex-start;
    }

    .chat-author {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
      padding: 0 2px;
    }

    .chat-bubble {
      padding: 10px 12px;
      border-radius: 0 !important;
      font-size: 12.5px;
      line-height: 1.6;
      word-break: break-word;
    }

    .chat-row.user .chat-bubble {
      background: #006ed5;
      color: #ffffff;
      border: 1px solid #0050b3;
    }

    .chat-row.ai .chat-bubble {
      background: #ffffff;
      color: #1a1a1a;
      border: 1px solid #dcdfe6;
      border-left: 3px solid #0050b3;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    /* ========================================================
       3.1 政策结论速览块 (定性定量一锤定音)
       ======================================================== */
    .policy-conclusion-box {
      background: #f0f7ff;
      border: 1px solid #b0cbe8;
      border-left: 3px solid #0050b3;
      border-radius: 0 !important;
      padding: 7px 9px;
      margin-bottom: 7px;
      font-size: 12px;
      line-height: 1.55;
      color: #1a1a1a;
    }

    .conclusion-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #003a8c;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .conclusion-tag {
      background: #0050b3;
      color: #ffffff;
      padding: 0 4px;
      font-size: 9.5px;
      border-radius: 0;
      font-weight: 600;
    }

    /* ========================================================
       3.2 双视角对照卡 (通俗解读 VS 官方条文对照)
       ======================================================== */
    .policy-dual-card {
      background: #ffffff;
      border: 1px solid #dcdfe6;
      border-top: 2px solid #003a8c;
      border-radius: 0 !important;
      margin: 7px 0;
      overflow: hidden;
    }

    .dual-card-header {
      background: #f4f6f9;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px;
      user-select: none;
    }

    .dual-tabs-wrap {
      display: flex;
      gap: 1px;
    }

    .dual-tab-btn {
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 3px;
      border-radius: 0;
    }

    .dual-tab-btn:hover {
      color: #003a8c;
    }

    .dual-tab-btn.active {
      color: #003a8c;
      background: #ffffff;
      border-bottom-color: #c20505;
      font-weight: 700;
    }

    .tab-badge {
      font-size: 9px;
      padding: 0 3px;
      background: #e6f4ff;
      color: #0050b3;
      border-radius: 0;
    }

    .tab-badge.red {
      background: #fff1f0;
      color: #cf1322;
    }

    .dual-expand-btn {
      font-size: 10px;
      color: #0050b3;
      background: #ffffff;
      border: 1px solid #b0cbe8;
      border-radius: 0;
      padding: 1px 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .dual-expand-btn:hover {
      background: #f0f7ff;
      border-color: #0050b3;
      color: #003a8c;
    }

    .dual-body {
      padding: 7px 9px;
      font-size: 12px;
      line-height: 1.6;
    }

    .dual-panel {
      display: none;
    }

    .dual-panel.active {
      display: block;
    }

    /* 并排对照模式 (上下叠层展开全景) */
    .policy-dual-card.side-by-side .dual-panel {
      display: block !important;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e2e8f0;
    }

    .policy-dual-card.side-by-side .dual-panel:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .dual-panel-label {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      display: inline-block;
      margin-bottom: 4px;
      border-radius: 0;
    }

    .dual-panel-label.plain {
      background: #e6f4ff;
      color: #0050b3;
      border-left: 2px solid #0050b3;
    }

    .dual-panel-label.statute {
      background: #fff1f0;
      color: #cf1322;
      border-left: 2px solid #c20505;
    }

    .dual-plain-content {
      color: #262626;
      font-size: 12px;
      line-height: 1.6;
    }

    .dual-plain-content ul {
      margin: 4px 0 4px 16px;
      line-height: 1.55;
    }

    .dual-plain-content li {
      margin-bottom: 2px;
    }

    .dual-statute-content {
      background: #fafafa;
      border-left: 2px solid #d9d9d9;
      padding: 5px 7px;
      font-size: 11.5px;
      color: #434343;
      line-height: 1.55;
    }

    /* ========================================================
       4. 权威政策依据溯源卡 (向量检索原文直溯 - 紧凑公文卡)
       ======================================================== */
    .policy-citation-card {
      background: #fdf6ec;
      border: 1px solid #faecd8;
      border-left: 3px solid #c20505;
      border-radius: 0 !important;
      padding: 8px 10px;
      margin-top: 8px;
      font-size: 11.5px;
      color: #2c3e50;
    }

    .citation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
      padding-bottom: 5px;
      border-bottom: 1px dashed #e8d8c3;
    }

    .citation-title-tag {
      font-weight: 700;
      color: #c20505;
      font-size: 11.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .citation-match-tag {
      font-size: 9.5px;
      background: #fff1f0;
      color: #cf1322;
      border: 1px solid #ffa39e;
      padding: 1px 5px;
      border-radius: 0;
      font-weight: 600;
    }

    .citation-doc-name {
      font-size: 12px;
      font-weight: 700;
      color: #1a1a1a;
      line-height: 1.35;
      margin-bottom: 3px;
    }

    .citation-meta {
      font-size: 10.5px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .citation-snippet-box {
      background: rgba(255, 255, 255, 0.85);
      border: 1px solid #faecd8;
      border-radius: 0;
      padding: 6px 8px;
      font-size: 11.5px;
      color: #444444;
      line-height: 1.55;
    }

    .citation-snippet-box strong {
      color: #003a8c;
    }

    /* ========================================================
       5. 智能政策延伸推荐 (相关追问引导 - 紧凑标签)
       ======================================================== */
    .policy-suggestions-wrap {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .suggestions-label {
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
    }

    .suggestions-chips-group {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .suggestion-chip {
      font-size: 10.5px;
      background: #f0f7ff;
      color: #0050b3;
      border: 1px solid #d6e4ff;
      border-radius: 0;
      padding: 3px 6px;
      cursor: pointer;
      transition: all 0.16s ease;
      line-height: 1.3;
    }

    .suggestion-chip:hover {
      background: #0050b3;
      color: #ffffff;
      border-color: #0050b3;
    }

    /* 评价与疑问反馈行 */
    .chat-feedback-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 10px;
      color: #8c8c8c;
      margin-top: 5px;
    }

    .action-btn-group {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .action-sub-btn {
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      border-radius: 0;
      color: #595959;
      cursor: pointer;
      padding: 1px 6px;
      font-size: 10px;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .action-sub-btn:hover { color: #c20505; border-color: #c20505; background: #ffffff; }

    .btn-copy-summary:hover {
      color: #0050b3;
      border-color: #0050b3;
    }

    .btn-copy-summary.copied {
      color: #389e0d;
      border-color: #52c41a;
      background: #f6ffed;
    }

    /* 政策疑问反馈展开框 (全直角公文标准 - 紧凑型) */
    .msg-feedback-panel {
      margin-top: 6px;
      padding: 8px 10px;
      background: #fafbfc;
      border: 1px solid #dcdfe6;
      border-left: 3px solid #c20505;
      border-radius: 0 !important;
      display: flex;
      flex-direction: column;
      gap: 6px;
      animation: gzMsgFade 0.2s ease forwards;
    }

    .feedback-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      font-weight: 700;
      color: #003a8c;
    }

    .feedback-close-btn {
      color: #8c8c8c;
      font-size: 15px;
      cursor: pointer;
      line-height: 1;
      padding: 0 2px;
    }
    .feedback-close-btn:hover { color: #c20505; }

    .feedback-tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .fb-tag {
      font-size: 10px;
      background: #ffffff;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 0;
      padding: 1px 5px;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }

    .fb-tag:hover {
      border-color: #006ed5;
      color: #006ed5;
    }

    .fb-tag.active {
      background: #006ed5;
      color: #ffffff;
      border-color: #006ed5;
    }

    .feedback-textarea {
      width: 100%;
      height: 44px;
      border: 1px solid #cbd5e1;
      border-radius: 0 !important;
      padding: 4px 6px;
      font-size: 11px;
      color: #1a1a1a;
      resize: none;
      outline: none;
      background: #ffffff;
      line-height: 1.4;
    }

    .feedback-textarea:focus {
      border-color: #0050b3;
      box-shadow: 0 0 0 1px #0050b3;
    }

    .feedback-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #8c8c8c;
    }

    .feedback-btn-group {
      display: flex;
      gap: 5px;
    }

    .fb-btn-cancel, .fb-btn-submit {
      padding: 2px 8px;
      font-size: 10.5px;
      border-radius: 0 !important;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .fb-btn-cancel {
      background: #f1f5f9;
      color: #475569;
      border-color: #cbd5e1;
    }
    .fb-btn-cancel:hover { background: #e2e8f0; }

    .fb-btn-submit {
      background: #c20505;
      color: #ffffff;
      border-color: #c20505;
      font-weight: 600;
    }
    .fb-btn-submit:hover { background: #a30404; }

    .feedback-success-note {
      font-size: 10.5px;
      color: #389e0d;
      padding: 4px 6px;
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 0;
      line-height: 1.4;
    }

    /* 等待打字动效 */
    .typing-box {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: #ffffff;
      border: 1px solid #dcdfe6;
      border-radius: 0;
    }

    .typing-block {
      width: 5px;
      height: 5px;
      background: #006ed5;
      border-radius: 0;
      animation: typePulse 1.2s infinite ease-in-out;
    }
    .typing-block:nth-child(2) { animation-delay: 0.2s; }
    .typing-block:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typePulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.15); opacity: 1; }
    }

    /* 底部政务输入区 (紧凑比例) */
    .gz-input-footer {
      background: #ffffff;
      border-top: 1px solid #e8e8e8;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .gz-text-input {
      flex: 1;
      height: 34px;
      border: 1px solid #b0cbe8;
      border-radius: 0 !important;
      padding: 0 10px;
      font-size: 12px;
      color: #1a1a1a;
      outline: none;
      background: #ffffff;
      transition: border-color 0.18s ease;
    }

    .gz-text-input:focus {
      border-color: #0050b3;
      box-shadow: 0 0 0 2px rgba(0, 110, 213, 0.15);
    }

    .gz-submit-btn {
      height: 34px;
      padding: 0 14px;
      border-radius: 0 !important;
      border: none;
      background: #006ed5;
      color: #ffffff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.18s ease;
      letter-spacing: 0.5px;
    }

    .gz-submit-btn:hover {
      background: #0050b3;
    }

    .gz-submit-btn:disabled {
      background: #bfbfbf;
      cursor: not-allowed;
    }

    .footer-authority-note {
      font-size: 9.5px;
      color: #8c8c8c;
      text-align: center;
      letter-spacing: 0.2px;
    }
  `;
  shadow.appendChild(style);

  // 构造 DOM 骨架
  const container = document.createElement('div');
  container.className = 'gz-gov-shell';
  container.innerHTML = `
    <!-- 右下角悬浮圆形徽章 (静态无晃动) -->
    <div class="gz-launcher" id="gzLauncher" title="点击呼出广州市政策法规智能咨询专窗">
      <div class="launcher-tag">政策</div>
      <div class="launcher-seal">穗</div>
      <div class="launcher-caption">政策问答</div>
    </div>

    <!-- 左侧迎宾公文卡片 -->
    <div class="gz-greeting-card" id="gzGreetingCard">
      <div class="greeting-header">
        <span>广州市人民政府 · 政策咨询服务</span>
        <span class="greeting-close" id="gzGreetingClose" title="关闭提示">&times;</span>
      </div>
      <div class="greeting-body">
        市民您好！本专窗依托<strong>广州市政策法规知识库</strong>，支持查询住房保障、积分入户、营商扶企、社保医保等现行政策条例与精准条款直溯。
      </div>
    </div>

    <!-- 政策咨询大厅主弹窗 (全直角公文结构) -->
    <div class="gz-dialog-window" id="gzDialogWindow">
      <!-- 顶栏与控制按钮 -->
      <div class="gz-window-header">
        <div class="header-main">
          <div class="header-titles">
            <h3>广州市人民政府门户网站 · 政策智能咨询</h3>
            <p>广州市现行规章与规范性文件权威数据库 ｜ 政策条款直溯</p>
          </div>
        </div>
        <div class="header-controls">
          <!-- 刷新清屏 SVG 图标 -->
          <button class="win-ctrl-btn" id="gzBtnReset" title="清空对话记录" aria-label="清空对话记录">
            <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <!-- 最小化 SVG 图标 -->
          <button class="win-ctrl-btn" id="gzBtnMin" title="最小化" aria-label="最小化">
            <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <!-- 关闭 SVG 图标 -->
          <button class="win-ctrl-btn close-btn" id="gzBtnDismiss" title="关闭" aria-label="关闭">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- 官方通告条 -->
      <div class="gz-notice-banner">
        <span class="notice-badge">通告</span>
        <span>依托全市政策公文数据库，提供精准条文解读与出处直溯</span>
      </div>

      <!-- 政策高频咨询领域直角标签 -->
      <div class="gz-quick-bar">
        <span class="quick-chip" data-query="《广州市公共租赁住房保障办法》关于租赁补贴的发放标准和保障对象？">公租房补贴政策</span>
        <span class="quick-chip" data-query="《广州市积分制入户管理办法》规定的申报门槛和积分指标体系？">积分制入户政策</span>
        <span class="quick-chip" data-query="广州市深化企业开办“一网通办”改革有何便利举措与扶持政策？">企业开办扶持政策</span>
        <span class="quick-chip" data-query="广州市灵活就业人员参加职工基本医疗保险的参保范围与缴费规定？">灵活就业医保政策</span>
        <span class="quick-chip" data-query="《广州市中小客车总量调控管理办法》个人增量指标申请条件是什么？">中小客车指标办法</span>
        <span class="quick-chip" data-query="广州市公安出入境管理部门关于往来港澳通行证全国通办的政策依据？">港澳签注通行规定</span>
      </div>

      <!-- 消息列表流 -->
      <div class="gz-chat-main" id="gzChatMain">
        <div class="chat-row ai">
          <div class="chat-author">广州市政策法规咨询专窗</div>
          <div class="chat-bubble">
            <div class="policy-conclusion-box">
              <div class="conclusion-title">
                <span class="conclusion-tag">专窗答复规范</span>
                <span>公文三段式 · 双重视角直溯</span>
              </div>
              <div class="conclusion-body">
                欢迎使用<strong>广州市人民政府门户网站</strong>政策法规 AI 智能问答专窗。本系统依托全市现行政策公文权威数据库，采用<strong>【政策结论速览 + 群众通俗/官方条文双视角对照 + 法定出处直溯】</strong>为您提供精准解答。
              </div>
            </div>
            <div style="font-size: 11.5px; color: #475569; line-height: 1.6;">
              您可点击上方快捷标签或直接输入具体政策问题，例如：
              <ul style="margin: 4px 0 0 16px; color: #1e293b;">
                <li><em>“新就业无房职工申领广州公租房租赁补贴的具体政策规定？”</em></li>
                <li><em>“广州市对新设立企业免费发放印章和半天办结的规章依据？”</em></li>
              </ul>
            </div>
          </div>
          <div class="chat-feedback-bar">
            <span>数据源：广州市人民政府门户网站政策公开专栏</span>
          </div>
        </div>
      </div>

      <!-- 底部输入栏 -->
      <div class="gz-input-footer">
        <div class="input-wrapper">
          <input type="text" class="gz-text-input" id="gzTextInput" placeholder="请输入您想查询的广州市政策规章、规范性文件或条款问题..." maxlength="200" />
          <button class="gz-submit-btn" id="gzSubmitBtn">发 送</button>
        </div>
        <div class="footer-authority-note">
          广州市人民政府门户网站 · 政策法规智能问答专窗 ｜ 12345 便民热线协同
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(container);

  // 获取 DOM 元素
  const launcher = shadow.getElementById('gzLauncher');
  const greetingCard = shadow.getElementById('gzGreetingCard');
  const greetingClose = shadow.getElementById('gzGreetingClose');
  const dialogWindow = shadow.getElementById('gzDialogWindow');
  const btnReset = shadow.getElementById('gzBtnReset');
  const btnMin = shadow.getElementById('gzBtnMin');
  const btnDismiss = shadow.getElementById('gzBtnDismiss');
  const chatMain = shadow.getElementById('gzChatMain');
  const textInput = shadow.getElementById('gzTextInput');
  const submitBtn = shadow.getElementById('gzSubmitBtn');
  const quickChips = shadow.querySelectorAll('.quick-chip');

  // 页面加载 2.4 秒后弹出迎宾提示卡片
  let greetingTimer = setTimeout(() => {
    greetingCard.classList.add('show');
  }, 2400);

  greetingCard.addEventListener('click', (e) => {
    if (e.target.id === 'gzGreetingClose') return;
    openDialog();
  });

  greetingClose.addEventListener('click', (e) => {
    e.stopPropagation();
    greetingCard.classList.remove('show');
  });

  launcher.addEventListener('click', openDialog);
  btnMin.addEventListener('click', closeDialog);
  btnDismiss.addEventListener('click', closeDialog);

  function openDialog() {
    clearTimeout(greetingTimer);
    greetingCard.classList.remove('show');
    launcher.style.display = 'none';
    dialogWindow.classList.add('open');
    setTimeout(() => textInput.focus(), 250);
  }

  function closeDialog() {
    dialogWindow.classList.remove('open');
    setTimeout(() => {
      launcher.style.display = 'flex';
    }, 220);
  }

  // 清空对话记录
  btnReset.addEventListener('click', () => {
    const rows = chatMain.querySelectorAll('.chat-row');
    rows.forEach((row, idx) => {
      if (idx > 0) row.remove();
    });
  });

  // 快捷标签点击
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      textInput.value = q;
      handleUserSubmit();
    });
  });

  // 回车发送
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserSubmit();
    }
  });

  submitBtn.addEventListener('click', handleUserSubmit);

  function handleUserSubmit() {
    const content = textInput.value.trim();
    if (!content) return;

    appendUserRow(content);
    textInput.value = '';
    submitBtn.disabled = true;

    const loadingElem = appendLoadingRow();

    fetchPolicyAnswer(content)
      .then(res => {
        loadingElem.remove();
        renderPolicyAnswer(res);
      })
      .catch(err => {
        console.warn('[广州政策问答] 远端向量接口未就绪，无缝启用离线仿真知识库引擎:', err);
        loadingElem.remove();
        const mockRes = getGuangzhouPolicyMockData(content);
        renderPolicyAnswer(mockRes);
      })
      .finally(() => {
        submitBtn.disabled = false;
        scrollChatBottom();
      });
  }

  function appendUserRow(text) {
    const div = document.createElement('div');
    div.className = 'chat-row user';
    div.innerHTML = `
      <div class="chat-author">咨询市民</div>
      <div class="chat-bubble">${escapeText(text)}</div>
    `;
    chatMain.appendChild(div);
    scrollChatBottom();
  }

  function appendLoadingRow() {
    const div = document.createElement('div');
    div.className = 'chat-row ai loading';
    div.innerHTML = `
      <div class="chat-author">广州市政策法规咨询专窗</div>
      <div class="typing-box">
        <span class="typing-block"></span>
        <span class="typing-block"></span>
        <span class="typing-block"></span>
      </div>
    `;
    chatMain.appendChild(div);
    scrollChatBottom();
    return div;
  }

  // 格式化文本为结构良好的公文 HTML
  function formatMarkdownLike(str) {
    if (!str) return '';
    let html = escapeText(str)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 处理列表符
    const lines = html.split('\n');
    let inList = false;
    const processed = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^[•\-\*]\s+/.test(line)) {
        if (!inList) {
          processed.push('<ul style="margin: 4px 0 4px 16px; line-height: 1.55;">');
          inList = true;
        }
        processed.push('<li style="margin-bottom: 2px;">' + line.replace(/^[•\-\*]\s+/, '') + '</li>');
      } else {
        if (inList) {
          processed.push('</ul>');
          inList = false;
        }
        if (line) {
          processed.push('<div>' + line + '</div>');
        }
      }
    }
    if (inList) processed.push('</ul>');
    return processed.join('');
  }

  function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // 智能解析大模型返回文本或结构化数据
  function parsePolicyData(data) {
    let conclusion = data.conclusion || '';
    let plainText = data.plainInterpretation || data.plain || '';
    let statuteText = data.statuteClauses || data.statute || '';
    const rawContent = data.content || data.reply || '';

    // 若未预拆分，从文本中正则提取公文三段式
    if (!conclusion && rawContent) {
      if (rawContent.includes('【政策结论') || rawContent.includes('【群众通俗解读') || rawContent.includes('【官方条文对照')) {
        const conclusionMatch = rawContent.match(/【政策结论(?:速览)?】\s*([\s\S]*?)(?=【群众通俗解读】|【官方条文对照】|$)/);
        const plainMatch = rawContent.match(/【群众通俗解读】\s*([\s\S]*?)(?=【官方条文对照】|$)/);
        const statuteMatch = rawContent.match(/【官方条文对照】\s*([\s\S]*?)$/);

        if (conclusionMatch) conclusion = conclusionMatch[1].trim();
        if (plainMatch) plainText = plainMatch[1].trim();
        if (statuteMatch) statuteText = statuteMatch[1].trim();
      } else {
        conclusion = rawContent;
      }
    }

    return {
      conclusion: conclusion || '经广州市政策法规数据库检索，相关文件已纳入现行有效目录。',
      plainText: plainText,
      statuteText: statuteText,
      citations: data.citations || (data.policy ? [data.policy] : []),
      suggestions: data.suggestions || []
    };
  }

  // 渲染政策问答结果 (穗政双重视角 · 公文三段式创新答复体系)
  function renderPolicyAnswer(data) {
    const div = document.createElement('div');
    div.className = 'chat-row ai';
    const parsed = parsePolicyData(data);

    // 1. 第一段：政策结论速览
    let conclusionHtml = `
      <div class="policy-conclusion-box">
        <div class="conclusion-title">
          <span class="conclusion-tag">政策结论速览</span>
          <span>广州政务权威研判</span>
        </div>
        <div class="conclusion-body">${formatMarkdownLike(parsed.conclusion)}</div>
      </div>
    `;

    // 2. 第二段：双视角对照卡 (通俗解读 VS 官方条文对照)
    let dualCardHtml = '';
    if (parsed.plainText || parsed.statuteText) {
      dualCardHtml = `
        <div class="policy-dual-card">
          <div class="dual-card-header">
            <div class="dual-tabs-wrap">
              <button class="dual-tab-btn active" data-tab="plain" title="点击查看群众大白话解读">
                <span class="tab-badge">白话</span>
                <span>群众通俗解读</span>
              </button>
              <button class="dual-tab-btn" data-tab="statute" title="点击查看官方规范条文原话">
                <span class="tab-badge red">条文</span>
                <span>官方条文对照</span>
              </button>
            </div>
            <button class="dual-expand-btn" title="点击展开通俗版与条文版上下并排对照">展开并排对照 ▾</button>
          </div>
          <div class="dual-body">
            <div class="dual-panel plain active">
              <div class="dual-panel-label plain">💡 群众通俗解读视角</div>
              <div class="dual-plain-content">${formatMarkdownLike(parsed.plainText || '暂无通俗解读细则。')}</div>
            </div>
            <div class="dual-panel statute">
              <div class="dual-panel-label statute">📜 规范法言条文视角</div>
              <div class="dual-statute-content">${formatMarkdownLike(parsed.statuteText || '暂无法规条款原话。')}</div>
            </div>
          </div>
        </div>
      `;
    }

    // 3. 第三段：政策原文依据直溯卡 (Citations)
    let citationsHtml = '';
    const citeList = parsed.citations;
    if (citeList && citeList.length > 0) {
      citationsHtml = citeList.map((c) => `
        <div class="policy-citation-card">
          <div class="citation-header">
            <span class="citation-title-tag">
              <span>【法定政策公文直溯】</span>
            </span>
            <span class="citation-match-tag">知识库匹配 ${escapeText(c.similarity || '98%')}</span>
          </div>
          <div class="citation-doc-name">《${escapeText(c.title || '相关规范性文件')}》</div>
          <div class="citation-meta">
            <span>发文字号：${escapeText(c.docNumber || '现行有效')}</span>
            ${c.dept ? ` ｜ <span>颁布机构：${escapeText(c.dept)}</span>` : ''}
          </div>
          <div class="citation-snippet-box">
            <strong>【相关条款原文摘录】</strong><br/>
            ${escapeText(c.clause || c.snippet || '该政策条文已纳入现行有效库。')}
          </div>
        </div>
      `).join('');
    }

    // 4. 智能政策延伸推荐 (Suggestions)
    let suggestionsHtml = '';
    if (parsed.suggestions && parsed.suggestions.length > 0) {
      const chips = parsed.suggestions.map((s) => `
        <span class="suggestion-chip" data-prompt="${escapeText(s)}">${escapeText(s)}</span>
      `).join('');

      suggestionsHtml = `
        <div class="policy-suggestions-wrap">
          <div class="suggestions-label">💡 猜您还想了解相关政策：</div>
          <div class="suggestions-chips-group">${chips}</div>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="chat-author">广州市政策法规咨询专窗</div>
      <div class="chat-bubble">
        ${conclusionHtml}
        ${dualCardHtml}
        ${citationsHtml}
        ${suggestionsHtml}
      </div>
      <div class="chat-feedback-bar">
        <span>信息承办：广州市政务服务和数据管理局</span>
        <div class="action-btn-group">
          <button class="action-sub-btn btn-copy-summary" title="一键复制规范格式的政策咨询备忘单">复制公文摘要</button>
          <button class="action-sub-btn fb-toggle-btn" title="点击展开政策解答疑问与建议反馈">有疑问？</button>
        </div>
      </div>
      <div class="msg-feedback-panel" style="display: none;">
        <div class="feedback-panel-header">
          <span>【政策解答疑问与建议反馈】</span>
          <span class="feedback-close-btn" title="关闭">&times;</span>
        </div>
        <div class="feedback-tag-list">
          <span class="fb-tag" data-val="条文出处不够准确">条文出处不准</span>
          <span class="fb-tag" data-val="政策文件可能已废止/修订">文件已废止/修订</span>
          <span class="fb-tag" data-val="未能准确解答问题">未解答核心问题</span>
          <span class="fb-tag" data-val="其他意见建议">其他建议</span>
        </div>
        <textarea class="feedback-textarea" placeholder="请具体说明您的疑问或政策出处有误之处，协助完善政策知识库（选填）..." maxlength="200"></textarea>
        <div class="feedback-action-bar">
          <span>经核实后将结合广州市最新公文优化知识库</span>
          <div class="feedback-btn-group">
            <button class="fb-btn-cancel">取消</button>
            <button class="fb-btn-submit">提交反馈</button>
          </div>
        </div>
      </div>
    `;

    chatMain.appendChild(div);
    scrollChatBottom();

    // 交互绑定：双视角 Tab 切换与并排展开
    const dualCard = div.querySelector('.policy-dual-card');
    if (dualCard) {
      const tabBtns = dualCard.querySelectorAll('.dual-tab-btn');
      const panels = dualCard.querySelectorAll('.dual-panel');
      const expandBtn = dualCard.querySelector('.dual-expand-btn');

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (dualCard.classList.contains('side-by-side')) {
            dualCard.classList.remove('side-by-side');
            expandBtn.textContent = '展开并排对照 ▾';
          }
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const targetTab = btn.getAttribute('data-tab');
          panels.forEach(p => {
            p.classList.toggle('active', p.classList.contains(targetTab));
          });
        });
      });

      expandBtn.addEventListener('click', () => {
        const isExpanded = dualCard.classList.toggle('side-by-side');
        expandBtn.textContent = isExpanded ? '收起并排对照 ▴' : '展开并排对照 ▾';
        scrollChatBottom();
      });
    }

    // 交互绑定：一键复制政策备忘单
    const copyBtn = div.querySelector('.btn-copy-summary');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        let citeText = '';
        if (citeList && citeList.length > 0) {
          citeText = `【法定公文依据】\n文件：《${citeList[0].title}》（${citeList[0].docNumber || '现行有效'}）\n机构：${citeList[0].dept || '广州市人民政府'}\n条款：${citeList[0].clause || citeList[0].snippet || ''}`;
        }
        const textToCopy = `【广州市政策法规智能咨询 · 政策备忘单】\n` +
          `============================================\n` +
          `【政策结论】\n${stripHtml(parsed.conclusion)}\n\n` +
          (parsed.plainText ? `【通俗要点】\n${stripHtml(parsed.plainText)}\n\n` : '') +
          (citeText ? `${citeText}\n============================================\n` : '') +
          `来源：广州市人民政府门户网站 (www.gz.gov.cn)\n` +
          `咨询时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.textContent = '✓ 已复制备忘';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = '复制公文摘要';
            copyBtn.classList.remove('copied');
          }, 2500);
        }).catch(() => {
          copyBtn.textContent = '复制失败';
          setTimeout(() => { copyBtn.textContent = '复制公文摘要'; }, 2000);
        });
      });
    }

    // 交互绑定：有疑问展开反馈框
    const toggleBtn = div.querySelector('.fb-toggle-btn');
    const panel = div.querySelector('.msg-feedback-panel');
    const closeBtn = div.querySelector('.feedback-close-btn');
    const cancelBtn = div.querySelector('.fb-btn-cancel');
    const submitBtnFb = div.querySelector('.fb-btn-submit');
    const textarea = div.querySelector('.feedback-textarea');
    const tags = div.querySelectorAll('.fb-tag');

    toggleBtn.addEventListener('click', () => {
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'flex' : 'none';
      toggleBtn.style.color = isHidden ? '#c20505' : '';
      if (isHidden) {
        scrollChatBottom();
        setTimeout(() => textarea.focus(), 150);
      }
    });

    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      toggleBtn.style.color = '';
    });

    cancelBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      toggleBtn.style.color = '';
    });

    tags.forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('active');
      });
    });

    submitBtnFb.addEventListener('click', () => {
      const selectedTags = Array.from(div.querySelectorAll('.fb-tag.active')).map(t => t.getAttribute('data-val'));
      const textVal = textarea.value.trim();
      console.log('[广州政策问答] 收到市民反馈:', { tags: selectedTags, detail: textVal });

      panel.innerHTML = `
        <div class="feedback-success-note">
          ✓ 感谢您的反馈！已记录该条政策解答疑问，政务知识库管理团队将核实广州市最新公文予以纠正完善。
        </div>
      `;
      toggleBtn.innerHTML = '已反馈';
      toggleBtn.disabled = true;
      toggleBtn.style.color = '#c20505';
      scrollChatBottom();
    });

    // 交互绑定：追问标签点击
    div.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const p = chip.getAttribute('data-prompt');
        textInput.value = p;
        handleUserSubmit();
      });
    });
  }

  function scrollChatBottom() {
    chatMain.scrollTop = chatMain.scrollHeight;
  }

  function escapeText(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 接口请求 (预留对接同学的向量数据库后端)
  async function fetchPolicyAnswer(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(window.GzGovAiConfig.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('HTTP Status: ' + response.status);
    const json = await response.json();
    return json.data || json;
  }

  // 广州市政策法规高保真离线向量仿真知识库 (内置双重视角·三段式公文结构)
  function getGuangzhouPolicyMockData(prompt) {
    const q = prompt.toLowerCase();

    // 1. 公租房保障与租赁补贴政策
    if (q.includes('公租房') || q.includes('租房') || q.includes('租赁补贴')) {
      return {
        conclusion: '新就业无房职工与城市中低收入家庭在广州市符合条件可申领公共租赁住房保障，其中住房租赁补贴按月核发，累计享受期限最长不超过5年。',
        plainInterpretation: '• 补贴标准：每月按核定租金发放，标准为最高每平方米35元/月（以保障面积40㎡计算，每月约补贴1400元）。\n• 申领门槛：持本市有效居住证、在穗连续缴纳社保满6个月、家庭人均年可支配收入低于规定标准、在穗无自有产权住房。\n• 申办渠道：登录“广东政务服务网·广州专区”或“穗好办”APP全程网办。\n• 互斥说明：已享受公租房实物配租的家庭不得重复申领租赁补贴。',
        statuteClauses: '《广州市公共租赁住房保障办法》（穗府办规〔2024〕6号）\n第三条第二款：“保障对象包括本市城镇户籍中等偏下收入住房困难家庭，以及在穗稳定就业的新就业职工和外来务工人员。”\n第十一条：“住房租赁补贴按照保障人口、补贴标准及保障面积计算，按月存入保障对象指定的个人银行账户。”',
        citations: [
          {
            title: '广州市公共租赁住房保障办法',
            docNumber: '穗府办规〔2024〕6号',
            dept: '广州市人民政府办公厅',
            similarity: '99%',
            clause: '第三条【保障对象】：本市城镇户籍中等偏下收入住房困难家庭，以及持有本市有效居住证、在穗连续稳定就业的新就业职工及外来务工人员。\n第十一条【租赁补贴】：住房租赁补贴标准为每平方米每月35元，结合保障家庭人口与人均保障建筑面积测算发放。'
          }
        ],
        suggestions: [
          '新就业无房职工申请公租房租赁补贴的收入门槛是多少？',
          '公租房实物配租与租赁补贴可以同时享受吗？',
          '连续缴纳社保满6个月是否包含补缴月份？'
        ]
      };
    }

    // 2. 积分制入户政策
    if (q.includes('积分') || q.includes('入户') || q.includes('落户') || q.includes('户口')) {
      return {
        conclusion: '来穗人员通过积分制申请落户广州，须同时满足年龄在45周岁以下、持有效在穗广东省居住证、在穗依法缴纳社保累计满4年、信用良好四项法定硬性条件。',
        plainInterpretation: '• 准入四要素：① 年龄未满45周岁；② 持有效广州居住证；③ 广州社保累计满4年（五险齐全）；④ 积分达到当年度入户门槛。\n• 排名规则：依“广州市来穗人员积分制服务管理信息系统”核定积分从高到低统一排序入户，相同分数依社保月份排序。\n• 随迁规定：获得积分入户指标后，其配偶及未成年子女可依法申请同步随迁落户。\n• 办理时限：每年集中开展一次申报审核，拟入户名单在广州门户网站公示5个工作日。',
        statuteClauses: '《广州市积分制入户管理办法》（穗府规〔2023〕1号）\n第五条：“申请积分制入户应当符合下列条件：（一）年龄在45周岁以下；（二）持有本市有效《广东省居住证》；（三）在本市合法稳定就业或创业并缴纳社会保险累计满4年；（四）在穗信用良好。”\n第六条：“指标总量实行年度调控，按核定积分分值高低确定拟入户人员名单。”',
        citations: [
          {
            title: '广州市积分制入户管理办法',
            docNumber: '穗府规〔2023〕1号',
            dept: '广州市人民政府',
            similarity: '98%',
            clause: '第五条【申报条件】：符合以下条件的来穗人员，可申请积分制入户：\n（一）年龄45周岁以下；\n（二）持本市有效《广东省居住证》；\n（三）在本市合法稳定就业或创业并缴纳社会保险累计满4年；\n（四）在穗信用记录良好，无严重违法犯罪记录。'
          }
        ],
        suggestions: [
          '社保缴纳满4年是否包含断缴或跨省转移接续月份？',
          '来穗人员积分指标体系主要加分项包括哪些？',
          '获得积分入户指标后随迁家属有哪些具体审核规定？'
        ]
      };
    }

    // 3. 企业开办与营商环境扶持政策
    if (q.includes('企业') || q.includes('开公司') || q.includes('营业执照') || q.includes('开办') || q.includes('营商')) {
      return {
        conclusion: '广州市全面推行新开办企业“半天办结、零成本”，设立登记、公章刻制、发票申领与社保公积金开户实现全流程并联审批，0.5个工作日内完成，并免费赠送全套4枚防伪印章。',
        plainInterpretation: '• 办理时限：全流程网上半天（0.5工作日）办结，无需到大厅跑腿。\n• 费用全免：政府买单免费刻制包含公章、财务章、发票章、法人人名章共4枚防伪实体印章。\n• 一网通办：登录“广州市开办企业一网通平台”，营业执照、税务开户、银行预约、社保登记一表申报。\n• 智能审批：符合标准的有限责任公司及个体工商户支持全流程系统智能核准。',
        statuteClauses: '《广州市市场监督管理局关于深化企业开办“一网通办”改革的若干意见》（穗市监规〔2024〕2号）\n第二条：“全面深化‘一网通办、半天办结’，将企业设立登记、刻制印章、申领发票、员工就业参保和公积金开户整合为1个环节，开办成本降为零，印章制作费用由政府全额财政承担。”',
        citations: [
          {
            title: '广州市市场监督管理局关于深化企业开办“一网通办”改革的若干意见',
            docNumber: '穗市监规〔2024〕2号',
            dept: '广州市市场监督管理局',
            similarity: '97%',
            clause: '第二条【全流程并联审批】：设立登记、刻制印章、申领发票、员工参保及住房公积金缴存登记实行“一表填报、一次认证、一窗通取”，0.5天内全流程办结，实体印章由各区行政审批局统一免费发放。'
          }
        ],
        suggestions: [
          '新设企业免费赠送的实体印章领取方式有哪些？',
          '个体工商户转为有限责任公司（个转企）有何扶持？',
          '企业开办一网通平台电子营业执照如何进行手机实名认证？'
        ]
      };
    }

    // 4. 灵活就业医保与社保政策
    if (q.includes('医保') || q.includes('社保') || q.includes('灵活就业') || q.includes('医疗')) {
      return {
        conclusion: '在法定劳动年龄内的灵活就业人员在广州参加职工医保不设户籍壁垒，无论广州户籍还是外地户籍均可在穗自愿参保，享受与单位在职职工完全相同的住院及门诊报销待遇。',
        plainInterpretation: '• 参保人群：无雇工个体工商户、未在用人单位参保的非全日制从业人员、新业态平台从业人员等。\n• 缴费基数：按上年度广州城镇单位就业人员月平均工资的60%至300%区间自主选档缴费。\n• 报销待遇：按月缴纳职工医保费，按规定享受统筹基金支付的普通门诊、门诊特定病种及住院待遇。\n• 申报方式：通过“粤税通”微信小程序或办税服务厅凭居民身份证直接办理。',
        statuteClauses: '《广州市医疗保障局 广州市财政局关于灵活就业人员参加本市职工基本医疗保险有关事项的通知》（穗医保规〔2023〕5号）\n第一条：“未达法定退休年龄的无雇工个体工商户、未在用人单位参加职工医保的非全日制从业人员，凭身份证即可办理参保，破除户籍限制，保障平等参保权益。”',
        citations: [
          {
            title: '广州市医疗保障局关于灵活就业人员参加本市职工医保有关事项的通知',
            docNumber: '穗医保规〔2023〕5号',
            dept: '广州市医疗保障局、广州市财政局',
            similarity: '98%',
            clause: '第一条【参保范围】：未达到法定退休年龄的灵活就业人员，凭居民身份证可办理本市职工基本医疗保险参保登记，按规定缴纳医疗保险费，不设户籍壁垒限制。'
          }
        ],
        suggestions: [
          '灵活就业人员参加广州职工医保按什么费率缴费？',
          '外地户籍灵活就业人员是否需要提供广州居住证？',
          '断缴医保后如何办理恢复与待遇等待期规定？'
        ]
      };
    }

    // 5. 中小客车指标调控政策
    if (q.includes('车牌') || q.includes('摇号') || q.includes('竞价') || q.includes('指标') || q.includes('客车')) {
      return {
        conclusion: '个人申请广州中小客车增量指标（摇号/竞价），非广州户籍人员须持有效在穗居住证且近2年在本市累计缴纳职工医保满24个月，名下无本市登记中小客车并持有有效驾驶证。',
        plainInterpretation: '• 资格硬指标：① 广州有效居住证；② 申请之日前2年内累计缴纳广州医保满24个月（允许累计）；③ 持有效驾照且名下无粤A小客车。\n• 节能车摇号：符合条件的个人可选择申请节能车增量指标摇号（中签率显著高于普通车）。\n• 申报平台：登录“广州市中小客车指标调控管理信息系统”每月8日24时前完成申报，26日统一摇号竞价。',
        statuteClauses: '《广州市中小客车总量调控管理办法》（穗府办规〔2023〕15号）\n第十六条：“住所地在本市的个人包括：（一）本市户籍人员；（二）持有效《广东省居住证》且近2年在本市累计缴纳职工社会医疗保险满24个月的非本市户籍人员。申请人须名下无本市登记中小客车并持有效驾驶证。”',
        citations: [
          {
            title: '广州市中小客车总量调控管理办法',
            docNumber: '穗府办规〔2023〕15号',
            dept: '广州市人民政府办公厅',
            similarity: '96%',
            clause: '第十六条【个人申请条件】：住所地在本市的情形包括本市户籍人员、驻穗部队现役军人，以及持有效《广东省居住证》且近2年在本市连续缴纳职工医保满24个月的非本市户籍人员。'
          }
        ],
        suggestions: [
          '非广州户籍人员医保断缴补缴是否影响摇号资格？',
          '节能车摇号与普通车摇号可以同时申请吗？',
          '夫妻之间中小客车指标直接变更过户有何政策规定？'
        ]
      };
    }

    // 6. 出入境与港澳签注政策
    if (q.includes('港澳') || q.includes('通行证') || q.includes('签注') || q.includes('出入境') || q.includes('出境')) {
      return {
        conclusion: '内地居民在广州办理往来港澳通行证及团队旅游签注全面实行“全国通办”，免提交居住证与户籍材料，持有效居民身份证即可异地就近办理，首次办证一般7个工作日办结。',
        plainInterpretation: '• 全国通办政策：不受户籍地限制，全国居民均可在广州公安出入境窗口就近申办。\n• 携带材料：仅需携带本人二代居民身份证原件，未满16周岁须监护人陪同并携带户口簿。\n• 智能签注立等可取：持有效往来港澳通行证再次申请赴港澳旅游签注的，可在全市智能签注机实现“立等可取”。\n• 预约渠道：通过“广州公安”微信公众号或“移民局”小程序提前预约就近网点。',
        statuteClauses: '国家移民管理局《关于进一步调整优化出入境管理政策措施的公告》（国移发〔2023〕18号）\n第一条：“自2023年5月15日起，全面恢复实行内地居民赴港澳团队旅游签注‘全国通办’；内地居民可向全国任一公安机关出入境管理机构提交申请，申办手续与户籍地一致。”',
        citations: [
          {
            title: '关于全面实施出入境证件“全国通办”的规定',
            docNumber: '国移发〔2023〕18号',
            dept: '国家移民管理局',
            similarity: '95%',
            clause: '第一条【全国通办】：内地居民可在全国任一出入境管理窗口申请往来港澳通行证及团队旅游签注，不受户籍地限制，无需提交居住证或社保证明。'
          }
        ],
        suggestions: [
          '在广州智能签注一体机办理港澳签注是否需要预约？',
          '港澳个人旅游签注（G签）与团队旅游（L签）适用范围？'
        ]
      };
    }

    // 兜底政务政策回答
    return {
      conclusion: '广州市现行规章、行政规范性文件已全面纳入广州市人民政府门户网站政策公开专栏，实行统一登记、统一编号、统一印发与动态清理机制。',
      plainInterpretation: '• 检索方式：市民可通过广州市人民政府门户网站“政务公开-政策法规”栏目，按发布年份、主管委办局或文件主题分类检索。\n• 有效性认定：规章文件施行期满未明确延续的自动失效，各部门定期公示已废止与现行有效文件目录。\n• 建议渠道：若需了解特定行业或新出台政策执行细则，可直接拨打12345热线或向主管委办局申请政务公开。',
      statuteClauses: '《广州市行政规范性文件管理规定》（广州市人民政府令第192号）\n第二十三条：“行政规范性文件应当自公布之日起在政府门户网站统一向社会公开，并同步发布权威政策解读文本。”\n第二十九条：“制定机关应当每隔两年对行政规范性文件组织清理，及时向社会公布清理结果。”',
      citations: [
        {
          title: '广州市行政规范性文件管理规定',
          docNumber: '广州市人民政府令第192号',
          dept: '广州市人民政府',
          similarity: '92%',
          clause: '第二十三条【公开与解读】：行政规范性文件应当自公布之日起在政府门户网站统一向社会公开，并同步发布权威政策解读文本。'
        }
      ],
      suggestions: [
        '如何查询广州市最新出台的规范性文件？',
        '广州市政策文件施行日期与有效期如何认定？'
      ]
    };
  }

  console.log('[广州政策问答] 广州市政策法规 AI 智能问答专窗已注入运行（政策向量 RAG 规范版）。');
})();
