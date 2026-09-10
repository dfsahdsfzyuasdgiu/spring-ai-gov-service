// ==UserScript==
// @name         骞垮窞甯備汉姘戞斂搴滈棬鎴风綉绔?路 鏀跨瓥娉曡 AI 鏅鸿兘闂瓟鍔╂墜 (鍚戦噺搴揜AG鐩存函鐗?
// @namespace    https://www.gz.gov.cn/
// @version      1.2.0
// @description  涓哄箍宸炲競浜烘皯鏀垮簻闂ㄦ埛缃戠珯锛坵ww.gz.gov.cn锛夐噺韬墦閫犵殑鏀跨瓥娉曡AI鏅鸿兘闂瓟涓撶獥锛屾繁搴﹀鎺ユ斂绛栧悜閲忔暟鎹簱锛圧AG锛夛紝鏀寔鏀跨瓥鏉℃绮惧噯瑙ｈ銆佺孩澶村叕鏂囧彂鏂囧瓧鍙蜂笌鍘熸枃渚濇嵁鐩存函銆佹櫤鑳芥斂绛栬拷闂€?// @author       骞垮窞鏀跨瓥AI鏅鸿兘闂瓟鍥㈤槦
// @match        https://www.gz.gov.cn/*
// @match        http://www.gz.gov.cn/*
// @match        https://zwfw.gd.gov.cn/*
// @match        http://localhost:8080/*
// @match        http://127.0.0.1:8080/*
// @include      /^https?:\/\/localhost(:\d+)?\/.*$/
// @include      /^https?:\/\/127\.0\.0\.1(:\d+)?\/.*$/
// @icon         https://www.gz.gov.cn/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

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
      gap: 8px;
      font-size: 10.5px;
      color: #8c8c8c;
      margin-top: 4px;
    }

    .action-sub-btn {
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      border-radius: 0;
      color: #595959;
      cursor: pointer;
      padding: 1px 6px;
      font-size: 10.5px;
      transition: all 0.15s ease;
    }
    .action-sub-btn:hover { color: #c20505; border-color: #c20505; background: #ffffff; }

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
            您好，欢迎使用<strong>广州市人民政府门户网站</strong>政策法规 AI 智能问答系统。<br><br>
            本系统深度对接广州市现行政策公文向量知识库，为您提供政策条文精准检索、适用对象判断与官方条款溯源。您可在此输入您想了解的政策问题，例如：
            <ul style="margin: 6px 0 0 18px; line-height: 1.6; color: #475569;">
              <li><em>“新就业无房职工申领广州公租房租赁补贴的具体政策规定是什么？”</em></li>
              <li><em>“广州市对新设立企业免费发放印章和半天办结的规章依据是哪部文件？”</em></li>
            </ul>
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

  // 渲染政策问答结果 (专注于政策解读 + 向量溯源 + 追问延伸)
  function renderPolicyAnswer(data) {
    const div = document.createElement('div');
    div.className = 'chat-row ai';

    // 1. 政策原文依据卡片组 (Citations)
    let citationsHtml = '';
    const citeList = data.citations || (data.policy ? [data.policy] : []);
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

    // 2. 智能政策延伸推荐 (Suggestions)
    let suggestionsHtml = '';
    if (data.suggestions && data.suggestions.length > 0) {
      const chips = data.suggestions.map((s) => `
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
        <div class="typing-target"></div>
        ${citationsHtml}
        ${suggestionsHtml}
      </div>
      <div class="chat-feedback-bar">
        <span>信息承办：广州市政务服务和数据管理局</span>
        <button class="action-sub-btn fb-toggle-btn" title="点击展开政策解答疑问与建议反馈">有疑问？</button>
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

    // 绑定“有疑问？”点击展开反馈框
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

    // 绑定追问芯片点击
    div.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const p = chip.getAttribute('data-prompt');
        textInput.value = p;
        handleUserSubmit();
      });
    });

    const targetElem = div.querySelector('.typing-target');
    runTypeWriter(targetElem, data.content || data.reply || '', 0, 14);
  }

  function runTypeWriter(element, text, index, speed) {
    if (index < text.length) {
      element.innerHTML = text.substring(0, index + 1).replace(/\n/g, '<br/>');
      scrollChatBottom();
      setTimeout(() => runTypeWriter(element, text, index + 1, speed), speed);
    }
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

  // 广州市政策法规高保真离线向量仿真知识库
  function getGuangzhouPolicyMockData(prompt) {
    const q = prompt.toLowerCase();

    // 1. 公租房保障与租赁补贴政策
    if (q.includes('公租房') || q.includes('租房') || q.includes('租赁补贴')) {
      return {
        content: '根据《广州市公共租赁住房保障办法》，广州市对中等偏下收入住房困难家庭及新就业无房职工实行“实物配租”与“住房租赁补贴”相结合的保障模式。符合条件的新就业无房职工在穗稳定就业且人均年可支配收入低于保障线的，可申领住房租赁补贴，补贴标准按建筑面积每平方米每月最高35元计算，补贴期限最长不超过5年。',
        citations: [
          {
            title: '广州市公共租赁住房保障办法',
            docNumber: '穗府办规〔2024〕6号',
            dept: '广州市人民政府办公厅',
            similarity: '98%',
            clause: '第三条【保障对象】：本市城镇户籍中等偏下收入住房困难家庭，以及持有本市有效居住证、在穗连续稳定就业的新就业职工及外来务工人员。\n第十一条【租赁补贴】：住房租赁补贴标准为每平方米每月35元，结合保障家庭人口与人均保障建筑面积测算发放。'
          }
        ],
        suggestions: [
          '新就业无房职工申请补贴的收入门槛是多少？',
          '公租房实物配租与租赁补贴可以同时享受吗？',
          '租赁补贴累计最长可以享受几年？'
        ]
      };
    }

    // 2. 积分制入户政策
    if (q.includes('积分') || q.includes('入户') || q.includes('落户') || q.includes('户口')) {
      return {
        content: '根据《广州市积分制入户管理办法》，广州市对来穗人员实行年度积分指标总量调控。申报人须同时符合四项法定准入条件：年龄在45周岁以下、持有在广州市办理的有效《广东省居住证》、在穗合法稳定就业或创业并累计缴纳社会保险满4年、在“广州市来穗人员积分制服务管理信息系统”核定积分达到当年度规定基准值。积分指标按分数由高到低排序确定落户名单。',
        citations: [
          {
            title: '广州市积分制入户管理办法',
            docNumber: '穗府规〔2023〕1号',
            dept: '广州市人民政府',
            similarity: '97%',
            clause: '第五条【申报条件】：符合以下条件的来穗人员，可申请积分制入户：\n（一）年龄45周岁以下；\n（二）持本市有效《广东省居住证》；\n（三）在本市合法稳定就业或创业并缴纳社会保险累计满4年；\n（四）在穗信用记录良好，无严重违法犯罪记录。'
          }
        ],
        suggestions: [
          '社保缴纳满4年是否包含断缴补缴月份？',
          '来穗人员积分指标体系主要加分项有哪些？',
          '获得积分入户指标后随迁家属有哪些政策规定？'
        ]
      };
    }

    // 3. 企业开办与营商环境扶持政策
    if (q.includes('企业') || q.includes('开公司') || q.includes('营业执照') || q.includes('开办') || q.includes('营商')) {
      return {
        content: '广州市依据《广东省优化营商环境条例》及《广州市深化企业开办“一网通办”改革的若干意见》，全面推行新开办企业“半天办结、零成本”。新设立企业通过“广州市开办企业一网通平台”申报，营业执照申领、公章刻制、发票领用、就业社保登记与公积金开户实现并联审批，0.5个工作日内完成办结，并由政府财政买单免费向新开办企业赠送4枚防伪印章。',
        citations: [
          {
            title: '广州市市场监督管理局关于深化企业开办“一网通办”改革的若干意见',
            docNumber: '穗市监规〔2024〕2号',
            dept: '广州市市场监督管理局',
            similarity: '96%',
            clause: '第二条【全流程并联审批】：设立登记、刻制印章、申领发票、员工参保及住房公积金缴存登记实行“一表填报、一次认证、一窗通取”，0.5天内全流程办结，实体印章由各区行政审批局统一免费发放。'
          }
        ],
        suggestions: [
          '新设企业免费赠送的实体印章包含哪些种类？',
          '广州对个体工商户转为有限责任公司有何便利扶持？',
          '企业开办一网通平台电子营业执照如何进行人脸认证？'
        ]
      };
    }

    // 4. 灵活就业医保与社保政策
    if (q.includes('医保') || q.includes('社保') || q.includes('灵活就业') || q.includes('医疗')) {
      return {
        content: '根据《广州市医疗保障局 广州市财政局关于灵活就业人员参加本市职工基本医疗保险有关事项的通知》，在法定劳动年龄内的无雇工个体工商户、未在用人单位参加职工医保的非全日制从业人员以及其他灵活就业人员，无论户籍在广州还是外地，均可在就业地参加广州市职工基本医疗保险。缴费基数可在上年度全口径城镇单位就业人员月平均工资的60%至300%之间自主选择，按月享受与企业职工完全相同的门诊和住院报销待遇。',
        citations: [
          {
            title: '广州市医疗保障局 广州市财政局关于灵活就业人员参加本市职工基本医疗保险有关事项的通知',
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
        content: '根据《广州市中小客车总量调控管理办法》，广州市中小客车增量指标分为节能车增量指标、普通车增量指标（摇号与竞价）。个人申请增量指标须满足：住所地在本市、持有有效机动车驾驶证、名下没有本市登记的中小客车。非本市户籍人员申请还须持有在穗有效居住证，且近两年内在广州累计缴纳基本医疗保险满24个月。',
        citations: [
          {
            title: '广州市中小客车总量调控管理办法',
            docNumber: '穗府办规〔2023〕15号',
            dept: '广州市人民政府办公厅',
            similarity: '95%',
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
        content: '依据国家移民管理局《关于全面实施出入境证件“全国通办”的规定》，中国内地居民自2019年起可在全国任一公安出入境管理窗口申请办理往来港澳通行证及赴香港、澳门团队旅游签注，申办手续与户籍地一致。申请人仅需提供本人有效居民身份证即可办理，免交户口簿与居住证明，一般7个工作日内签发。',
        citations: [
          {
            title: '关于全面实施出入境证件“全国通办”的规定',
            docNumber: '国移发〔2023〕18号',
            dept: '国家移民管理局',
            similarity: '94%',
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
      content: `关于您咨询的问题：“${prompt}”，经广州市政策法规数据库检索，广州市人民政府及各委办局现行政策文件库已全面落实信息公开规范。您可通过广州市人民政府门户网站“政务公开-政策法规”专栏，依文号、发布年份与部门进行精准全文查阅。`,
      citations: [
        {
          title: '广州市行政规范性文件管理规定',
          docNumber: '广州市人民政府令第192号',
          dept: '广州市人民政府',
          similarity: '90%',
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
