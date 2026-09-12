// ==UserScript==
// @name         广州市人民政府门户网站 · 政策法规与办事导办 AI 智能问答专窗
// @namespace    https://www.gz.gov.cn/
// @version      3.3.0
// @description  广州市政务服务与政策法规 AI 智能问答专窗（直连云端双 Agent 协同系统，官方原生“叻仔”专窗）
// @author       Guangzhou Smart Gov Project Team
// @match        https://www.gdzwfw.gov.cn/portal/v3/index*
// @match        https://www.gdzwfw.gov.cn/portal/v2/index*
// @match        https://www.gdzwfw.gov.cn/portal/index*
// @match        https://www.gz.gov.cn/*
// @match        https://wsbs.gz.gov.cn/*
// @match        http://localhost:8080/*
// @match        http://127.0.0.1:8080/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      149.118.133.163
// @connect      *
// ==/UserScript==
(function () {
  'use strict';

  function initAssistant() {
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAssistant);
      } else {
        setTimeout(initAssistant, 50);
      }
      return;
    }

    // 官网首页判定：仅在官方门户网站首页或本地服务首页挂载
    function isOfficialHomePage() {
      if (window.GzGovAiForceMount || (window.location.search && window.location.search.includes('gz_ai_force=1'))) {
        return true;
      }
      var host = (window.location.hostname || '').toLowerCase();
      var pathname = (window.location.pathname || '').toLowerCase();

      // 本地开发测试服务首页
      if (host === 'localhost' || host === '127.0.0.1') {
        return pathname === '/' || pathname === '/index.html' || pathname === '';
      }
      // 广州市人民政府门户网站 (www.gz.gov.cn) 首页
      if (host === 'www.gz.gov.cn' || host === 'gz.gov.cn') {
        return pathname === '/' || pathname === '/index.html' || pathname === '/index.htm' || pathname === '';
      }
      // 广州市政务服务网 / 网上办事大厅 (wsbs.gz.gov.cn) 首页
      if (host === 'wsbs.gz.gov.cn') {
        return pathname === '/' || pathname === '/index.html' || pathname === '/index.htm' || pathname === '';
      }
      // 广东政务服务网 (www.gdzwfw.gov.cn) 首页及广州专区首页 (全版本覆盖 v3/v2/v1)
      if (host === 'www.gdzwfw.gov.cn' || host === 'gdzwfw.gov.cn') {
        return pathname === '/' ||
               pathname === '/index.html' ||
               pathname === '/portal/v3/index' ||
               pathname.startsWith('/portal/v3/index') ||
               pathname === '/portal/v2/index' ||
               pathname.startsWith('/portal/v2/index') ||
               pathname === '/portal/index' ||
               pathname.startsWith('/portal/index') ||
               pathname === '';
      }
      // 其它环境默认仅根路径首页挂载
      return pathname === '/' || pathname === '/index.html' || pathname === '';
    }

    // 仅在官网首页挂载，子页面自动跳过
    if (!isOfficialHomePage()) {
      console.log('[广州政策问答] 当前页面非官网首页，跳过专窗挂载。');
      return;
    }

    // 避免在同一页面重复注入
    if (document.getElementById('gz-gov-ai-root')) {
      console.warn('[广州政策问答] 已存在运行实例，跳过重复初始化。');
      return;
    }

    // 会话标识保持
    let currentSessionId = window.gzGovSessionId || ('gz-session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
    window.gzGovSessionId = currentSessionId;

    // 全局对接配置 (直连云端双 Agent 协同系统)
    window.GzGovAiConfig = Object.assign({
      apiEndpoint: 'http://149.118.133.163:6001/api/chat/stream',
      authToken: 'gov-rag-sec-2026-auth-token',
      healthEndpoint: 'http://149.118.133.163:6001/api/health',
      mockIfOffline: false,
      assistantName: '叻仔 · 广州政务智能助手',
      authority: '广州市人民政府门户网站',
      organizer: '广州市政务服务和数据管理局',
      hotline: '12345政务服务便民热线'
    }, window.GzGovAiConfig || {});

    // 宿主节点与 Shadow DOM 挂载
    const host = document.createElement('div');
    host.id = 'gz-gov-ai-root';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    // 注入官方原生样式体系
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      :host {
        --gz-font-base: 14px;
        --gz-font-title: 15px;
        --gz-font-small: 12px;
        --gz-line-height: 1.65;
        --gz-primary: #0071e3;
        --gz-primary-dark: #0056b3;
      }

      /* 字号三档切换支持 (适老化无障碍国标) */
      .gz-dialog-window.font-lg {
        --gz-font-base: 16px;
        --gz-font-title: 17.5px;
        --gz-font-small: 13.5px;
        --gz-line-height: 1.7;
      }
      .gz-dialog-window.font-sm {
        --gz-font-base: 12.5px;
        --gz-font-title: 13.5px;
        --gz-font-small: 11px;
        --gz-line-height: 1.55;
      }

      /* 宿主容器 */
      .gz-gov-shell {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        pointer-events: none;
      }

      /* 官方“穗 · 政策问答”伴随悬浮球 (对标官方系统右下角) */
      .gz-launcher {
        pointer-events: auto;
        width: 58px;
        height: 58px;
        border-radius: 50% !important;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(0, 113, 227, 0.22), 0 2px 6px rgba(0, 0, 0, 0.06);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        user-select: none;
        border: 2px solid #ffffff;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .gz-launcher:hover {
        transform: scale(1.08);
        box-shadow: 0 12px 32px rgba(0, 113, 227, 0.32);
      }
      .launcher-mascot-head {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .launcher-tag-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ff6b00;
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 10px !important;
        border: 1.5px solid #ffffff;
        line-height: 1.2;
      }
      .launcher-text-caption {
        font-size: 9px;
        color: #0071e3;
        font-weight: 700;
        margin-top: 1px;
        letter-spacing: 0.2px;
      }

      /* 政策咨询主视窗 (天蓝微光科技质感) */
      .gz-dialog-window {
        pointer-events: auto;
        width: 490px;
        height: 650px;
        min-width: 420px;
        min-height: 560px;
        background: linear-gradient(180deg, #d8ebff 0%, #edf5ff 32%, #f8fbff 68%, #ffffff 100%);
        background-image:
          radial-gradient(circle at 10% 15%, rgba(0, 113, 227, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 90% 45%, rgba(255, 107, 0, 0.05) 0%, transparent 45%),
          linear-gradient(180deg, #d8ebff 0%, #edf5ff 32%, #f8fbff 68%, #ffffff 100%);
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: 20px !important;
        box-shadow: 0 20px 50px rgba(0, 50, 120, 0.16), 0 4px 14px rgba(0, 0, 0, 0.04);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        animation: gzPanelShow 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes gzPanelShow {
        0% { opacity: 0; transform: translateY(18px) scale(0.97); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* 窗口缩放手柄与边缘拖拽热区 */
      .gz-resize-grip-nw {
        position: absolute;
        top: 0;
        left: 0;
        width: 18px;
        height: 18px;
        cursor: nwse-resize;
        z-index: 120;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        padding: 3px;
      }
      .gz-resize-corner-mark {
        width: 9px;
        height: 9px;
        border-top: 2px solid #0071e3;
        border-left: 2px solid #0071e3;
        opacity: 0.45;
      }
      .gz-resize-edge-w {
        position: absolute;
        top: 18px;
        left: 0;
        width: 6px;
        bottom: 0;
        cursor: ew-resize;
        z-index: 110;
      }
      .gz-resize-edge-n {
        position: absolute;
        top: 0;
        left: 18px;
        height: 6px;
        right: 0;
        cursor: ns-resize;
        z-index: 110;
      }

      /* 顶栏 (官方“叻仔 + 广州市”造型) */
      .gz-window-header {
        padding: 12px 16px 10px 16px;
        background: rgba(255, 255, 255, 0.65);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(0, 113, 227, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
      }
      .header-lezai-identity {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .lezai-mascot-avatar {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 5px rgba(255, 107, 0, 0.25));
      }
      .lezai-name-box {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .lezai-title-text {
        font-size: 17px;
        font-weight: 700;
        color: #1d2129;
        letter-spacing: 0.2px;
      }
      .lezai-loc-tag {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 12px;
        color: #0071e3;
        background: rgba(0, 113, 227, 0.08);
        padding: 2px 7px;
        border-radius: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .lezai-loc-tag:hover {
        background: rgba(0, 113, 227, 0.14);
      }

      /* 顶栏右侧：适老化字号切换器 + 窗口控制 */
      .header-right-tools {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .lezai-fontsize-bar {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11.5px;
        color: #64748b;
        background: rgba(255, 255, 255, 0.7);
        padding: 3px 8px;
        border-radius: 14px;
        border: 1px solid rgba(0, 0, 0, 0.05);
      }
      .fs-btn {
        cursor: pointer;
        padding: 1px 4px;
        border-radius: 4px;
        color: #475569;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      .fs-btn:hover {
        color: #0071e3;
      }
      .fs-btn.active {
        color: #0071e3;
        font-weight: 700;
        background: rgba(0, 113, 227, 0.12);
      }

      .lezai-win-controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .win-ctrl-btn {
        width: 26px;
        height: 26px;
        border: none;
        background: transparent;
        color: #64748b;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .win-ctrl-btn:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #1d2129;
      }
      .win-ctrl-btn.close:hover {
        background: #ff4d4f;
        color: #ffffff;
      }
      .win-ctrl-btn svg {
        width: 14px;
        height: 14px;
        stroke: currentColor;
        stroke-width: 2;
        fill: none;
      }

      /* 提问记录横向条 */
      .lezai-history-strip {
        padding: 6px 16px;
        background: rgba(255, 255, 255, 0.45);
        border-bottom: 1px solid rgba(0, 113, 227, 0.05);
        display: flex;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: none;
      }
      .lezai-history-strip::-webkit-scrollbar { display: none; }
      .history-strip-label {
        font-size: 11px;
        color: #0071e3;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
      }
      .history-chip-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #334155;
        background: #ffffff;
        padding: 2px 8px;
        border-radius: 12px;
        border: 1px solid rgba(0, 113, 227, 0.15);
        cursor: pointer;
        flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        transition: all 0.15s ease;
      }
      .history-chip-item:hover {
        border-color: #0071e3;
        color: #0071e3;
      }
      .history-chip-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #0071e3;
      }
      .history-chip-close {
        color: #94a3b8;
        font-size: 12px;
        margin-left: 2px;
      }
      .history-chip-close:hover {
        color: #ef4444;
      }

      /* 核心 Markdown 表格与结构化排版增强 */
      .lezai-natural-paragraph {
        font-size: var(--gz-font-base);
        line-height: var(--gz-line-height);
        color: #1e293b;
        word-break: break-word;
      }
      .lezai-md-p {
        margin: 0 0 6px 0;
        line-height: var(--gz-line-height);
      }
      .lezai-md-gap {
        height: 6px;
      }
      .lezai-table-scroll {
        width: 100%;
        overflow-x: auto;
        margin: 10px 0;
        border-radius: 8px;
        border: 1px solid rgba(0, 113, 227, 0.2);
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 80, 179, 0.05);
        -webkit-overflow-scrolling: touch;
      }
      .lezai-md-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--gz-font-small);
        min-width: 360px;
      }
      .lezai-md-table th {
        background: #f0f7ff;
        color: #0050b3;
        font-weight: 700;
        padding: 8px 10px;
        border: 1px solid #dbeafe;
        white-space: nowrap;
      }
      .lezai-md-table td {
        padding: 8px 10px;
        border: 1px solid #e2e8f0;
        color: #334155;
        line-height: 1.5;
        vertical-align: top;
      }
      .lezai-md-table tr:nth-child(even) td {
        background: #f8fafc;
      }
      .lezai-md-table tr:hover td {
        background: #eff6ff;
      }
      .lezai-md-h {
        font-weight: 700;
        color: #0050b3;
        margin: 12px 0 6px 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .lezai-md-h1 { font-size: calc(var(--gz-font-base) + 3px); border-bottom: 2px solid #0071e3; padding-bottom: 4px; }
      .lezai-md-h2 { font-size: calc(var(--gz-font-base) + 2px); }
      .lezai-md-h3 {
        font-size: calc(var(--gz-font-base) + 1px);
        background: rgba(0, 113, 227, 0.06);
        padding: 4px 10px;
        border-left: 3px solid #0071e3;
        border-radius: 0 6px 6px 0;
      }
      .lezai-md-h4 { font-size: var(--gz-font-base); }
      .lezai-md-ul, .lezai-md-ol {
        margin: 4px 0 8px 18px;
        padding: 0;
      }
      .lezai-md-ul li, .lezai-md-ol li {
        margin-bottom: 4px;
        line-height: var(--gz-line-height);
        color: #334155;
      }
      .lezai-inline-code {
        background: #f1f5f9;
        color: #0f766e;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.9em;
        font-family: ui-monospace, Menlo, Consolas, monospace;
      }
      .lezai-flow-arrow {
        color: #0071e3;
        font-weight: 700;
        margin: 0 2px;
      }

      /* 聊天核心视窗 */
      .gz-chat-main {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        scroll-behavior: smooth;
      }

      /* 欢迎消息与智能定位卡片 */
      .lezai-welcome-box {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .lezai-welcome-speech {
        background: #ffffff;
        border-radius: 16px;
        padding: 14px 16px;
        box-shadow: 0 4px 18px rgba(0, 100, 220, 0.05);
        border: 1px solid rgba(220, 235, 255, 0.8);
        font-size: var(--gz-font-base);
        line-height: var(--gz-line-height);
        color: #1e293b;
      }
      .lezai-welcome-speech .greet-title {
        font-weight: 600;
        margin-bottom: 8px;
      }
      .lezai-prompt-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
      }
      .prompt-pill-btn {
        background: #ffffff;
        border: 1px solid #c8ddf6;
        color: #1e293b;
        font-size: var(--gz-font-small);
        padding: 6px 14px;
        border-radius: 18px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 113, 227, 0.04);
        transition: all 0.2s ease;
      }
      .prompt-pill-btn:hover {
        background: #f0f7ff;
        border-color: #0071e3;
        color: #0071e3;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 113, 227, 0.12);
      }
      .lezai-match-strip {
        background: rgba(0, 113, 227, 0.06);
        border: 1px solid rgba(0, 113, 227, 0.12);
        border-radius: 20px;
        padding: 7px 14px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: var(--gz-font-small);
        color: #334155;
        width: fit-content;
      }
      .lezai-loc-link {
        color: #0071e3;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }

      /* 聊天行通用布局 */
      .chat-row {
        display: flex;
        flex-direction: column;
        animation: gzMsgFade 0.22s ease forwards;
      }
      @keyframes gzMsgFade {
        0% { opacity: 0; transform: translateY(8px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .chat-row.user {
        align-items: flex-end;
      }
      .chat-row.user.highlight-target .chat-bubble {
        animation: userBubblePulse 1.8s ease-in-out;
      }
      @keyframes userBubblePulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.7); }
        30% { transform: scale(1.04); box-shadow: 0 0 0 6px rgba(0, 113, 227, 0.4); }
        60% { transform: scale(1.02); box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2); }
        100% { transform: scale(1); box-shadow: none; }
      }
      .chat-row.ai.highlight-target-ai {
        animation: aiCardPulse 1.8s ease-in-out;
      }
      @keyframes aiCardPulse {
        0% { box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.5); }
        30% { box-shadow: 0 0 0 5px rgba(0, 113, 227, 0.35); }
        60% { box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.15); }
        100% { box-shadow: none; }
      }
      .chat-row.ai {
        align-items: flex-start;
      }

      .chat-meta-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 5px;
      }
      .chat-row.ai .chat-author {
        font-size: 11px;
        font-weight: 700;
        color: #0071e3;
        background: rgba(0, 113, 227, 0.08);
        padding: 1px 6px;
        border-radius: 6px;
      }
      .chat-row.user .chat-author {
        font-size: 11px;
        color: #64748b;
      }

      /* 气泡风格 */
      .chat-bubble {
        max-width: 95%;
        font-size: var(--gz-font-base);
        line-height: var(--gz-line-height);
        word-break: break-word;
        padding: 12px 16px;
      }
      .chat-row.user .chat-bubble {
        background: linear-gradient(135deg, #007aff 0%, #0056b3 100%);
        color: #ffffff;
        border: none;
        border-radius: 18px 18px 4px 18px !important;
        box-shadow: 0 4px 14px rgba(0, 122, 255, 0.22);
      }
      .chat-row.ai .chat-bubble {
        background: #ffffff;
        color: #1d1d1f;
        border: 1px solid rgba(220, 235, 255, 0.85);
        border-radius: 18px 18px 18px 4px !important;
        box-shadow: 0 4px 18px rgba(0, 60, 150, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02);
        width: 100%;
      }

      /* 消除生硬八股框：纯净自然语言流段落 (自然齐整排版，无首行缩进) */
      .lezai-natural-paragraph {
        font-size: var(--gz-font-base);
        line-height: var(--gz-line-height);
        color: #1e293b;
        margin-bottom: 10px;
        text-align: justify;
      }
      .lezai-natural-paragraph p {
        margin-bottom: 8px;
        line-height: var(--gz-line-height);
      }
      .lezai-natural-paragraph p:last-child {
        margin-bottom: 0;
      }
      .lezai-natural-paragraph strong {
        color: #0056b3;
        font-weight: 600;
      }

      /* 办事向导流线化排版 (无丑陋灰框嵌套，轻量通透) */
      .lezai-affair-flow {
        margin-top: 10px;
        border-top: 1px dashed rgba(0, 113, 227, 0.15);
        padding-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .flow-sec-title {
        font-size: var(--gz-font-title);
        font-weight: 700;
        color: #0056b3;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .flow-sec-title::before {
        content: "";
        display: inline-block;
        width: 3px;
        height: 14px;
        background: #0071e3;
        border-radius: 2px;
      }
      .flow-sec-content {
        font-size: var(--gz-font-base);
        color: #334155;
        line-height: 1.6;
        padding-left: 8px;
      }
      .flow-mat-list {
        list-style: none;
        padding-left: 8px;
      }
      .flow-mat-list li {
        position: relative;
        padding-left: 12px;
        margin-bottom: 4px;
        font-size: var(--gz-font-base);
      }
      .flow-mat-list li::before {
        content: "▪";
        position: absolute;
        left: 0;
        color: #0071e3;
      }
      .flow-step-list {
        padding-left: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .flow-step-item {
        font-size: var(--gz-font-base);
        color: #334155;
      }
      .flow-step-item strong {
        color: #0056b3;
      }

      /* 官方在线申办直达按钮 (药丸质感) */
      .lezai-direct-btn-wrap {
        margin-top: 8px;
        margin-bottom: 4px;
        padding-left: 8px;
      }
      .lezai-direct-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #f6ffed;
        color: #237804;
        border: 1px solid #b7eb8f;
        padding: 6px 14px;
        border-radius: 16px;
        font-size: var(--gz-font-small);
        font-weight: 600;
        text-decoration: none;
        box-shadow: 0 2px 6px rgba(56, 158, 13, 0.08);
        transition: all 0.2s ease;
      }
      .lezai-direct-btn:hover {
        background: #389e0d;
        color: #ffffff;
        border-color: #389e0d;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(56, 158, 13, 0.2);
      }

      /* 注意事项软提醒 */
      .lezai-tip-note {
        background: rgba(255, 107, 0, 0.05);
        border: 1px solid rgba(255, 107, 0, 0.18);
        border-radius: 10px;
        padding: 8px 12px;
        font-size: var(--gz-font-small);
        color: #475569;
        margin-top: 8px;
        line-height: 1.6;
      }
      .lezai-tip-note strong {
        color: #d9480f;
        font-weight: 600;
      }

      /* 多情形歧义一键选择卡片 (双 Agent ambiguity 协同) */
      .bubble-scenarios {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .scenario-option-btn {
        padding: 7px 12px;
        font-size: 13px;
        text-align: left;
        background: #ffffff;
        border: 1px solid #0071e3;
        color: #0071e3;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .scenario-option-btn:hover {
        background: #0071e3 !important;
        color: #ffffff !important;
      }

      /* 官方政策依据脚注 (左下角单行轻量注脚) */
      .source-footnote-line {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 6px;
        font-size: 11.5px;
        color: #64748b;
        margin-top: 10px;
        padding-top: 6px;
        border-top: 1px solid rgba(0, 0, 0, 0.04);
      }
      .source-btn-toggle {
        color: #0071e3;
        background: transparent;
        border: none;
        font-size: 11.5px;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
      }
      .source-btn-toggle:hover {
        text-decoration: underline;
      }
      .source-clause-drawer {
        margin-top: 6px;
        padding: 8px 12px;
        border-radius: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        font-size: 12px;
        color: #334155;
        line-height: 1.6;
        display: none;
      }
      .source-clause-drawer.open { display: block; }

      /* 消息底部操作栏 (复制 · 有疑问) */
      .bubble-action-bar {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        padding-left: 2px;
      }
      .action-text-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 11.5px;
        cursor: pointer;
        transition: color 0.15s ease;
      }
      .action-text-btn:hover {
        color: #0071e3;
      }

      /* 延伸追问药丸标签 */
      .bubble-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .sugg-chip {
        background: rgba(0, 113, 227, 0.05);
        border: 1px solid rgba(0, 113, 227, 0.15);
        color: #0071e3;
        font-size: 11px;
        padding: 3px 9px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .sugg-chip:hover {
        background: #0071e3;
        color: #ffffff;
      }

      /* 底部推荐主题胶囊栏 */
      .lezai-topics-strip {
        padding: 6px 14px;
        background: rgba(255, 255, 255, 0.6);
        border-top: 1px solid rgba(0, 113, 227, 0.08);
        display: flex;
        align-items: center;
        gap: 6px;
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: none;
      }
      .lezai-topics-strip::-webkit-scrollbar { display: none; }
      .topics-label {
        font-size: 11.5px;
        font-weight: 700;
        color: #0071e3;
        flex-shrink: 0;
      }
      .topic-pill-tag {
        font-size: 11.5px;
        color: #334155;
        background: #ffffff;
        padding: 3px 9px;
        border-radius: 12px;
        border: 1px solid rgba(0, 113, 227, 0.12);
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }
      .topic-pill-tag:hover {
        background: #f0f7ff;
        border-color: #0071e3;
        color: #0071e3;
      }

      /* 底部大胶囊输入底栏 */
      .gz-input-footer {
        padding: 10px 14px 12px 14px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
      .input-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #ffffff;
        border: 1px solid #c8ddf6;
        border-radius: 28px !important;
        padding: 3px 6px 3px 16px;
        box-shadow: 0 2px 10px rgba(0, 113, 227, 0.06);
        transition: all 0.2s ease;
      }
      .input-wrapper:focus-within {
        border-color: #0071e3;
        box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
      }
      .gz-text-input {
        flex: 1;
        height: 36px;
        border: none;
        outline: none;
        font-size: var(--gz-font-base);
        color: #1d2129;
        background: transparent;
      }
      .gz-text-input::placeholder {
        color: #94a3b8;
      }
      .lezai-send-btn {
        width: 36px;
        height: 36px;
        border-radius: 50% !important;
        border: none;
        background: linear-gradient(135deg, #007aff 0%, #0056b3 100%);
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 113, 227, 0.3);
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      .lezai-send-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 113, 227, 0.4);
      }
      .lezai-send-btn:disabled {
        background: #cbd5e1;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }
      .lezai-send-btn svg {
        width: 17px;
        height: 17px;
        stroke: #ffffff;
        stroke-width: 2.2;
        fill: none;
      }

      /* 打字中动效 */
      .typing-box {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
      }
      .typing-dot {
        width: 6px;
        height: 6px;
        background: #0071e3;
        border-radius: 50%;
        animation: typePulse 1.2s infinite ease-in-out;
      }
      .typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typePulse {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
        40% { transform: scale(1.2); opacity: 1; }
      }
    `;
    shadow.appendChild(style);

    // 叻仔 SVG 矢量图标定义
    const LEZAI_AVATAR_SVG = `
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="lzCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff9933"/>
            <stop offset="100%" stop-color="#ff5e00"/>
          </linearGradient>
          <linearGradient id="lzFaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#fff6ed"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#lzCapGrad)"/>
        <ellipse cx="50" cy="53" rx="36" ry="32" fill="url(#lzFaceGrad)"/>
        <ellipse cx="28" cy="58" rx="6" ry="3.5" fill="#ffaa80" opacity="0.65"/>
        <ellipse cx="72" cy="58" rx="6" ry="3.5" fill="#ffaa80" opacity="0.65"/>
        <ellipse cx="36" cy="48" rx="5.5" ry="7" fill="#1e293b"/>
        <circle cx="34" cy="45" r="2.2" fill="#ffffff"/>
        <ellipse cx="64" cy="48" rx="5.5" ry="7" fill="#1e293b"/>
        <circle cx="62" cy="45" r="2.2" fill="#ffffff"/>
        <path d="M 41 58 Q 50 67 59 58" fill="none" stroke="#e05300" stroke-width="3.2" stroke-linecap="round"/>
        <rect x="42" y="12" width="16" height="9" rx="3" fill="#ffffff"/>
        <circle cx="50" cy="16.5" r="2.8" fill="#ff5e00"/>
        <rect x="7" y="42" width="8" height="18" rx="4" fill="#0071e3"/>
        <rect x="85" y="42" width="8" height="18" rx="4" fill="#0071e3"/>
      </svg>
    `;

    // 地图定位 SVG 矢量图标定义 (对标官方极简线框定位点)
    const MAP_PIN_SVG = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1.5px; margin-right:2px; flex-shrink:0;">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    `;


    // 构造 DOM 骨架 (1:1 官方原生布局)
    const container = document.createElement('div');
    container.className = 'gz-gov-shell';
    container.innerHTML = `
      <!-- 官方右下角悬浮圆形徽标 -->
      <div class="gz-launcher" id="gzLauncher" title="呼出广州政务官方智能咨询（叻仔）">
        <div class="launcher-tag-badge">叻仔</div>
        <div class="launcher-mascot-head">
          ${LEZAI_AVATAR_SVG}
        </div>
        <div class="launcher-text-caption">政策问答</div>
      </div>

      <!-- 政策问答大厅主窗口 -->
      <div class="gz-dialog-window" id="gzDialogWindow">
        <!-- 窗口缩放手柄与边缘拖拽热区 -->
        <div class="gz-resize-grip-nw" id="gzResizeGripNw" title="拖拽进行窗口缩放（最小 420×560）">
          <div class="gz-resize-corner-mark"></div>
        </div>
        <div class="gz-resize-edge-w" id="gzResizeEdgeW" title="拖拽调整窗口宽度"></div>
        <div class="gz-resize-edge-n" id="gzResizeEdgeN" title="拖拽调整窗口高度"></div>

        <!-- 顶栏：叻仔头像 + 广州市定位 + 字号切换（大中小） + 窗口控制 -->
        <div class="gz-window-header" id="gzWindowHeader">
          <div class="header-lezai-identity">
            <div class="lezai-mascot-avatar">${LEZAI_AVATAR_SVG}</div>
            <div class="lezai-name-box">
              <span class="lezai-title-text">叻仔</span>
              <span class="lezai-loc-tag" id="gzLocTag" title="点击切换所属区域">${MAP_PIN_SVG}广州市</span>
            </div>
          </div>
          <div class="header-right-tools">
            <!-- 适老化字号切换器 (大 | 中 | 小) -->
            <div class="lezai-fontsize-bar" title="调整界面字号大小（适老化无障碍）">
              <span>字号设置:</span>
              <span class="fs-btn" data-size="lg" id="fsBtnLg">大</span>
              <span>|</span>
              <span class="fs-btn active" data-size="md" id="fsBtnMd">中</span>
              <span>|</span>
              <span class="fs-btn" data-size="sm" id="fsBtnSm">小</span>
            </div>
            <!-- 窗口控制 -->
            <div class="lezai-win-controls">
              <button class="win-ctrl-btn" id="gzBtnScale" title="切换全景大屏 / 常规窗口">
                <svg id="gzScaleIcon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              </button>
              <button class="win-ctrl-btn" id="gzBtnReset" title="清空对话重新开始">
                <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button class="win-ctrl-btn" id="gzBtnMin" title="最小化">
                <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button class="win-ctrl-btn close" id="gzBtnDismiss" title="关闭">
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 提问记录横向条 -->
        <div class="lezai-history-strip" id="lezaiHistoryStrip">
          <span class="history-strip-label"><span style="color:#0071e3;font-weight:900;">|</span> 提问记录</span>
          <div id="lezaiHistoryChips" style="display:flex; gap:6px; align-items:center;">
            <!-- 动态填充近期提问标签 -->
          </div>
        </div>

        <!-- 聊天主视窗 -->
        <div class="gz-chat-main" id="gzChatMain">
          <!-- 官方原生欢迎首屏 -->
          <div class="lezai-welcome-box">
            <div class="lezai-welcome-speech">
              <div class="greet-title">您好，我是叻仔，现在让我们开始交流吧！您可以在下方的输入框中输入您的问题，如果还没想好，您可以试着问我：</div>
              <div class="lezai-prompt-pills">
                <button class="prompt-pill-btn" data-query="身份证怎么申领？">身份证怎么申领？</button>
                <button class="prompt-pill-btn" data-query="我的社保卡丢了，怎么补办？">我的社保卡丢了，怎么补办？</button>
                <button class="prompt-pill-btn" data-query="公积金如何提取？">公积金如何提取？</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部推荐主题横向胶囊栏 -->
        <div class="lezai-topics-strip" id="lezaiTopicsStrip">
          <span class="topics-label">推荐主题:</span>
          <span class="topic-pill-tag" data-query="广东省内居民身份证到期换领流程与材料？">身份证</span>
          <span class="topic-pill-tag" data-query="驾驶证快到期了怎么在广州换证？">机动车驾驶证</span>
          <span class="topic-pill-tag" data-query="广州市社保卡丢了怎么补办？">社会保障卡</span>
          <span class="topic-pill-tag" data-query="广州养老保险参保与长寿保健金政策？">养老保险</span>
          <span class="topic-pill-tag" data-query="广州灵活就业人员职工基本医疗保险参保？">医保登记</span>
          <span class="topic-pill-tag" data-query="广州住房公积金贷款申请条件？">公积金贷款</span>
          <span class="topic-pill-tag" data-query="广州无房怎么提取公积金？">公积金提取</span>
          <span class="topic-pill-tag" data-query="广州市流动人口居住证申领流程？">居住证</span>
          <span class="topic-pill-tag" data-query="食品经营许可证核发小型餐饮办理？">卫生许可</span>
        </div>

        <!-- 底部大胶囊输入底栏 -->
        <div class="gz-input-footer">
          <div class="input-wrapper">
            <input type="text" class="gz-text-input" id="gzTextInput" placeholder="您想问点什么问题..." maxlength="200" />
            <button class="lezai-send-btn" id="gzSubmitBtn" title="发送">
              <svg viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    shadow.appendChild(container);

    // 获取 DOM 元素
    const launcher = shadow.getElementById('gzLauncher');
    const dialogWindow = shadow.getElementById('gzDialogWindow');
    const btnReset = shadow.getElementById('gzBtnReset');
    const btnMin = shadow.getElementById('gzBtnMin');
    const btnDismiss = shadow.getElementById('gzBtnDismiss');
    const btnScale = shadow.getElementById('gzBtnScale');
    const resizeGripNw = shadow.getElementById('gzResizeGripNw');
    const resizeEdgeW = shadow.getElementById('gzResizeEdgeW');
    const resizeEdgeN = shadow.getElementById('gzResizeEdgeN');
    const chatMain = shadow.getElementById('gzChatMain');
    const textInput = shadow.getElementById('gzTextInput');
    const submitBtn = shadow.getElementById('gzSubmitBtn');
    const historyChips = shadow.getElementById('lezaiHistoryChips');

    // 字号调节交互体系 (大 | 中 | 小)
    const fsBtnLg = shadow.getElementById('fsBtnLg');
    const fsBtnMd = shadow.getElementById('fsBtnMd');
    const fsBtnSm = shadow.getElementById('fsBtnSm');

    function setFontSize(size) {
      dialogWindow.classList.remove('font-lg', 'font-md', 'font-sm');
      [fsBtnLg, fsBtnMd, fsBtnSm].forEach(b => b.classList.remove('active'));
      if (size === 'lg') {
        dialogWindow.classList.add('font-lg');
        fsBtnLg.classList.add('active');
      } else if (size === 'sm') {
        dialogWindow.classList.add('font-sm');
        fsBtnSm.classList.add('active');
      } else {
        dialogWindow.classList.add('font-md');
        fsBtnMd.classList.add('active');
      }
      try { localStorage.setItem('gz_lezai_fontsize', size); } catch (e) {}
    }

    fsBtnLg.addEventListener('click', () => setFontSize('lg'));
    fsBtnMd.addEventListener('click', () => setFontSize('md'));
    fsBtnSm.addEventListener('click', () => setFontSize('sm'));

    try {
      const savedFs = localStorage.getItem('gz_lezai_fontsize');
      if (savedFs) setFontSize(savedFs);
    } catch (e) {}

    // 提问记录持久化与渲染
    let recentQuestions = [];
    try {
      const savedQ = localStorage.getItem('gz_lezai_recent_q');
      if (savedQ) recentQuestions = JSON.parse(savedQ);
    } catch (e) {}

    function renderHistoryChips() {
      historyChips.innerHTML = '';
      if (!recentQuestions || recentQuestions.length === 0) {
        historyChips.innerHTML = '<span style="font-size:11px;color:#94a3b8;">暂无提问记录</span>';
        return;
      }
      recentQuestions.slice(-5).reverse().forEach((q) => {
        const chip = document.createElement('div');
        chip.className = 'history-chip-item';
        chip.innerHTML = `
          <span class="history-chip-dot"></span>
          <span>${escapeText(q.length > 12 ? q.substring(0, 12) + '...' : q)}</span>
          <span class="history-chip-close" title="删除记录">&times;</span>
        `;
        chip.addEventListener('click', (e) => {
          if (e.target.classList.contains('history-chip-close')) {
            e.stopPropagation();
            recentQuestions = recentQuestions.filter(item => item !== q);
            try { localStorage.setItem('gz_lezai_recent_q', JSON.stringify(recentQuestions)); } catch (err) {}
            renderHistoryChips();
          } else {
            textInput.value = '';
            const jumped = scrollToQuestionRow(q);
            if (!jumped) {
              doSendMessage(q);
            }
          }
        });
        historyChips.appendChild(chip);
      });
    }
    function scrollToQuestionRow(targetQ) {
      if (!targetQ) return false;
      const rows = chatMain.querySelectorAll('.chat-row.user');
      let matchedRow = null;
      for (let i = rows.length - 1; i >= 0; i--) {
        const qAttr = rows[i].getAttribute('data-user-query');
        const bubble = rows[i].querySelector('.chat-bubble');
        const bubbleText = bubble ? bubble.textContent.trim() : '';
        if (qAttr === targetQ || bubbleText === targetQ.trim()) {
          matchedRow = rows[i];
          break;
        }
      }
      if (matchedRow) {
        matchedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        matchedRow.classList.remove('highlight-target');
        void matchedRow.offsetWidth;
        matchedRow.classList.add('highlight-target');

        const nextAiRow = matchedRow.nextElementSibling;
        if (nextAiRow && nextAiRow.classList.contains('ai')) {
          nextAiRow.classList.remove('highlight-target-ai');
          void nextAiRow.offsetWidth;
          nextAiRow.classList.add('highlight-target-ai');
          setTimeout(() => {
            nextAiRow.classList.remove('highlight-target-ai');
          }, 2200);
        }

        setTimeout(() => {
          matchedRow.classList.remove('highlight-target');
        }, 2200);
        return true;
      }
      return false;
    }

    renderHistoryChips();

    function addRecentQuestion(q) {
      if (!q) return;
      recentQuestions = recentQuestions.filter(item => item !== q);
      recentQuestions.push(q);
      if (recentQuestions.length > 10) recentQuestions.shift();
      try { localStorage.setItem('gz_lezai_recent_q', JSON.stringify(recentQuestions)); } catch (e) {}
      renderHistoryChips();
    }

    // 窗口尺寸控制
    const MIN_WIDTH = 420;
    const MIN_HEIGHT = 560;
    let customW = 490;
    let customH = 650;
    let isMaximized = false;

    try {
      const savedW = parseInt(localStorage.getItem('gz_gov_win_w'), 10);
      const savedH = parseInt(localStorage.getItem('gz_gov_win_h'), 10);
      if (savedW && savedW >= MIN_WIDTH) customW = savedW;
      if (savedH && savedH >= MIN_HEIGHT) customH = savedH;
      applyWindowSize(customW, customH, false);
    } catch (e) {}

    function applyWindowSize(w, h, save = true) {
      const maxW = Math.max(MIN_WIDTH, window.innerWidth - 24);
      const maxH = Math.max(MIN_HEIGHT, window.innerHeight - 24);
      const finalW = Math.max(MIN_WIDTH, Math.min(maxW, w));
      const finalH = Math.max(MIN_HEIGHT, Math.min(maxH, h));
      dialogWindow.style.width = finalW + 'px';
      dialogWindow.style.height = finalH + 'px';
      if (save) {
        try {
          localStorage.setItem('gz_gov_win_w', finalW);
          localStorage.setItem('gz_gov_win_h', finalH);
        } catch (e) {}
      }
    }

    btnScale.addEventListener('click', () => {
      isMaximized = !isMaximized;
      if (isMaximized) {
        applyWindowSize(880, 720, false);
      } else {
        applyWindowSize(490, 650, false);
      }
    });

    // 窗口最小化与呼出
    function openWindow() {
      dialogWindow.style.display = 'flex';
      launcher.style.display = 'none';
      textInput.focus();
    }
    function hideWindow() {
      dialogWindow.style.display = 'none';
      launcher.style.display = 'flex';
    }

    launcher.addEventListener('click', openWindow);
    btnMin.addEventListener('click', hideWindow);
    btnDismiss.addEventListener('click', hideWindow);

    btnReset.addEventListener('click', () => {
      chatMain.innerHTML = `
        <div class="lezai-welcome-box">
          <div class="lezai-welcome-speech">
            <div class="greet-title">您好，我是叻仔，现在让我们开始交流吧！您可以在下方的输入框中输入您的问题，如果还没想好，您可以试着问我：</div>
            <div class="lezai-prompt-pills">
              <button class="prompt-pill-btn" data-query="身份证怎么申领？">身份证怎么申领？</button>
              <button class="prompt-pill-btn" data-query="我的社保卡丢了，怎么补办？">我的社保卡丢了，怎么补办？</button>
              <button class="prompt-pill-btn" data-query="公积金如何提取？">公积金如何提取？</button>
            </div>
          </div>
        </div>
      `;
      bindPromptPills();
    });

    // 快捷提问胶囊绑定
    function bindPromptPills() {
      shadow.querySelectorAll('.prompt-pill-btn').forEach(btn => {
        btn.onclick = () => {
          const q = btn.getAttribute('data-query');
          if (q) {
            textInput.value = '';
            doSendMessage(q);
          }
        };
      });
    }
    bindPromptPills();

    // 底部推荐主题绑定
    shadow.querySelectorAll('.topic-pill-tag').forEach(tag => {
      tag.onclick = () => {
        const q = tag.getAttribute('data-query');
        if (q) {
          textInput.value = '';
          doSendMessage(q);
        }
      };
    });

    // 拖拽缩放
    let isResizing = false;
    let resizeMode = null;
    let startX = 0, startY = 0, startW = 0, startH = 0;

    function startResize(e, mode) {
      isResizing = true;
      resizeMode = mode;
      startX = e.clientX;
      startY = e.clientY;
      startW = dialogWindow.offsetWidth;
      startH = dialogWindow.offsetHeight;
      document.addEventListener('mousemove', onResizing);
      document.addEventListener('mouseup', stopResize);
      e.preventDefault();
    }
    function onResizing(e) {
      if (!isResizing) return;
      const dx = startX - e.clientX;
      const dy = startY - e.clientY;
      let nw = startW;
      let nh = startH;
      if (resizeMode === 'nw') { nw = startW + dx; nh = startH + dy; }
      else if (resizeMode === 'w') { nw = startW + dx; }
      else if (resizeMode === 'n') { nh = startH + dy; }
      applyWindowSize(nw, nh, true);
    }
    function stopResize() {
      isResizing = false;
      document.removeEventListener('mousemove', onResizing);
      document.removeEventListener('mouseup', stopResize);
    }
    resizeGripNw.addEventListener('mousedown', (e) => startResize(e, 'nw'));
    resizeEdgeW.addEventListener('mousedown', (e) => startResize(e, 'w'));
    resizeEdgeN.addEventListener('mousedown', (e) => startResize(e, 'n'));

    // 发送消息
    function handleSend() {
      const text = textInput.value.trim();
      if (!text) return;
      doSendMessage(text);
      textInput.value = '';
    }

    submitBtn.addEventListener('click', handleSend);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    function doSendMessage(content) {
      textInput.value = '';
      appendUserRow(content);
      addRecentQuestion(content);
      const loadingElem = appendLoadingRow();
      submitBtn.disabled = true;

      let fullText = '';
      let citationData = null;
      let guidedStepsData = null;
      let recommendations = [];
      let ambiguityData = null;
      let matchedItemData = null;
      let sseBuffer = '';

      function handleSseBlock(block) {
        block = block.trim();
        if (!block) return;

        let eventType = 'chunk';
        let dataStr = '';

        const subLines = block.split('\n');
        for (let i = 0; i < subLines.length; i++) {
          const line = subLines[i].trim();
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim().toLowerCase();
          } else if (line.startsWith('data:')) {
            if (dataStr.length > 0) dataStr += '\n';
            dataStr += line.substring(5).trim();
          }
        }

        if (!dataStr || dataStr === '[DONE]') return;

        try {
          const payload = JSON.parse(dataStr);
          const effectiveType = (payload.type ? String(payload.type).toLowerCase() : '') || eventType;

          if (effectiveType === 'session') {
            const sId = payload.sessionId || payload.content;
            if (sId) {
              currentSessionId = sId;
              window.gzGovSessionId = currentSessionId;
            }
          } else if (effectiveType === 'progress') {
            const pMsg = payload.message || payload.content;
            if (pMsg) {
              const st = loadingElem.querySelector('.typing-stage-text');
              if (st) st.textContent = pMsg;
            }
          } else if (effectiveType === 'route') {
            console.log('[广州政务双Agent] 意图识别:', payload.intent, '辖区:', payload.region || '全市');
          } else if (effectiveType === 'ambiguity') {
            if (payload.message) fullText = payload.message;
            ambiguityData = payload;
          } else if (effectiveType === 'matched_item') {
            matchedItemData = payload;
          } else if (effectiveType === 'references' || effectiveType === 'citation') {
            citationData = payload;
          } else if (effectiveType === 'chunk') {
            const c = payload.content || payload.text || '';
            if (c) fullText += c;
          } else if (effectiveType === 'error') {
            fullText = '服务提示：' + (payload.message || '云端处理异常');
          } else if (effectiveType === 'guide_card' || effectiveType === 'guided_steps_card') {
            guidedStepsData = payload.data || payload;
          } else if (effectiveType === 'recommend_card') {
            if (Array.isArray(payload.data || payload)) {
              recommendations = (payload.data || payload).map(item => item.queryPrompt || item.title || item.name || item);
            }
          } else {
            if (payload.content || payload.text) {
              fullText += (payload.content || payload.text);
            }
          }
        } catch (e) {
          if (dataStr && !dataStr.startsWith('{')) {
            fullText += dataStr;
          }
        }
      }

      function onStreamComplete() {
        if (!fullText.trim() && ambiguityData) {
          fullText = ambiguityData.message || '请选择您需要办理的具体情形：';
        }
        if (!fullText.trim()) {
          throw new Error('未获取到有效回答文本');
        }
        loadingElem.remove();
        renderPolicyAnswer({
          summary: fullText.trim(),
          citation: citationData,
          guidedSteps: guidedStepsData,
          suggestions: recommendations,
          scenarios: ambiguityData ? (ambiguityData.scenarios || []) : [],
          matchedItem: matchedItemData
        });
        submitBtn.disabled = false;
        scrollChatBottom();
      }

      function onStreamError(err) {
        console.error('[广州政务双Agent] 云端接口通信异常:', err);
        loadingElem.remove();
        renderPolicyAnswer({
          summary: '市民您好！当前政务智能云端服务暂未连通（云端接口：' + window.GzGovAiConfig.apiEndpoint + '）。\n\n【排查详情】' + (err && err.message ? err.message : '网络通信受阻') + '\n\n请确认同学的云端服务正常运行后重试，或拨打 12345 便民热线进行咨询。'
        });
        submitBtn.disabled = false;
        scrollChatBottom();
      }

      const gmXhr = (typeof GM_xmlhttpRequest === 'function') ? GM_xmlhttpRequest :
                    ((typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function') ? GM.xmlHttpRequest : null);

      if (gmXhr) {
        let seenBytes = 0;
        gmXhr({
          method: 'POST',
          url: window.GzGovAiConfig.apiEndpoint,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': 'Bearer ' + window.GzGovAiConfig.authToken,
            'Accept': 'text/event-stream'
          },
          data: JSON.stringify({
            query: content,
            sessionId: currentSessionId
          }),
          timeout: 45000,
          onprogress: function (response) {
            const text = response.responseText || '';
            const chunk = text.substring(seenBytes);
            seenBytes = text.length;
            sseBuffer += chunk;
            const blocks = sseBuffer.split('\n\n');
            sseBuffer = blocks.pop();
            for (let i = 0; i < blocks.length; i++) {
              handleSseBlock(blocks[i]);
            }
          },
          onload: function (response) {
            if (response.status >= 200 && response.status < 300) {
              const text = response.responseText || '';
              if (seenBytes < text.length) {
                sseBuffer += text.substring(seenBytes);
              }
              if (sseBuffer.trim()) {
                handleSseBlock(sseBuffer);
              }
              try {
                onStreamComplete();
              } catch (e) {
                onStreamError(e);
              }
            } else {
              onStreamError(new Error('云端服务响应状态异常: HTTP ' + response.status + ' ' + (response.statusText || '')));
            }
          },
          onerror: function (err) {
            onStreamError(new Error('跨域请求被拦截或网络连接失败'));
          },
          ontimeout: function () {
            onStreamError(new Error('云端大模型响应超时'));
          }
        });
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        fetch(window.GzGovAiConfig.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': 'Bearer ' + window.GzGovAiConfig.authToken,
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({
            query: content,
            sessionId: currentSessionId
          }),
          signal: controller.signal
        })
        .then(async response => {
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error('云端服务响应异常: ' + response.status + ' ' + response.statusText);
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });
            const blocks = sseBuffer.split('\n\n');
            sseBuffer = blocks.pop();
            for (let i = 0; i < blocks.length; i++) {
              handleSseBlock(blocks[i]);
            }
          }
          if (sseBuffer.trim()) {
            handleSseBlock(sseBuffer);
          }
          onStreamComplete();
        })
        .catch(err => {
          onStreamError(err);
        });
      }
    }


    function appendUserRow(text) {
      const div = document.createElement('div');
      div.className = 'chat-row user';
      div.setAttribute('data-user-query', text);
      div.innerHTML = `
        <div class="chat-meta-bar"><span class="chat-author">咨询市民</span></div>
        <div class="chat-bubble">${escapeText(text)}</div>
      `;
      chatMain.appendChild(div);
      scrollChatBottom();
    }

    function appendLoadingRow() {
      const div = document.createElement('div');
      div.className = 'chat-row ai loading';
      div.innerHTML = `
        <div class="chat-meta-bar">
          <span class="chat-author">叻仔</span>
        </div>
        <div class="chat-bubble" style="padding: 10px 14px;">
          <div class="typing-box" style="display: flex; align-items: center; gap: 4px;">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-stage-text" style="font-size: 12px; color: #64748b; margin-left: 6px;">智能研判中...</span>
          </div>
        </div>
      `;
      chatMain.appendChild(div);
      scrollChatBottom();
      return div;
    }

    function scrollChatBottom() {
      chatMain.scrollTop = chatMain.scrollHeight;
    }

    function escapeText(s) {
      if (!s) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function stripEmoji(s) {
      if (!s) return '';
      return s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F300}-\u{1F9FF}]/gu, '')
               .replace(/[\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF]/g, '')
               .trim();
    }

    function renderGovMarkdown(text) {
      if (!text) return '';
      const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const out = [];
      let inTable = false;
      let tableRows = [];
      let tableAligns = [];
      let inUl = false;
      let ulItems = [];
      let inOl = false;
      let olItems = [];

      function formatInline(str) {
        if (!str) return '';
        let s = escapeText(str);
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^\*])\*([^\*]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3');
        s = s.replace(/`([^`]+)`/g, '<code class="lezai-inline-code">$1</code>');
        s = s.replace(/\s*(➔|->|&gt;)\s*/g, ' <span class="lezai-flow-arrow">➔</span> ');
        return s;
      }

      function flushUl() {
        if (inUl) {
          out.push('<ul class="lezai-md-ul">' + ulItems.map(it => '<li>' + formatInline(it) + '</li>').join('') + '</ul>');
          inUl = false;
          ulItems = [];
        }
      }

      function flushOl() {
        if (inOl) {
          out.push('<ol class="lezai-md-ol">' + olItems.map(it => '<li>' + formatInline(it) + '</li>').join('') + '</ol>');
          inOl = false;
          olItems = [];
        }
      }

      function flushLists() {
        flushUl();
        flushOl();
      }

      function flushTable() {
        if (inTable && tableRows.length > 0) {
          let html = '<div class="lezai-table-scroll"><table class="lezai-md-table">';
          const header = tableRows[0];
          html += '<thead><tr>';
          for (let c = 0; c < header.length; c++) {
            const align = tableAligns[c] ? ' style="text-align:' + tableAligns[c] + ';"' : '';
            html += '<th' + align + '>' + formatInline(header[c]) + '</th>';
          }
          html += '</tr></thead><tbody>';
          for (let r = 1; r < tableRows.length; r++) {
            const row = tableRows[r];
            html += '<tr>';
            for (let c = 0; c < header.length; c++) {
              const cell = (c < row.length) ? row[c] : '';
              const align = tableAligns[c] ? ' style="text-align:' + tableAligns[c] + ';"' : '';
              html += '<td' + align + '>' + formatInline(cell) + '</td>';
            }
            html += '</tr>';
          }
          html += '</tbody></table></div>';
          out.push(html);
          inTable = false;
          tableRows = [];
          tableAligns = [];
        }
      }

      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
          flushLists();
          const rawCells = line.split('|');
          const cells = rawCells.slice(1, -1).map(c => c.trim());
          const isSep = cells.every(c => /^:?-+:?$/.test(c));
          if (isSep) {
            tableAligns = cells.map(c => {
              const left = c.startsWith(':');
              const right = c.endsWith(':');
              if (left && right) return 'center';
              if (right) return 'right';
              return 'left';
            });
            continue;
          }
          if (!inTable) {
            inTable = true;
            tableRows = [cells];
          } else {
            tableRows.push(cells);
          }
          continue;
        } else {
          flushTable();
        }

        const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
          flushLists();
          const level = headingMatch[1].length;
          const hText = headingMatch[2].trim();
          out.push('<div class="lezai-md-h lezai-md-h' + level + '">' + formatInline(hText) + '</div>');
          continue;
        }

        const ulMatch = line.match(/^[\*\-]\s+(.+)$/);
        if (ulMatch) {
          flushOl();
          inUl = true;
          ulItems.push(ulMatch[1]);
          continue;
        }

        const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (olMatch) {
          flushUl();
          inOl = true;
          olItems.push(olMatch[2]);
          continue;
        }

        if (!line) {
          flushLists();
          out.push('<div class="lezai-md-gap"></div>');
          continue;
        }

        flushLists();
        out.push('<p class="lezai-md-p">' + formatInline(line) + '</p>');
      }

      flushLists();
      flushTable();
      return out.join('');
    }
    function formatMarkdownLike(str) { return renderGovMarkdown(str); }


    // 核心渲染器：自然对话流 + 随文导办（彻底剔除生硬八股框）
    function renderPolicyAnswer(data) {
      const div = document.createElement('div');
      div.className = 'chat-row ai';

      // 提取纯净文本
      let cleanSummary = data.summary || data.conclusion || '';
      // 过滤任何遗留的八股标签
      cleanSummary = cleanSummary.replace(/【快速答疑】/g, '')
                                 .replace(/【办事要点】/g, '')
                                 .replace(/【注意事项与关键提醒】/g, '')
                                 .replace(/【官方政策依据】[\s\S]*$/g, '')
                                 .trim();

      const gs = data.guidedSteps || null;
      const citation = (data.citations && data.citations[0]) || data.citation || null;
      let citTitle = '';
      let citDocNumber = '';
      let citDept = '广州市人民政府';
      let citClause = '';
      if (citation) {
        if (citation.chunks && citation.chunks.length > 0) {
          const firstChunk = citation.chunks[0];
          citTitle = firstChunk.title || '法定政策依据';
          citDocNumber = firstChunk.level || '';
          citDept = firstChunk.level || '政务法规库';
          citClause = (firstChunk.articleLabel ? firstChunk.articleLabel + '：' : '') + (firstChunk.content || '');
        } else {
          citTitle = citation.title || citation.docTitle || '';
          citDocNumber = citation.docNumber || '';
          citDept = citation.dept || citation.issuerDept || '广州市人民政府';
          citClause = citation.clause || citation.clauseText || '';
          if (citation.clauseNo && citClause) {
            citClause = citation.clauseNo + '：' + citClause;
          }
        }
      }

      // 保障正文非空防御
      if (!cleanSummary) {
        cleanSummary = '市民您好！您咨询的政务事项已接入广州政务服务网及“穗好办”平台，符合条件的市民可备齐材料在线确认申报。';
      }

      // 构造自然文本主体
      let mainHtml = `<div class="lezai-natural-paragraph">${renderGovMarkdown(cleanSummary)}</div>`;

      // 随文办事导办清单 (若有事项指引，以极简流线呈现，无嵌套丑陋边框)
      if (gs && (gs.qualifications || (gs.materials && gs.materials.length > 0) || (gs.processSteps && gs.processSteps.length > 0))) {
        let flowHtml = '<div class="lezai-affair-flow">';

        if (gs.qualifications) {
          flowHtml += `
            <div>
              <div class="flow-sec-title">准入条件</div>
              <div class="flow-sec-content">${formatMarkdownLike(gs.qualifications)}</div>
            </div>
          `;
        }

        if (gs.materials && gs.materials.length > 0) {
          flowHtml += `
            <div>
              <div class="flow-sec-title">申报材料清单</div>
              <ul class="flow-mat-list">
                ${gs.materials.map(m => `<li><strong>${escapeText(m.name)}</strong></li>`).join('')}
              </ul>
            </div>
          `;
        }

        if (gs.processSteps && gs.processSteps.length > 0) {
          flowHtml += `
            <div>
              <div class="flow-sec-title">办理流程与渠道</div>
              <div class="flow-sec-content" style="margin-bottom:6px;">
                承诺时限：<strong>${escapeText(gs.promisedLimitDays ? gs.promisedLimitDays + '个工作日' : '法定办结')}</strong>
                ${gs.handlingAddress ? ' &nbsp;·&nbsp; 网点：' + escapeText(gs.handlingAddress) : ''}
              </div>
              <div class="flow-step-list">
                ${gs.processSteps.map((p, idx) => `
                  <div class="flow-step-item">${idx + 1}. <strong>${escapeText(p.stepName)}</strong>: ${escapeText(p.description)}</div>
                `).join('')}
              </div>
            </div>
          `;
        }

        // 广东政务服务网官方办理直达链接
        if (gs.onlineHandleUrl) {
          flowHtml += `
            <div class="lezai-direct-btn-wrap">
              <a class="lezai-direct-btn" href="${escapeText(gs.onlineHandleUrl)}" target="_blank" rel="noopener noreferrer">
                点击直达广东政务服务网申报入口 [${escapeText(gs.affairCode || '在线申办')}] ↗
              </a>
            </div>
          `;
        }

        // 软提示
        if (gs.warnTip) {
          flowHtml += `
            <div class="lezai-tip-note">
              <strong>温馨提示：</strong>${formatMarkdownLike(gs.warnTip)}
            </div>
          `;
        }

        flowHtml += '</div>';
        mainHtml += flowHtml;
      }

      // 匹配到的政务事项直通卡
      let matchedItemHtml = '';
      if (data.matchedItem && !gs) {
        const mi = data.matchedItem;
        const miName = mi.itemName || mi.name || '政务办事事项';
        const miDept = mi.deptName || mi.dept || '';
        const miUrl = mi.applyUrl || mi.url || '';
        matchedItemHtml = `
          <div class="lezai-matched-item-box" style="margin-top: 10px; padding: 10px 12px; background: #f0f7ff; border-radius: 8px; border: 1px solid #d0e7ff;">
            <div style="font-weight: 600; color: #0071e3; font-size: 13px;">${escapeText(miName)}</div>
            ${miDept ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">办理部门：${escapeText(miDept)}</div>` : ''}
            ${miUrl ? `
              <div style="margin-top: 6px;">
                <a class="lezai-direct-btn" href="${escapeText(miUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 4px 10px; font-size: 12px; background: #0071e3; color: #fff; border-radius: 6px; text-decoration: none;">
                  广东政务服务网申报入口 ↗
                </a>
              </div>
            ` : ''}
          </div>
        `;
      }

      // 多情形歧义一键选择卡片 (双 Agent ambiguity 协同)
      let scenarioHtml = '';
      if (data.scenarios && data.scenarios.length > 0) {
        scenarioHtml = `
          <div class="bubble-scenarios">
            <div style="font-size: 12px; font-weight: 600; color: #0071e3; margin-bottom: 2px;">请选择您需要办理的具体情形：</div>
            ${data.scenarios.map(sc => {
              const idx = (typeof sc === 'object' && sc.index !== undefined) ? sc.index : '';
              const label = (typeof sc === 'object') ? (sc.label || sc.officialName || sc.name || '') : String(sc);
              const queryVal = idx ? String(idx) : label;
              return `
                <button class="scenario-option-btn" data-query="${escapeText(queryVal)}">
                  ${idx ? `<strong>[${escapeText(String(idx))}]</strong> ` : ''}${escapeText(label)}
                </button>
              `;
            }).join('')}
          </div>
        `;
      }

      // 政策依据左下角轻量单行注脚
      let footnoteHtml = '';
      if (citTitle) {
        const drawerId = 'drawer-' + Math.random().toString(36).substring(2, 9);
        footnoteHtml = `
          <div class="source-footnote-line">
            <span>政策依据：《${escapeText(citTitle)}》${citDocNumber ? '（' + escapeText(citDocNumber) + '）' : ''}</span>
            <span>·</span>
            <button class="source-btn-toggle" data-target="${drawerId}">查看条文原文 ▾</button>
          </div>
          <div class="source-clause-drawer" id="${drawerId}">
            <div style="font-weight:600;margin-bottom:4px;color:#0056b3;">${escapeText(citTitle)}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:6px;">制定机关：${escapeText(citDept)}</div>
            <div>${formatMarkdownLike(citClause || '条文内容已依法在广州市政策公文库备案。')}</div>
          </div>
        `;
      }

      // 延伸咨询标签
      let suggHtml = '';
      if (data.suggestions && data.suggestions.length > 0) {
        suggHtml = `
          <div class="bubble-suggestions">
            ${data.suggestions.map(s => `<span class="sugg-chip" data-query="${escapeText(s)}">${escapeText(s)}</span>`).join('')}
          </div>
        `;
      }

      // 操作条 (复制 · 有疑问)
      const actionsHtml = `
        <div class="bubble-action-bar">
          <button class="action-text-btn btn-copy-reply">复制</button>
          <span>·</span>
          <button class="action-text-btn btn-doubt-reply">有疑问?</button>
        </div>
      `;

      div.innerHTML = `
        <div class="chat-meta-bar">
          <span class="chat-author">叻仔</span>
        </div>
        <div class="chat-bubble">
          ${mainHtml}
          ${matchedItemHtml}
          ${scenarioHtml}
          ${footnoteHtml}
          ${suggHtml}
          ${actionsHtml}
        </div>
      `;

      // 绑定多情形点击选项
      div.querySelectorAll('.scenario-option-btn').forEach(btn => {
        btn.onclick = () => {
          const q = btn.getAttribute('data-query');
          if (q) {
            textInput.value = '';
            doSendMessage(q);
          }
        };
      });

      // 绑定抽屉折叠
      div.querySelectorAll('.source-btn-toggle').forEach(btn => {
        btn.onclick = () => {
          const targetId = btn.getAttribute('data-target');
          const drawer = div.querySelector('#' + targetId);
          if (drawer) {
            drawer.classList.toggle('open');
            btn.textContent = drawer.classList.contains('open') ? '收起条文原文 ▴' : '查看条文原文 ▾';
          }
        };
      });

      // 绑定复制
      const copyBtn = div.querySelector('.btn-copy-reply');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(cleanSummary).then(() => {
            copyBtn.textContent = '已复制';
            setTimeout(() => { copyBtn.textContent = '复制'; }, 1500);
          });
        };
      }

      // 绑定延伸追问点击
      div.querySelectorAll('.sugg-chip').forEach(ch => {
        ch.onclick = () => {
          const q = ch.getAttribute('data-query');
          if (q) {
            textInput.value = '';
            doSendMessage(q);
          }
        };
      });

      chatMain.appendChild(div);
      scrollChatBottom();
    }

    
  }

  if (!document.body && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssistant);
  } else {
    initAssistant();
  }
})();
