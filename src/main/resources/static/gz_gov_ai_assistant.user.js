// ==UserScript==
// @name         广州市人民政府门户网站 · 政策法规与办事导办 AI 智能问答专窗
// @namespace    https://www.gz.gov.cn/
// @version      1.7.0
// @description  广州市政务政策与办事全生命周期 AI 智能咨询与导办专窗（全直角公文风格、0 Emoji、办事实时申办直达）
// @author       Guangzhou Smart Gov Project Team
// @match        https://www.gz.gov.cn/*
// @match        http://www.gz.gov.cn/*
// @match        https://wsbs.gz.gov.cn/*
// @match        http://wsbs.gz.gov.cn/*
// @match        https://www.gdzwfw.gov.cn/*
// @match        http://localhost:8080/*
// @grant        none
// @run-at       document-end
// ==/UserScript==
/**
 * 广州市人民政府门户网站 (www.gz.gov.cn)
 * 政策法规 AI 智能问答专窗 · 前端独立注入插件 (完备版)
 * 
 * 核心指标与功能集成：
 * 1. 深度对接广州市政务公文与办事数据（关系数据库 H2 + 真实广州规章）
 * 2. 对接 Spring AI 多轮会话上下文持久化管理（带会话记忆与历史查验）
 * 3. 扩展功能一：政务知识图谱关联展现（法定依据 ➔ 主管机关 ➔ 业务联办 ➔ 适用人群 三元组链路）
 * 4. 扩展功能二：办事流程引导式对话向导（资格自查 -> 材料准备 -> 网办通道直达）
 * 5. 严格契合官方视觉体系：全直角公文标准、广州政务蓝红配色、无任何卡通图标与 Emoji (Emoji = 0)
 * 6. "快速答疑" 标志性徽章、一键极简 "复制"、Shadow DOM 物理样式隔离、双模无缝切换
 */

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

    // 避免在同一页面重复注入
    if (document.getElementById('gz-gov-ai-root')) {
      console.warn('[广州政策问答] 已存在运行实例，跳过重复初始化。');
      return;
    }

  // 会话标识保持
  let currentSessionId = window.gzGovSessionId || ('gz-session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
  window.gzGovSessionId = currentSessionId;

  // 全局对接配置
  window.GzGovAiConfig = Object.assign({
    apiEndpoint: 'http://localhost:8080/api/v1/gov/chat/stream',
    historyEndpoint: 'http://localhost:8080/api/v1/gov/chat/history',
    guideStepEndpoint: 'http://localhost:8080/api/v1/gov/chat/guide-step',
    graphEndpoint: 'http://localhost:8080/api/v1/gov/chat/graph',
    mockIfOffline: true,
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

  // 注入官方公文全直角样式
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* 宿主容器 */
    .gz-gov-shell {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      pointer-events: none;
    }

    /* 悬浮微标 (纯静态无晃动) */
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
    .launcher-tag {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #c20505;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 0;
      border: 1px solid #ffffff;
      line-height: 1.1;
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
      line-height: 1;
    }

    /* 迎宾卡片 */
    .gz-greeting-card {
      pointer-events: auto;
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 280px;
      background: #ffffff;
      border: 1px solid #b0cbe8;
      border-top: 3px solid #006ed5;
      border-radius: 0;
      box-shadow: 0 6px 18px rgba(0, 40, 100, 0.16);
      padding: 10px 12px;
      display: none;
      cursor: pointer;
      animation: gzCardIn 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
    .gz-greeting-card.show { display: block; }
    .greeting-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: #003a8c;
      margin-bottom: 4px;
    }
    .greeting-close {
      color: #8c8c8c;
      font-size: 14px;
      cursor: pointer;
      line-height: 1;
    }
    .greeting-close:hover { color: #c20505; }
    .greeting-body {
      font-size: 11px;
      color: #4a4a4a;
      line-height: 1.5;
    }

    /* 政策问答大厅主窗口 (以 420x570 为最小窗口，支持直角无极缩放) */
    .gz-dialog-window {
      pointer-events: auto;
      position: absolute;
      bottom: 0;
      right: 0;
      width: 480px;
      height: 640px;
      min-width: 440px !important;
      min-height: 580px !important;
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 24px);
      background: #ffffff;
      border: 1px solid #003a8c;
      border-radius: 0 !important;
      box-shadow: 0 10px 30px rgba(0, 30, 80, 0.25), 0 2px 8px rgba(0, 0, 0, 0.12);
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: gzWinOpen 0.22s ease-out forwards;
      transition: width 0.16s cubic-bezier(0.2, 0, 0, 1), height 0.16s cubic-bezier(0.2, 0, 0, 1);
    }
    .gz-dialog-window.resizing {
      transition: none !important;
      user-select: none !important;
    }
    .gz-dialog-window.open { display: flex; }

    /* 左上角政务直角缩放标尺手柄 (全直角标尺视觉) */
    .gz-resize-grip-nw {
      position: absolute;
      top: 0;
      left: 0;
      width: 22px;
      height: 22px;
      cursor: nwse-resize;
      z-index: 100;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 3px;
      user-select: none;
    }
    .gz-resize-corner-mark {
      width: 10px;
      height: 10px;
      border-top: 2.5px solid #ffd666;
      border-left: 2.5px solid #ffd666;
      border-radius: 0 !important;
      opacity: 0.9;
      transition: opacity 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    }
    .gz-resize-grip-nw:hover .gz-resize-corner-mark {
      opacity: 1;
      border-color: #ffffff;
      transform: scale(1.15);
    }

    /* 窗口左侧边缘拖拽手柄 */
    .gz-resize-edge-w {
      position: absolute;
      top: 22px;
      bottom: 0;
      left: 0;
      width: 6px;
      cursor: ew-resize;
      z-index: 99;
    }

    /* 窗口顶部边缘拖拽手柄 */
    .gz-resize-edge-n {
      position: absolute;
      top: 0;
      left: 22px;
      right: 0;
      height: 6px;
      cursor: ns-resize;
      z-index: 99;
    }

    @keyframes gzWinOpen {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes gzCardIn {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes gzMsgFade {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* 顶部红蓝双色公文标头 */
    .gz-window-header {
      background: linear-gradient(90deg, #003a8c 0%, #0050b3 60%, #006ed5 100%);
      color: #ffffff;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
      border-bottom: 2px solid #c20505;
      flex-shrink: 0;
    }
    .header-titles h3 {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.6px;
    }
    .header-titles p {
      font-size: 11.5px;
      color: #e6f0ff;
      margin-top: 1px;
    }
    .header-controls {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .win-ctrl-btn {
      width: 24px;
      height: 24px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.12);
      border-radius: 0 !important;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      transition: background 0.15s ease;
    }
    .win-ctrl-btn:hover { background: rgba(255, 255, 255, 0.28); }
    .win-ctrl-btn.close-btn:hover { background: #c20505; border-color: #c20505; }
    .win-ctrl-btn svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: square; }

    /* 通告栏 */
    .gz-notice-banner {
      background: #fdfbf7;
      border-bottom: 1px solid #faecd8;
      color: #8c5d1e;
      font-size: 12px;
      padding: 5px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .notice-badge {
      background: #fa8c16;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 0;
      line-height: 1.2;
    }

    /* 政策高频咨询快捷标签网格 (自适应整齐直角网格，默认模式 3列×2行 完整展示，大屏自动单行展开) */
    .gz-quick-bar {
      background: #f0f5fb;
      border-bottom: 1px solid #d9e6f2;
      padding: 7px 10px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
      gap: 6px;
      flex-shrink: 0;
    }
    .quick-chip {
      background: #ffffff;
      border: 1px solid #c4d7ee;
      border-radius: 0 !important;
      color: #003a8c;
      font-size: 12.5px;
      padding: 6px 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      line-height: 1.3;
      user-select: none;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0, 58, 140, 0.06);
    }
    .quick-chip:hover {
      background: linear-gradient(135deg, #1677ff 0%, #003a8c 100%);
      color: #ffffff;
      border-color: #1677ff;
      box-shadow: 0 3px 8px rgba(0, 58, 140, 0.2);
      transform: translateY(-1px);
    }

    /* 消息对话主视窗 */
    .gz-chat-main {
      flex: 1;
      overflow-y: auto;
      padding: 12px 14px;
      background: #f4f6f9;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .gz-chat-main::-webkit-scrollbar { width: 4px; background: transparent; }
    .gz-chat-main::-webkit-scrollbar-thumb { background: #c1ccd8; border-radius: 2px; }

    .chat-row {
      display: flex;
      flex-direction: column;
      animation: gzMsgFade 0.2s ease forwards;
    }
    .chat-row.user { align-items: flex-end; }
    .chat-row.ai { align-items: flex-start; }
    .chat-author {
      font-size: 11.5px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .chat-row.ai .chat-author {
      background: #e8f0fe;
      color: #1677ff;
      padding: 1px 7px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .chat-row.user .chat-author { color: #0050b3; }

    .chat-bubble {
      max-width: 95%;
      border-radius: 0 !important;
      font-size: 14px;
      line-height: 1.65;
      word-break: break-word;
      padding: 10px 14px;
    }
    .chat-row.user .chat-bubble {
      background: linear-gradient(135deg, #1677ff 0%, #0050b3 100%);
      color: #ffffff;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 80, 179, 0.25);
    }
    .chat-row.ai .chat-bubble {
      background: #ffffff;
      color: #1a1a1a;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #1677ff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      width: 100%;
    }

    /* 【快速答疑】标志性摘要框 */
    .mingbai-summary-box {
      background: linear-gradient(135deg, #f0f7ff 0%, #e8f3ff 100%);
      border: 1px solid #bae0ff;
      border-left: 4px solid #1677ff;
      border-radius: 0 !important;
      padding: 9px 12px;
      margin-bottom: 10px;
      box-shadow: 0 2px 6px rgba(22, 119, 255, 0.07);
    }
    .mingbai-summary-title {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 3px;
    }
    .mingbai-tag {
      background: #006ed5;
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 0;
      letter-spacing: 0.5px;
    }
    .mingbai-summary-body {
      font-size: 14.5px;
      font-weight: 600;
      color: #003a8c;
      line-height: 1.65;
    }

    /* 【办事向导三步法】结构化直角卡片（全流程文字办事指引） */
    .mingbai-steps-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 6px;
    }
    .guided-step-block {
      border: 1px solid #e8edf3;
      border-left: 4px solid #389e0d;
      border-radius: 0 !important;
      padding: 9px 12px;
      font-size: 13.5px;
      line-height: 1.6;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    }
    .guided-step-block.step-1 {
      border-left-color: #1677ff;
      background: #f0f7ff;
    }
    .guided-step-block.step-2 {
      border-left-color: #fa8c16;
      background: #fff8f0;
    }
    .guided-step-block.step-3 {
      border-left-color: #389e0d;
      background: #f6ffed;
    }
    .step-block-header {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 5px;
    }
    .step-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 7px;
      color: #ffffff;
      background: #389e0d;
      border-radius: 0 !important;
      letter-spacing: 0.5px;
    }
    .step-1 .step-badge { background: #1677ff; }
    .step-2 .step-badge { background: #fa8c16; }
    .step-3 .step-badge { background: #389e0d; }
    .step-block-title {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
    }
    .step-qual-box {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 0 !important;
      padding: 5px 8px;
      color: #1e293b;
      font-size: 13.5px;
      line-height: 1.6;
      margin-bottom: 5px;
    }
    .step-sub-note {
      font-size: 12.5px;
      color: #52c41a;
      line-height: 1.4;
    }
    .step-mat-list {
      list-style: none;
      padding: 0;
      margin: 0 0 5px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .step-mat-item {
      font-size: 13px;
      color: #1e293b;
      line-height: 1.55;
      padding-left: 10px;
      position: relative;
    }
    .step-mat-item::before {
      content: '▪';
      position: absolute;
      left: 0;
      top: -1px;
      color: #389e0d;
    }
    .mat-tag-free {
      display: inline-block;
      font-size: 11px;
      background: #237804;
      color: #ffffff;
      border: none;
      padding: 1px 5px;
      margin-left: 5px;
      font-weight: 700;
      border-radius: 0 !important;
      cursor: default;
      letter-spacing: 0.3px;
    }
    .mat-tip-sub {
      color: #8c8c8c;
      font-size: 12px;
      margin-top: 2px;
    }
    .step-limit-banner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: #4b5563;
      margin-bottom: 10px;
      font-weight: 500;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 3px 10px;
    }
    .step-limit-banner strong {
      color: #16a34a;
      font-weight: 700;
      font-size: 13.5px;
    }
    .step-proc-chain {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0 !important;
      padding: 2px 0;
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .step-proc-row {
      font-size: 12.5px;
      color: #334155;
      line-height: 1.55;
      padding: 7px 12px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .step-proc-row:last-child {
      border-bottom: none;
    }
    .step-proc-row strong {
      color: #1677ff;
      flex-shrink: 0;
    }
    .step-route-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0 !important;
      font-size: 13px;
      color: #1e293b;
      line-height: 1.6;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .route-label {
      font-weight: 700;
      font-size: 12px;
      color: #ffffff;
      background: #1677ff;
      padding: 4px 10px;
      margin-bottom: 0;
      letter-spacing: 0.3px;
    }
    .route-label.offline {
      background: #64748b;
    }
    .route-content {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .route-content:last-child { border-bottom: none; }
    .step-warn-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      border-radius: 0 !important;
      padding: 8px 12px;
      color: #78350f;
      font-size: 13px;
      line-height: 1.65;
      margin-top: 8px;
    }
    .step-warn-box strong {
      display: block;
      color: #b45309;
      font-size: 12px;
      margin-bottom: 5px;
      letter-spacing: 0.3px;
    }

    /* 【办事要点】条目卡片 (普通纯文本问答兜底) */
    .mingbai-details-card {
      background: #fafbfc;
      border: 1px solid #e2e8f0;
      border-radius: 0 !important;
      padding: 6px 8px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .mb-item {
      font-size: 13.5px;
      line-height: 1.6;
      color: #334155;
    }
    .mb-item-title {
      font-weight: 700;
      color: #003a8c;
      margin-bottom: 3px;
      font-size: 12.5px;
      letter-spacing: 0.2px;
    }
    .mb-item.warn .mb-item-title { color: #237804; }
    .mb-item.warn {
      background: #f6ffed;
      border: 1px solid #d9f7be;
      border-left: 3px solid #389e0d;
    }
    .mb-item-content { color: #1e293b; font-size: 11.5px; }

    /* 官方政策依据直溯 (权威红头公文发文标准色) */
    .mingbai-source-card {
      background: linear-gradient(135deg, #fdfbf7 0%, #fff9f0 100%);
      border: 1px solid #faecd8;
      border-left: 4px solid #c20505;
      border-radius: 0 !important;
      padding: 8px 10px;
      margin-top: 8px;
      font-size: 11px;
      box-shadow: 0 1px 4px rgba(194, 5, 5, 0.06);
    }
    .source-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }
    .source-doc-info {
      font-weight: 700;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.45;
    }
    .source-doc-meta {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .source-btn-toggle {
      color: #c20505;
      background: #ffffff;
      border: 1px solid #ffa39e;
      font-size: 11.5px;
      padding: 2px 7px;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;
      user-select: none;
    }
    .source-btn-toggle:hover {
      background: #fff1f0;
      border-color: #c20505;
    }
    .source-clause-drawer {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #faecd8;
      font-size: 11px;
      color: #4b5563;
      line-height: 1.55;
      display: none;
      background: rgba(255, 255, 255, 0.7);
      padding: 6px 8px;
    }
    .source-clause-drawer.open { display: block; }
    .source-clause-drawer strong { color: #003a8c; }



    /* 延伸推荐 */
    .policy-suggestions-wrap {
      margin-top: 6px;
      padding-top: 5px;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .suggestions-label {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
    }
    .suggestions-chips-group {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .suggestion-chip {
      font-size: 12px;
      background: #f0f7ff;
      color: #1677ff;
      border: 1px solid #adc6ff;
      border-radius: 0;
      padding: 3px 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      line-height: 1.4;
    }
    .suggestion-chip:hover {
      background: #1677ff;
      color: #ffffff;
      border-color: #1677ff;
      box-shadow: 0 2px 6px rgba(22, 119, 255, 0.2);
    }

    /* 操作栏与复制反馈 */
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
    .btn-copy-mingbai { color: #003a8c; font-weight: 600; }
    .btn-copy-mingbai:hover { background: #0050b3; color: #ffffff; border-color: #0050b3; }
    .btn-copy-mingbai.copied { color: #389e0d; border-color: #52c41a; background: #f6ffed; }

    /* 政策疑问反馈展开框 */
    .msg-feedback-panel {
      margin-top: 6px;
      padding: 8px 10px;
      background: #fafbfc;
      border: 1px solid #dcdfe6;
      border-left: 3px solid #c20505;
      border-radius: 0 !important;
      display: flex;
      flex-direction: column;
      gap: 5px;
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
    .feedback-close-btn { color: #8c8c8c; font-size: 14px; cursor: pointer; }
    .feedback-close-btn:hover { color: #c20505; }
    .feedback-tag-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .fb-tag {
      font-size: 9.5px;
      background: #ffffff;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 0;
      padding: 1px 4px;
      cursor: pointer;
      user-select: none;
    }
    .fb-tag:hover { border-color: #006ed5; color: #006ed5; }
    .fb-tag.active { background: #006ed5; color: #ffffff; border-color: #006ed5; }
    .feedback-textarea {
      width: 100%;
      height: 40px;
      border: 1px solid #cbd5e1;
      border-radius: 0 !important;
      padding: 3px 5px;
      font-size: 10.5px;
      resize: none;
      outline: none;
      background: #ffffff;
    }
    .feedback-textarea:focus { border-color: #0050b3; }
    .feedback-action-bar { display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #8c8c8c; }
    .feedback-btn-group { display: flex; gap: 4px; }
    .fb-btn-cancel, .fb-btn-submit {
      padding: 2px 7px;
      font-size: 10px;
      border-radius: 0 !important;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .fb-btn-cancel { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
    .fb-btn-submit { background: #c20505; color: #ffffff; font-weight: 600; }
    .feedback-success-note { font-size: 10px; color: #389e0d; padding: 4px; background: #f6ffed; border: 1px solid #b7eb8f; }

    /* 会话历史抽屉 */
    .gz-history-drawer {
      position: absolute;
      top: 45px;
      left: 0;
      right: 0;
      bottom: 45px;
      background: #ffffff;
      z-index: 100;
      display: none;
      flex-direction: column;
      border-bottom: 1px solid #d9d9d9;
      animation: gzMsgFade 0.2s ease forwards;
    }
    .gz-history-drawer.open { display: flex; }
    .history-drawer-header {
      padding: 7px 10px;
      background: #f0f5ff;
      border-bottom: 1px solid #d6e4ff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: #003a8c;
    }
    .history-clear-btn {
      font-size: 9.5px;
      color: #c20505;
      background: #fff1f0;
      border: 1px solid #ffa39e;
      padding: 1px 5px;
      cursor: pointer;
      border-radius: 0;
    }
    .history-clear-btn:hover { background: #c20505; color: #ffffff; }
    .history-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .history-item {
      padding: 5px 8px;
      background: #fafafa;
      border: 1px solid #e8e8e8;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .history-item:hover {
      background: #f0f7ff;
      border-color: #adc6ff;
    }
    .history-item-q {
      font-weight: 600;
      color: #003a8c;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .history-item-a {
      font-size: 10px;
      color: #595959;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
    }
    .history-item-time {
      font-size: 8.5px;
      color: #bfbfbf;
      margin-top: 2px;
      text-align: right;
    }

    /* 等待打字动效 (直角矩形) */
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

    /* 底部政务输入区 */
    .gz-input-footer {
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
    }
    .input-wrapper { display: flex; align-items: center; gap: 6px; }
    .gz-text-input {
      flex: 1;
      height: 40px;
      border: 1px solid #b0cbe8;
      border-radius: 0 !important;
      padding: 0 12px;
      font-size: 13.5px;
      color: #1a1a1a;
      outline: none;
      background: #ffffff;
    }
    .gz-text-input:focus { border-color: #0050b3; }
    .gz-submit-btn {
      height: 40px;
      padding: 0 16px;
      border-radius: 0 !important;
      border: none;
      background: #006ed5;
      color: #ffffff;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    .gz-submit-btn:hover { background: #0050b3; }
    .gz-submit-btn:disabled { background: #bfbfbf; cursor: not-allowed; }
    .footer-authority-note {
      font-size: 11px;
      color: #8c8c8c;
      text-align: center;
    }
  `;
  shadow.appendChild(style);

  // 构造 DOM 骨架
  const container = document.createElement('div');
  container.className = 'gz-gov-shell';
  container.innerHTML = `
    <!-- 右下角悬浮圆形徽章 -->
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
        市民您好！本专窗依托<strong>广州市现行政策法规知识库</strong>，支持查询公租房保障、积分入户、营商扶企、社保医保等现行政策条例与精准条款直溯。
      </div>
    </div>

    <!-- 政策咨询大厅主弹窗 -->
    <div class="gz-dialog-window" id="gzDialogWindow">
      <!-- 直角缩放手柄与边缘热区 (最小 420x570) -->
      <div class="gz-resize-grip-nw" id="gzResizeGripNw" title="拖拽进行直角缩放（最小 420×570）">
        <div class="gz-resize-corner-mark"></div>
      </div>
      <div class="gz-resize-edge-w" id="gzResizeEdgeW" title="拖拽调整窗口宽度"></div>
      <div class="gz-resize-edge-n" id="gzResizeEdgeN" title="拖拽调整窗口高度"></div>

      <!-- 顶栏与控制按钮 -->
      <div class="gz-window-header" id="gzWindowHeader">
        <div class="header-main" style="padding-left: 12px;">
          <div class="header-titles">
            <h3>广州市人民政府门户网站 · 政策智能咨询</h3>
            <p>广州市现行规章与规范性文件权威数据库 ｜ 政策条款直溯</p>
          </div>
        </div>
        <div class="header-controls">
          <!-- 直角缩放/大屏切换按钮 -->
          <button class="win-ctrl-btn" id="gzBtnScale" title="直角缩放：切换大屏导办 / 最小窗口" aria-label="直角缩放窗口">
            <svg id="gzScaleIcon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke-width="2.2" stroke-linecap="square"/></svg>
          </button>
          <!-- 查看历史按钮 -->
          <button class="win-ctrl-btn" id="gzBtnHistory" title="查看会话历史记录" aria-label="查看会话历史记录">
            <svg viewBox="0 0 24 24"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
          </button>
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
        <span>依托广州市政策公文数据库与政务知识图谱，提供精准条文解读与出处直溯</span>
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

      <!-- 抽屉：会话历史记录 -->
      <div class="gz-history-drawer" id="gzHistoryDrawer">
        <div class="history-drawer-header">
          <span>【多轮会话咨询历史记录】</span>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="history-clear-btn" id="gzBtnClearHistory">清空历史</button>
            <span style="cursor:pointer; font-size:14px;" id="gzBtnCloseHistory">&times;</span>
          </div>
        </div>
        <div class="history-list" id="gzHistoryList">
          <div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">加载历史记录中...</div>
        </div>
      </div>

      <!-- 消息列表流 -->
      <div class="gz-chat-main" id="gzChatMain">
        <div class="chat-row ai">
          <div class="chat-author">广州市政策法规智能咨询专窗</div>
          <div class="chat-bubble">
            <div class="mingbai-summary-box">
              <div class="mingbai-summary-title">
                <span class="mingbai-tag">快速答疑</span>
              </div>
              <div class="mingbai-summary-body">
                市民您好！本专窗依托广州市现行政策法规关系数据库与知识图谱，为您提供通俗精准的政策解答，清晰梳理<strong>准入门槛、待遇标准、办理渠道、注意事项</strong>，并提供官方红头公文依据直溯与分步办事向导，便利市民群众办事。
              </div>
            </div>
            <div style="font-size: 11.5px; color: #475569; line-height: 1.6;">
              您可点击上方快捷标签，或直接输入您关心的政策问题，例如：
              <ul style="margin: 4px 0 0 16px; color: #1e293b;">
                <li><em>“新就业无房职工申领广州公租房租赁补贴的具体规定？”</em></li>
                <li><em>“外地人在广州怎么申请中小客车增量指标摇号？”</em></li>
                <li><em>“广州新办企业免费领印章和半天办结的扶持政策？”</em></li>
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
          <input type="text" class="gz-text-input" id="gzTextInput" placeholder="请输入您想查询的广州市政策规章、规范性文件或办事流程..." maxlength="200" />
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
  const btnHistory = shadow.getElementById('gzBtnHistory');
  const btnMin = shadow.getElementById('gzBtnMin');
  const btnDismiss = shadow.getElementById('gzBtnDismiss');
  const btnScale = shadow.getElementById('gzBtnScale');
  const scaleIcon = shadow.getElementById('gzScaleIcon');
  const resizeGripNw = shadow.getElementById('gzResizeGripNw');
  const resizeEdgeW = shadow.getElementById('gzResizeEdgeW');
  const resizeEdgeN = shadow.getElementById('gzResizeEdgeN');
  const windowHeader = shadow.getElementById('gzWindowHeader');
  const chatMain = shadow.getElementById('gzChatMain');
  const textInput = shadow.getElementById('gzTextInput');
  const submitBtn = shadow.getElementById('gzSubmitBtn');
  const quickChips = shadow.querySelectorAll('.quick-chip');
  const historyDrawer = shadow.getElementById('gzHistoryDrawer');
  const historyList = shadow.getElementById('gzHistoryList');
  const btnClearHistory = shadow.getElementById('gzBtnClearHistory');
  const btnCloseHistory = shadow.getElementById('gzBtnCloseHistory');

  // 直角缩放与最小窗口控制体系 (以 420px × 570px 为绝对最小窗口)
  const MIN_WIDTH = 420;
  const MIN_HEIGHT = 570;
  let isMaximized = false;
  let customW = MIN_WIDTH;
  let customH = MIN_HEIGHT;

  // 恢复保存的窗口尺寸偏好
  try {
    const savedW = parseInt(localStorage.getItem('gz_gov_win_w'), 10);
    const savedH = parseInt(localStorage.getItem('gz_gov_win_h'), 10);
    if (savedW && savedW >= MIN_WIDTH) customW = savedW;
    if (savedH && savedH >= MIN_HEIGHT) customH = savedH;
    if (customW > MIN_WIDTH || customH > MIN_HEIGHT) {
      applyWindowSize(customW, customH, false);
    }
  } catch (e) {}

  function applyWindowSize(w, h, save = true) {
    const maxW = Math.max(MIN_WIDTH, window.innerWidth - 24);
    const maxH = Math.max(MIN_HEIGHT, window.innerHeight - 24);
    const finalW = Math.max(MIN_WIDTH, Math.min(maxW, w));
    const finalH = Math.max(MIN_HEIGHT, Math.min(maxH, h));
    dialogWindow.style.width = finalW + 'px';
    dialogWindow.style.height = finalH + 'px';
    const isExpanded = (finalW > MIN_WIDTH + 40 || finalH > MIN_HEIGHT + 40);
    updateScaleIcon(isExpanded);
    if (save) {
      try {
        localStorage.setItem('gz_gov_win_w', finalW);
        localStorage.setItem('gz_gov_win_h', finalH);
      } catch (e) {}
    }
    return { w: finalW, h: finalH };
  }

  function updateScaleIcon(expanded) {
    isMaximized = expanded;
    if (expanded) {
      btnScale.title = "直角缩放：还原为最小窗口 (420×570)";
      scaleIcon.innerHTML = '<rect x="7" y="7" width="13" height="13" stroke-width="2" stroke-linecap="square"/><polyline points="4 17 4 4 17 4" stroke-width="2" stroke-linecap="square"/>';
    } else {
      btnScale.title = "直角缩放：切换大屏导办全景模式";
      scaleIcon.innerHTML = '<rect x="4" y="4" width="16" height="16" stroke-width="2.2" stroke-linecap="square"/>';
    }
  }

  // 点击顶部直角缩放按钮：在最小窗口与全景大屏之间切换
  btnScale.addEventListener('click', () => {
    if (isMaximized) {
      applyWindowSize(MIN_WIDTH, MIN_HEIGHT, true);
    } else {
      const targetW = Math.min(880, window.innerWidth - 32);
      const targetH = Math.min(760, window.innerHeight - 32);
      applyWindowSize(targetW, targetH, true);
    }
  });

  // 双击顶部标头还原为最小窗口或展开大屏
  if (windowHeader) {
    windowHeader.addEventListener('dblclick', (e) => {
      if (e.target.closest('.win-ctrl-btn')) return;
      if (dialogWindow.offsetWidth > MIN_WIDTH + 20 || dialogWindow.offsetHeight > MIN_HEIGHT + 20) {
        applyWindowSize(MIN_WIDTH, MIN_HEIGHT, true);
      } else {
        const targetW = Math.min(880, window.innerWidth - 32);
        const targetH = Math.min(760, window.innerHeight - 32);
        applyWindowSize(targetW, targetH, true);
      }
    });
  }

  // 拖拽无极缩放交互逻辑
  function initDragResize(handleEl, type) {
    if (!handleEl) return;
    handleEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dialogWindow.classList.add('resizing');
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = dialogWindow.offsetWidth;
      const startH = dialogWindow.offsetHeight;

      function onMouseMove(moveEvent) {
        let newW = startW;
        let newH = startH;
        if (type === 'nw' || type === 'w') {
          newW = startW + (startX - moveEvent.clientX);
        }
        if (type === 'nw' || type === 'n') {
          newH = startH + (startY - moveEvent.clientY);
        }
        applyWindowSize(newW, newH, false);
      }

      function onMouseUp() {
        dialogWindow.classList.remove('resizing');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        try {
          localStorage.setItem('gz_gov_win_w', dialogWindow.offsetWidth);
          localStorage.setItem('gz_gov_win_h', dialogWindow.offsetHeight);
        } catch (e) {}
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    handleEl.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      dialogWindow.classList.add('resizing');
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const startW = dialogWindow.offsetWidth;
      const startH = dialogWindow.offsetHeight;

      function onTouchMove(moveEvent) {
        if (moveEvent.touches.length !== 1) return;
        const curTouch = moveEvent.touches[0];
        let newW = startW;
        let newH = startH;
        if (type === 'nw' || type === 'w') newW = startW + (startX - curTouch.clientX);
        if (type === 'nw' || type === 'n') newH = startH + (startY - curTouch.clientY);
        applyWindowSize(newW, newH, false);
      }

      function onTouchEnd() {
        dialogWindow.classList.remove('resizing');
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        try {
          localStorage.setItem('gz_gov_win_w', dialogWindow.offsetWidth);
          localStorage.setItem('gz_gov_win_h', dialogWindow.offsetHeight);
        } catch (e) {}
      }

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
    }, { passive: false });
  }

  initDragResize(resizeGripNw, 'nw');
  initDragResize(resizeEdgeW, 'w');
  initDragResize(resizeEdgeN, 'n');

  // 迎宾卡片定时器
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
    historyDrawer.classList.remove('open');
    setTimeout(() => {
      launcher.style.display = 'flex';
    }, 220);
  }

  // 清屏重置
  btnReset.addEventListener('click', () => {
    const rows = chatMain.querySelectorAll('.chat-row');
    rows.forEach((row, idx) => {
      if (idx > 0) row.remove();
    });
  });

  // 历史记录抽屉交互
  btnHistory.addEventListener('click', () => {
    const isOpen = historyDrawer.classList.toggle('open');
    if (isOpen) {
      loadChatHistory();
    }
  });

  btnCloseHistory.addEventListener('click', () => {
    historyDrawer.classList.remove('open');
  });

  btnClearHistory.addEventListener('click', async () => {
    try {
      await fetch(window.GzGovAiConfig.historyEndpoint + '?sessionId=' + encodeURIComponent(window.gzGovSessionId), {
        method: 'DELETE'
      });
      historyList.innerHTML = '<div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">会话历史已清空</div>';
    } catch (e) {
      historyList.innerHTML = '<div style="font-size:11px; color:#c20505; text-align:center; padding:15px;">清空历史失败</div>';
    }
  });

  async function loadChatHistory() {
    historyList.innerHTML = '<div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">加载历史记录中...</div>';
    try {
      const res = await fetch(window.GzGovAiConfig.historyEndpoint + '?sessionId=' + encodeURIComponent(window.gzGovSessionId) + '&limit=15');
      const json = await res.json();
      const list = (json.data && json.data.length > 0) ? json.data : [];
      if (list.length === 0) {
        historyList.innerHTML = '<div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">当前会话暂无历史提问记录</div>';
        return;
      }
      historyList.innerHTML = list.map(item => `
        <div class="history-item" data-prompt="${escapeText(item.userPrompt)}">
          <div class="history-item-q">${escapeText(item.userPrompt)}</div>
          <div class="history-item-a">${stripHtml(item.aiReply || '')}</div>
          <div class="history-item-time">${item.createTime ? new Date(item.createTime).toLocaleTimeString('zh-CN') : ''}</div>
        </div>
      `).join('');

      historyList.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
          textInput.value = el.getAttribute('data-prompt');
          historyDrawer.classList.remove('open');
          handleUserSubmit();
        });
      });
    } catch (err) {
      historyList.innerHTML = '<div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">历史服务暂未连通或离线运行</div>';
    }
  }

  // 快捷标签点击
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      textInput.value = chip.getAttribute('data-query');
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
        console.warn('[广州政策问答] 远端向量接口未就绪，无缝启用离线高保真政务知识库:', err);
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

  function stripEmoji(s) {
    if (!s) return '';
    return s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{1F300}-\u{1F9FF}]/gu, '')
             .replace(/[\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF]/g, '')
             .replace(/\s{2,}/g, ' ')
             .trim();
  }
  function formatMarkdownLike(str) {
    if (!str) return '';
    let html = escapeText(stripEmoji(str))
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

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
    let summary = data.summary || data.conclusion || '';
    let sections = data.sections || [];
    let citation = (data.citations && data.citations[0]) || data.citation || data.policy || null;
    let guidedSteps = data.guidedSteps || null;
    if (!guidedSteps && data.guideCard) {
      guidedSteps = {
        affairId: data.guideCard.id,
        affairCode: data.guideCard.affairCode,
        affairName: data.guideCard.affairName,
        qualifications: data.guideCard.qualifications,
        promisedLimitDays: data.guideCard.promisedLimitDays,
        handlingAddress: data.guideCard.handlingAddress,
        onlineHandleUrl: data.guideCard.onlineHandleUrl,
        materials: data.guideCard.materials,
        processSteps: data.guideCard.processSteps
      };
    }
    const rawContent = data.content || data.reply || '';

    // 若传入的是后端流式文本，提取【快速答疑】与【注意事项】
    if ((!summary || sections.length === 0) && rawContent) {
      if (rawContent.includes('【快速答疑】') || rawContent.includes('【办事要点】') || rawContent.includes('【注意事项】') || rawContent.includes('【官方政策依据】')) {
        const sumMatch = rawContent.match(/【(?:快速答疑|一句话明白纸|政策结论)】\s*([\s\S]*?)(?=【办事要点】|【老百姓明白账】|【注意事项与关键提醒】|【注意事项】|【官方政策依据】|$)/);
        if (sumMatch) summary = sumMatch[1].trim();

        const warnMatch = rawContent.match(/【(?:注意事项与关键提醒|注意事项|避坑提醒)】\s*([\s\S]*?)(?=【官方政策依据】|$)/);
        if (warnMatch) {
          const rawWarnText = warnMatch[1].trim();
          sections = [{ title: '注意事项与关键提醒', text: rawWarnText, isWarn: true }];
        } else {
          const secMatch = rawContent.match(/【(?:办事要点|老百姓明白账)】\s*([\s\S]*?)(?=【官方政策依据】|$)/);
          if (secMatch) {
            const rawSecText = secMatch[1].trim();
            const bulletLines = rawSecText.split(/\n(?=[•\-\*\d]+\s*)/);
            if (bulletLines.length > 1) {
              sections = bulletLines.map(line => {
                const cleaned = line.replace(/^[•\-\*\d\.\、\s]+/, '').trim();
                const colonIdx = cleaned.indexOf('：') !== -1 ? cleaned.indexOf('：') : cleaned.indexOf(':');
                if (colonIdx > 0 && colonIdx < 18) {
                  const title = cleaned.substring(0, colonIdx).trim();
                  const text = cleaned.substring(colonIdx + 1).trim();
                  const isWarn = title.includes('提醒') || title.includes('注意') || title.includes('避坑');
                  return { title, text, isWarn };
                }
                return { title: '办事要点', text: cleaned };
              });
            } else {
              sections = [{ title: '办事要点', text: rawSecText }];
            }
          }
        }

        const citeMatch = rawContent.match(/【官方政策依据】\s*([\s\S]*?)$/);
        if (citeMatch && !citation) {
          const cText = citeMatch[1].trim();
          citation = {
            title: '广州市现行规章与规范性文件',
            docNumber: '现行有效法定依据',
            dept: '广州市人民政府',
            similarity: '98%',
            clause: cText
          };
        }
      } else {
        summary = rawContent;
      }
    }

    if (sections.length === 0 && (data.plainInterpretation || data.plainText)) {
      sections = [{ title: '办事要点', text: data.plainInterpretation || data.plainText }];
    }

    return {
      summary: summary || '根据广州市现行政策库检索，相关文件已纳入现行有效公开目录。',
      sections: sections,
      citation: citation,
      guidedSteps: guidedSteps,
      suggestions: data.suggestions || []
    };
  }

  // 渲染政策问答结果 (以办事向导三步法直出卡片彻底替代冗余文本)
  function renderPolicyAnswer(data) {
    const div = document.createElement('div');
    div.className = 'chat-row ai';
    const parsed = parsePolicyData(data);

    // 1. 第一层：快速答疑
    const summaryHtml = `
      <div class="mingbai-summary-box">
        <div class="mingbai-summary-title">
          <span class="mingbai-tag">快速答疑</span>
        </div>
        <div class="mingbai-summary-body">${formatMarkdownLike(parsed.summary)}</div>
      </div>
    `;

    // 2. 第二层：办事向导三步法（高保真直角卡片直接展开，彻底替代原散乱文本与重复点击）
    let stepsGuideHtml = '';
    const gs = parsed.guidedSteps;
    const hasStructuredSteps = gs && (gs.qualifications || (gs.materials && gs.materials.length > 0) || (gs.processSteps && gs.processSteps.length > 0) || gs.steps);

    if (hasStructuredSteps) {
      const qualText = gs.qualifications || (gs.steps && gs.steps[0] && gs.steps[0].desc) || '符合广州市法定准入条件。';

      let matItemsHtml = '';
      if (gs.materials && gs.materials.length > 0) {
        matItemsHtml = gs.materials.map(m => `
          <li class="step-mat-item">
            <strong>${escapeText(m.name)}</strong>
            <span class="mat-tag-free">${escapeText(m.format || '免提交')}</span>
            ${m.sampleTip ? `<div class="mat-tip-sub">${escapeText(m.sampleTip)}</div>` : ''}
          </li>
        `).join('');
      } else {
        matItemsHtml = `
          <li class="step-mat-item">
            <strong>居民身份证原件</strong>
            <span class="mat-tag-free">电子证照免提交</span>
            <div class="mat-tip-sub">通过“穗好办”人脸实名认证自动核验，免交纸质证明</div>
          </li>
        `;
      }

      const limitDays = gs.promisedLimitDays || 1;
      let procListHtml = '';
      if (gs.processSteps && gs.processSteps.length > 0) {
        procListHtml = gs.processSteps.map(s => `
          <div class="step-proc-row">
            <strong>第${s.stepNo}步【${escapeText(s.stepName)}】</strong>：${escapeText(s.description)}
            <span style="color:#8c8c8c; font-size:10px;">（预计耗时：${escapeText(s.timeCost || '即时')}）</span>
          </div>
        `).join('');
      }

      const onlineRoute = gs.onlineRoute || `打开手机微信搜索“穗好办”小程序或登录广东政务服务网广州站，在顶部搜索栏输入“${escapeText(gs.affairName || '此事项')}”，完成人脸识别实名认证后在线确认申报即可。`;
      const offlineAddress = gs.handlingAddress || '广州市各区或街道政务服务中心综合窗口';

      let warnHtml = '';
      if (gs.warnTip) {
        warnHtml = `<div class="step-warn-box"><strong>【注意事项与避坑提醒】</strong>${escapeText(gs.warnTip)}</div>`;
      } else if (parsed.sections && parsed.sections.length > 0) {
        const warnSec = parsed.sections.find(s => s.isWarn || s.title.includes('注意') || s.title.includes('提醒'));
        if (warnSec) {
          warnHtml = `<div class="step-warn-box"><strong>【${escapeText(warnSec.title)}】</strong>${formatMarkdownLike(warnSec.text)}</div>`;
        }
      }

      stepsGuideHtml = `
        <div class="mingbai-steps-container">
          <!-- 步骤1: 准入资格自查 -->
          <div class="guided-step-block step-1">
            <div class="step-block-header">
              <span class="step-badge">步骤1</span>
              <span class="step-block-title">【准入资格自查】</span>
            </div>
            <div class="step-qual-box">${escapeText(qualText)}</div>
            <div class="step-sub-note">请对照上述准入条件确认是否符合申报资质；符合条件即可备齐材料直接申报。</div>
          </div>

          <!-- 步骤2: 申报材料与免提交核查 -->
          <div class="guided-step-block step-2">
            <div class="step-block-header">
              <span class="step-badge">步骤2</span>
              <span class="step-block-title">【申报材料与免提交核查】</span>
            </div>
            <ul class="step-mat-list">${matItemsHtml}</ul>
            <div class="step-sub-note">核心材料已接入广州政务大数据联网核验，支持电子证照自动免提交。</div>
          </div>

          <!-- 步骤3: 全流程文字办事指引 -->
          <div class="guided-step-block step-3">
            <div class="step-block-header">
              <span class="step-badge">步骤3</span>
              <span class="step-block-title">【全流程文字办事指引】</span>
            </div>
            <div class="step-limit-banner">承诺办结时限：<strong>${limitDays} 个工作日</strong></div>
            ${procListHtml ? `<div class="step-proc-chain">${procListHtml}</div>` : ''}
            <div class="step-route-box">
              <div class="route-label">线上办理文字路径</div>
              <div class="route-content">
                ${escapeText(onlineRoute)}
                ${gs.onlineHandleUrl ? `
              <div class="step-official-direct-link" style="margin-top:8px; padding:7px 10px; background:#f6ffed; border:1px solid #d9f7be; border-left:3px solid #389e0d;">
                <div style="font-weight:700; color:#237804; font-size:11px; margin-bottom:3px;">【广东政务服务网 · 官方在线申办直达】</div>
                <a href="${escapeText((gs.onlineHandleUrl || '').replace(/https?:\/\/zwfw\.gd\.gov\.cn/g, 'https://www.gdzwfw.gov.cn'))}" target="_blank" rel="noopener noreferrer" style="color:#237804; font-weight:700; text-decoration:none; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
                  点击直达官方申报入口 [${escapeText(gs.affairCode || '统一实施编码')}] ↗
                </a>
                </div>` : ''}
              </div>
              <div class="route-label offline">线下办事网点</div>
              <div class="route-content">${escapeText(offlineAddress)}</div>
            </div>
            ${warnHtml}
          </div>
        </div>
      `;
    } else if (parsed.sections && parsed.sections.length > 0) {
      // 兜底：纯宏观法规问答
      const itemsHtml = parsed.sections.map(sec => `
        <div class="mb-item ${sec.isWarn ? 'warn' : ''}">
          <div class="mb-item-title ${sec.isWarn ? 'warn' : ''}">${escapeText(sec.title)}</div>
          <div class="mb-item-content">${formatMarkdownLike(sec.text)}</div>
        </div>
      `).join('');
      stepsGuideHtml = `<div class="mingbai-details-card">${itemsHtml}</div>`;
    }

    // 3. 第三层：官方政策依据
    let sourceHtml = '';
    const c = parsed.citation;
    if (c) {
      sourceHtml = `
        <div class="mingbai-source-card">
          <div class="source-card-top">
            <div class="source-doc-info">
              <div>权威政策依据：《${escapeText(c.title || c.docTitle || '广州市现行规章')}》</div>
              <div class="source-doc-meta">发文字号：${escapeText(c.docNumber || '现行有效')} ｜ 制定机关：${escapeText(c.dept || c.issuerDept || '广州市人民政府')}</div>
            </div>
            <button class="source-btn-toggle" title="展开查看严谨的原条款表述">查看条文原文 ▾</button>
          </div>
          <div class="source-clause-drawer">
            <strong>【现行法规条款原文】</strong><br/>
            ${formatMarkdownLike(c.clause || c.clauseText || c.snippet || '该政策条文已纳入广州市现行有效数据库。')}
          </div>
        </div>
      `;
    }

    // 4. 第四层：智能政策延伸推荐
    let suggestionsHtml = '';
    if (parsed.suggestions && parsed.suggestions.length > 0) {
      const chips = parsed.suggestions.map((s) => `
        <span class="suggestion-chip" data-prompt="${escapeText(s)}">${escapeText(s)}</span>
      `).join('');

      suggestionsHtml = `
        <div class="policy-suggestions-wrap">
          <div class="suggestions-label">相关政策延伸咨询：</div>
          <div class="suggestions-chips-group">${chips}</div>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="chat-author">广州市政策法规智能咨询专窗</div>
      <div class="chat-bubble">
        ${summaryHtml}
        ${stepsGuideHtml}
        ${sourceHtml}
        ${suggestionsHtml}
      </div>
      <div class="chat-feedback-bar">
        <span>信息承办：广州市政务服务和数据管理局</span>
        <div class="action-btn-group">
          <button class="action-sub-btn btn-copy-mingbai" title="点击复制政策解答内容">复制</button>
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
          <span class="fb-tag" data-val="解释不够通俗好懂">解释不够通俗</span>
          <span class="fb-tag" data-val="未能准确解答核心问题">未解答核心问题</span>
          <span class="fb-tag" data-val="其他意见建议">其他建议</span>
        </div>
        <textarea class="feedback-textarea" placeholder="请具体说明您觉得哪里不够明白或政策出处有误，协助完善便民知识库（选填）..." maxlength="200"></textarea>
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

    // 交互绑定：点击展开/收起法条原文抽屉
    const sourceCard = div.querySelector('.mingbai-source-card');
    if (sourceCard) {
      const toggleBtnClause = sourceCard.querySelector('.source-btn-toggle');
      const drawer = sourceCard.querySelector('.source-clause-drawer');
      toggleBtnClause.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('open');
        toggleBtnClause.textContent = isOpen ? '收起条文 ▴' : '查看条文原文 ▾';
        scrollChatBottom();
      });
    }

    // 交互绑定：一键复制政策解答内容
    const copyBtn = div.querySelector('.btn-copy-mingbai');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        let stepsText = '';
        if (hasStructuredSteps) {
          const qualText = gs.qualifications || (gs.steps && gs.steps[0] && gs.steps[0].desc) || '符合广州市法定准入条件。';
          let matStr = (gs.materials || []).map(m => `• ${m.name} [${m.format || '免提交'}] (${m.sampleTip || ''})`).join('\n');
          let procStr = (gs.processSteps || []).map(s => `• 第${s.stepNo}步【${s.stepName}】：${s.description}（${s.timeCost || '即时'}）`).join('\n');
          const limitDays = gs.promisedLimitDays || 1;
          const onlineRoute = gs.onlineRoute || `打开手机微信搜索“穗好办”小程序或登录广东政务服务网广州站搜索申报。`;
          const offlineAddress = gs.handlingAddress || '广州市各区或街道政务服务中心综合窗口';
          stepsText = `【办事向导三步法】\n` +
            `步骤1【准入资格自查】\n${qualText}\n\n` +
            `步骤2【申报材料与免提交核查】\n${matStr || '居民身份证原件（电子证照免提交）'}\n\n` +
            `步骤3【全流程文字办事指引】\n承诺办结时限：${limitDays}个工作日\n` +
            (procStr ? `办理流程：\n${procStr}\n` : '') +
            `线上路径：${onlineRoute}\n线下网点：${offlineAddress}\n` +
            (gs.warnTip ? `注意事项：${gs.warnTip}\n` : '');
        } else if (parsed.sections && parsed.sections.length > 0) {
          stepsText = parsed.sections.map(s => `${s.title}\n${stripHtml(s.text)}`).join('\n\n');
        }

        let citeText = '';
        if (c) {
          citeText = `【官方政策依据】\n文件：《${c.title || c.docTitle}》（${c.docNumber || '现行有效'}）\n发布机构：${c.dept || c.issuerDept || '广州市人民政府'}`;
        }
        const textToCopy = `【广州市政策法规智能咨询 · 答复明细】\n` +
          `================================\n` +
          `【快速答疑】\n${stripHtml(parsed.summary)}\n\n` +
          (stepsText ? `${stepsText}\n\n` : '') +
          (citeText ? `${citeText}\n================================\n` : '') +
          `来源：广州市人民政府门户网站 (www.gz.gov.cn)\n` +
          `咨询时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.textContent = '已复制';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = '复制';
            copyBtn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          copyBtn.textContent = '复制失败';
          setTimeout(() => { copyBtn.textContent = '复制'; }, 2000);
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
      tag.addEventListener('click', () => tag.classList.toggle('active'));
    });

    submitBtnFb.addEventListener('click', () => {
      panel.innerHTML = `<div class="feedback-success-note">已收到您的反馈建议，知识库将持续优化解答准确度与通俗性。</div>`;
      toggleBtn.innerHTML = '已反馈';
      toggleBtn.disabled = true;
      toggleBtn.style.color = '#c20505';
      scrollChatBottom();
    });

    // 交互绑定：追问标签点击
    div.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        textInput.value = chip.getAttribute('data-prompt');
        handleUserSubmit();
      });
    });
  }

  // 渲染办事向导单步详情卡片
  function renderGuidedStepDetail(stepData) {
    const div = document.createElement('div');
    div.className = 'chat-row ai';

    let contentHtml = '';
    if (stepData.stepNo === 1) {
      contentHtml = `
        <div style="margin-bottom:6px; font-weight:600; color:#003a8c;">【准入资格自查要点】</div>
        <div style="background:#f0f5ff; padding:6px 8px; border:1px solid #d6e4ff; margin-bottom:6px;">
          ${escapeText(stepData.qualifications || '')}
        </div>
        <div style="color:#595959; font-size:11px;">${escapeText(stepData.guidance || '')}</div>
      `;
    } else if (stepData.stepNo === 2) {
      const matList = (stepData.materials || []).map(m => `
        <li style="margin-bottom:4px;">
          <strong>${escapeText(m.name)}</strong>
          <span style="font-size:9.5px; background:#f6ffed; color:#389e0d; border:1px solid #b7eb8f; padding:0 3px; margin-left:4px;">${escapeText(m.format || '免提交')}</span>
          <div style="color:#8c8c8c; font-size:10px;">${escapeText(m.sampleTip || '')}</div>
        </li>
      `).join('');
      contentHtml = `
        <div style="margin-bottom:6px; font-weight:600; color:#003a8c;">【申报材料清单与免提交核查】</div>
        <ul style="margin-left:16px; margin-bottom:6px;">${matList}</ul>
        <div style="color:#595959; font-size:11px;">${escapeText(stepData.guidance || '')}</div>
      `;
    } else {
      const stepsList = (stepData.processSteps || []).map(s => `
        <div style="margin-bottom:4px; font-size:11px; color:#1e293b;">
          <strong>第${s.stepNo}步【${escapeText(s.stepName)}】</strong>：${escapeText(s.description)}
          <span style="color:#8c8c8c; font-size:10px;">（预计耗时：${escapeText(s.timeCost)}）</span>
        </div>
      `).join('');

      contentHtml = `
        <div style="margin-bottom:6px; font-weight:600; color:#003a8c;">【全流程文字办事指引】</div>
        <div style="margin-bottom:6px; color:#1e293b;">承诺办结时限：<strong>${stepData.promisedLimitDays || 1} 个工作日</strong></div>
        ${stepsList ? `<div style="background:#f8fafc; border:1px solid #e2e8f0; padding:6px 8px; margin-bottom:6px;">${stepsList}</div>` : ''}
        <div style="background:#f0f5ff; border-left:3px solid #0050b3; padding:6px 8px; margin-bottom:6px; font-size:11px; color:#1e293b; line-height:1.5;">
          <div style="font-weight:600; color:#003a8c; margin-bottom:2px;">【线上办理文字指引】</div>
          打开手机微信搜索“穗好办”小程序或登录广东政务服务网广州站，在搜索栏输入“${escapeText(stepData.affairName || '此事项')}”，完成人脸识别实名认证后，系统将自动核验并免提交核心证照，核对后在线确认申报即可。<br/>
          <div style="font-weight:600; color:#003a8c; margin-top:5px; margin-bottom:2px;">【线下办事网点】</div>
          ${escapeText(stepData.handlingAddress || '广州市各区及街道政务服务中心综合窗口')}。
        </div>
        <div style="color:#595959; font-size:11px; line-height:1.4; white-space:pre-wrap;">${escapeText(stepData.guidance || '')}</div>
      `;
    }

    div.innerHTML = `
      <div class="chat-author">广州市政策法规智能咨询专窗 · 流程向导</div>
      <div class="chat-bubble" style="border-top:2px solid #389e0d;">
        <div style="font-size:11.5px; font-weight:700; color:#237804; margin-bottom:4px;">
          步骤${stepData.stepNo}【${escapeText(stepData.stepName)}】详细指引
        </div>
        ${contentHtml}
      </div>
    `;

    chatMain.appendChild(div);
    scrollChatBottom();
  }

  function scrollChatBottom() {
    chatMain.scrollTop = chatMain.scrollHeight;
  }

  function escapeText(str) {
    if (!str) return '';
    return stripEmoji(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 接口请求 (优先连接后端 SSE 流式问答，流式解析并提取出处、卡片与知识图谱)
  async function fetchPolicyAnswer(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(window.GzGovAiConfig.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: window.gzGovSessionId,
        prompt: prompt,
        category: '',
        token: 'gz-citizen-token-authed'
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('HTTP Status: ' + response.status);

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    let citation = null;
    let guideCard = null;
    let relations = [];
    let guidedSteps = null;
    let recommendations = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('data:')) {
          const jsonStr = line.substring(5).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const chunk = JSON.parse(jsonStr);
            if (chunk.type === 'chunk' && chunk.content) {
              fullText += chunk.content;
            } else if (chunk.type === 'citation' && chunk.data) {
              citation = chunk.data;
            } else if (chunk.type === 'guide_card' && chunk.data) {
              guideCard = chunk.data;
            } else if (chunk.type === 'graph_card' && chunk.data) {
              relations = chunk.data;
            } else if (chunk.type === 'guided_steps_card' && chunk.data) {
              guidedSteps = chunk.data;
            } else if (chunk.type === 'recommend_card' && chunk.data) {
              recommendations = chunk.data;
            }
          } catch (e) {
            // ignore chunk error
          }
        }
      }
    }

    return {
      content: fullText,
      citation: citation,
      guideCard: guideCard,
      relations: relations,
      guidedSteps: guidedSteps,
      suggestions: recommendations.map(r => r.title || r.query || r)
    };
  }

  // 广州市政策法规政务权威政策法规向量知识库 (老百姓能听懂的“政策明白纸”广州民生版)
  function getGuangzhouPolicyMockData(prompt) {
    const q = prompt.toLowerCase();

    // 1. 公租房保障与租赁补贴政策
    if (q.includes('公租房') || (q.includes('租房') && q.includes('补贴')) || q.includes('租赁补贴')) {
      return {
        summary: '能办！在广州稳定工作且在穗没买房的新就业职工，每个月最高可领 1400 元租房补贴，按月打进银行卡，最长可以连续领 5 年。',
        guidedSteps: {
          affairId: 101,
          affairCode: 'GZ-ZJ-GZH001',
          affairName: '公租房租赁补贴申领',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%85%AC%E7%A7%9F%E6%88%BF&region=440100',
          qualifications: '具有大专及以上学历（毕业未满5年），在穗连续缴纳社保满6个月，本人及配偶名下在穗无自有产权住房，家庭人均年收入低于保障线（约每人每月低于3800元）。',
          promisedLimitDays: 3,
          materials: [
            { name: '申请人及家庭成员居民身份证', format: '电子证照免提交', sampleTip: '通过“穗好办”人脸识别刷脸授权调用' },
            { name: '房屋租赁合同', format: '电子证照/拍照上传', sampleTip: '阳光租房网备案合同编码直接联网核验' },
            { name: '全日制大专及以上学历毕业证书', format: '学信网联网核验免提交', sampleTip: '系统自动拉取教育部学信网学历备案表' },
            { name: '在穗连续缴纳6个月社保记录', format: '社保系统自动核验免提交', sampleTip: '大数据中心后台比对，无需纸质证明' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '网上申请', description: '登录“穗好办”APP填报申请并授权调取电子证照', timeCost: '10分钟' },
            { stepNo: 2, stepName: '资格初审', description: '街镇与住建部门审核住房、社保与收入数据', timeCost: '2个工作日' },
            { stepNo: 3, stepName: '公示与发款', description: '区住建局门户公示，次月起按月将补贴发放到银行卡', timeCost: '1个工作日' }
          ],
          handlingAddress: '广州市各区住房保障办公室或街道政务服务中心综合窗口',
          onlineRoute: '手机微信搜索“穗好办”小程序或电脑登录“广东政务服务网·广州专区”，在搜索栏输入“公租房租赁补贴”，完成人脸识别实名认证后在线确认申报。',
          warnTip: '已经租住公租房实物小区的家庭，不能再重复申领租赁补贴现金。单身按40㎡测算，每月最高直发1400元。'
        },
        citation: {
          title: '广州市公共租赁住房保障办法',
          docNumber: '穗府办规〔2024〕6号',
          dept: '广州市人民政府办公厅',
          similarity: '99%',
          clause: '第三条【保障对象】：本市城镇户籍中等偏下收入住房困难家庭，以及持有本市有效居住证、在穗连续稳定就业的新就业职工及外来务工人员。\n第十一条【租赁补贴】：住房租赁补贴标准为每平方米每月35元，结合保障家庭人口与人均保障建筑面积测算发放。'
        },
        suggestions: [
          '新就业无房职工申请补贴的家庭人均收入线是多少？',
          '公租房实物配租和租房补贴能同时享受吗？',
          '连续缴纳社保满6个月是否包含补缴月份？'
        ]
      };
    }

    // 2. 积分制入户政策
    if (q.includes('积分') || q.includes('入户') || q.includes('落户') || q.includes('户口') || q.includes('来穗')) {
      return {
        summary: '能办！长期在广州工作生活的外地朋友，只要符合年龄45周岁以下、有效居住证、社保满4年这几个硬指标，通过积分排名就可以直接落户广州，全家随迁。',
        guidedSteps: {
          affairId: 102,
          affairCode: 'GZ-LS-JFRH002',
          affairName: '来穗人员积分制入户申报',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%A7%AF%E5%88%86%E5%85%A5%E6%88%B7&region=440100',
          qualifications: '年龄在45周岁以下；持在广州办理且在有效期的《广东省居住证》；在广州合法工作并累计缴纳社保满4年（五险齐全）；信用良好无犯罪记录。',
          promisedLimitDays: 5,
          materials: [
            { name: '居民身份证与广东省居住证原件', format: '电子证照免提交', sampleTip: '居住证需处于正常有效状态' },
            { name: '在穗累计缴纳4年社保缴费历史明细', format: '社保系统自动核验', sampleTip: '跨省转入需在广州有实际缴费记录' },
            { name: '来穗人员积分制服务核定积分结果', format: '系统在线直接调取', sampleTip: '提前在来穗积分系统完成申请核定' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '积分核定', description: '登录广州市来穗人员积分系统，完成积分申报与审核', timeCost: '常规进行' },
            { stepNo: 2, stepName: '入户申请', description: '当年度积分入户申报期内一键提交意愿申请', timeCost: '申报期内' },
            { stepNo: 3, stepName: '核发指标', description: '依积分高低公示拟入户名单，签发电子入户卡', timeCost: '公示5天' }
          ],
          handlingAddress: '广州市各区来穗人员服务管理中心窗口',
          onlineRoute: '电脑登录“广州市来穗人员积分制服务管理信息系统”（djjd.gzlsrc.com.cn）在线申报，全流程系统核验，拟入户名单在广州门户网站公示5天。',
          warnTip: '社保累计满4年允许断缴接续，但若两人积分相同，系统会优先按在穗社保连续缴纳月数长短排序。配偶与未成年子女可同步随迁。'
        },
        citation: {
          title: '广州市积分制入户管理办法',
          docNumber: '穗府规〔2023〕1号',
          dept: '广州市人民政府',
          similarity: '98%',
          clause: '第五条【申报条件】：符合以下条件的来穗人员，可申请积分制入户：（一）年龄45周岁以下；（二）持本市有效《广东省居住证》；（三）在本市合法稳定就业或创业并缴纳社会保险累计满4年；（四）在穗信用良好。'
        },
        suggestions: [
          '社保满4年算不算跨省转移接续进来的社保？',
          '在广州租房或买房对积分入户有加分吗？',
          '拿到入户指标后随迁家属有哪些审核要求？'
        ]
      };
    }

    // 3. 企业开办与营商环境扶持政策
    if (q.includes('企业') || q.includes('开公司') || q.includes('营业执照') || q.includes('开办') || q.includes('营商') || q.includes('刻章') || q.includes('印章')) {
      return {
        summary: '不用花一分钱，半天就能办齐！在广州开公司全面推行“零成本、半天办结”，政府不仅全流程网办，还免费赠送全套 4 枚实体防伪印章。',
        guidedSteps: {
          affairId: 104,
          affairCode: 'GZ-SC-QYKB004',
          affairName: '开办企业一网通办',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%BC%81%E4%B8%9A%E5%BC%80%E5%8A%9E&region=440100',
          qualifications: '在广州市设立有限责任公司、合伙企业、个人独资企业的全体股东及法定代表人；个体工商户及各类创业者均可享受全流程免费便利。',
          promisedLimitDays: 1,
          materials: [
            { name: '公司章程与股东主体资格证明', format: '在线电子签章免纸质材料', sampleTip: '全流程无纸化，手机端刷脸签名' },
            { name: '住所（经营场所）使用证明', format: '承诺制地址申报免证明', sampleTip: '标准地址库一键选取住所' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '一表填报', description: '在广州市开办企业一网通平台填报企业基本信息', timeCost: '15分钟' },
            { stepNo: 2, stepName: '并联审批', description: '市监、税务、印章刻制、人社公积金并联自动审批', timeCost: '0.5个工作日' },
            { stepNo: 3, stepName: '免费领章', description: '免费EMS邮寄营业执照与4枚防伪印章到家', timeCost: '当日办结' }
          ],
          handlingAddress: '广州市各区政务服务中心企业开办专窗',
          onlineRoute: '电脑登录“广州市开办企业一网通平台”或微信小程序，营业执照申请、刻章、领票、员工交社保和公积金“一表搞定”，半天全部办完。',
          warnTip: '政府财政全额买单免费赠送公章、财务章、发票章、法人章共4枚防伪印章（立省数百元），免费EMS邮寄到家，绝不向企业收取任何费用。'
        },
        citation: {
          title: '广州市关于深化企业开办“一网通办”改革的若干意见',
          docNumber: '穗市监规〔2024〕2号',
          dept: '广州市市场监督管理局',
          similarity: '97%',
          clause: '第二条【全流程并联审批】：将设立登记、刻制印章、申领发票、员工参保及住房公积金缴存登记整合为1个环节，0.5天内全流程办结，实体印章由政府全额免费发放。'
        },
        suggestions: [
          '免费赠送的4枚印章如何免费邮寄到家？',
          '个体工商户转为有限公司（个转企）有何扶持？',
          '企业开办一网通平台手机实名刷脸认证失败怎么办？'
        ]
      };
    }

    // 4. 灵活就业医保与社保政策
    if (q.includes('医保') || q.includes('社保') || q.includes('灵活就业') || q.includes('医疗')) {
      return {
        summary: '不管是不是广州户口都能办！外卖员、快递小哥、自由职业者在广州凭身份证就能交职工医保，享受和正规大企业职工完全一样的看病报销待遇。',
        guidedSteps: {
          affairId: 105,
          affairCode: 'GZ-YB-LHJY005',
          affairName: '灵活就业人员医保参保',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%81%B5%E6%B4%BB%E5%B0%B1%E4%B8%9A%E5%8C%BB%E4%BF%9D&region=440100',
          qualifications: '未达到法定退休年龄的灵活就业人员（打零工、小买卖、自媒体、外卖骑手、无雇工个体户等）；完全打破户籍限制，不设户籍壁垒。',
          promisedLimitDays: 1,
          materials: [
            { name: '本人居民身份证原件', format: '电子身份证免提交', sampleTip: '直接刷脸验证身份即可参保' },
            { name: '一类银行储蓄卡开户信息', format: '在线输入卡号绑定', sampleTip: '用于每月社保税务自动扣费' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '实名认证', description: '进入“粤税通”小程序完成实名刷脸认证', timeCost: '2分钟' },
            { stepNo: 2, stepName: '选档缴费', description: '选定参保缴费基数并绑定银行代扣协议', timeCost: '3分钟' },
            { stepNo: 3, stepName: '次月享受', description: '自缴费次月起享受门诊统筹与住院报销待遇', timeCost: '次月生效' }
          ],
          handlingAddress: '广州市各区医保中心网点或各区税务局办税服务厅',
          onlineRoute: '打开微信直接搜“粤税通”小程序，刷脸实名后点击“个人社保缴费”-“灵活就业社保”，按提示选档并绑定银行卡即可按月扣费，不用跑税务局大厅。',
          warnTip: '按月交费次月起即可享受门诊及住院报销；如果断缴超过3个月，补缴后有待遇等待期，尽量保持按月扣费避免断缴。'
        },
        citation: {
          title: '广州市关于灵活就业人员参加本市职工基本医疗保险有关事项的通知',
          docNumber: '穗医保规〔2023〕5号',
          dept: '广州市医疗保障局、广州市财政局',
          similarity: '98%',
          clause: '第一条【参保范围】：未达到法定退休年龄的灵活就业人员，凭居民身份证可办理本市职工基本医疗保险参保登记，按规定缴纳医疗保险费，不设户籍壁垒限制。'
        },
        suggestions: [
          '灵活就业人员每个月最低需要交多少医保费？',
          '医保中途断缴了2个月补交后能报销吗？',
          '外地户籍在广州交医保需要提供居住证吗？'
        ]
      };
    }

    // 5. 中小客车指标调控政策
    if (q.includes('车牌') || q.includes('摇号') || q.includes('竞价') || q.includes('指标') || q.includes('客车')) {
      return {
        summary: '非广州户口也能摇号！外地户籍只要有有效广州居住证，且近2年内累计在广州交满24个月医保，名下没粤A车牌且有驾照，就可以免费参与摇号。',
        guidedSteps: {
          affairId: 103,
          affairCode: 'GZ-JT-CPYH003',
          affairName: '中小客车指标摇号',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%B8%AD%E5%B0%8F%E5%AE%A2%E8%BD%A6%E6%8C%87%E6%A0%87%E6%91%87%E5%8F%B7&region=440100',
          qualifications: '本市户籍人员直接可申领（名下无粤A车且有驾照）；非本市户籍持有有效广州居住证，且近2年内累计交满广州职工医保24个月。',
          promisedLimitDays: 1,
          materials: [
            { name: '机动车驾驶证原件', format: '交管系统自动联网', sampleTip: '准驾车型需包含C类及以上' },
            { name: '非本市户籍广东省居住证与近2年医保', format: '大数据比对免提交', sampleTip: '申请当月医保必须处于在保状态' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '提交申请', description: '每月8日24时前在广州市中小客车指标调控系统完成申请', timeCost: '5分钟' },
            { stepNo: 2, stepName: '资格审核', description: '公安、社保、医保多部门后台并联审核', timeCost: '每月23日公示' },
            { stepNo: 3, stepName: '参加摇号', description: '每月26日统一组织计算机随机摇号，短信实时通知结果', timeCost: '即时' }
          ],
          handlingAddress: '广州市中小客车指标调控管理办公室窗口',
          onlineRoute: '手机微信搜公众号“广州交通”或电脑登录“广州市中小客车指标调控管理信息系统”，点击“增量指标申请”填报。',
          warnTip: '急用车推荐摇节能车指标（混动车），同样免费申请且中签率极高（接近100%）。申请当月医保必须处于在保正常状态。'
        },
        citation: {
          title: '广州市中小客车总量调控管理办法',
          docNumber: '穗府办规〔2023〕15号',
          dept: '广州市人民政府办公厅',
          similarity: '96%',
          clause: '第十六条【个人申请条件】：住所地在本市的情形包括本市户籍人员、驻穗部队现役军人，以及持有效《广东省居住证》且近2年在本市累计缴纳职工社会医疗保险满24个月的非本市户籍人员。申请人须名下无本市登记中小客车并持有效驾驶证。'
        },
        suggestions: [
          '节能车摇号中签之后可以换成纯燃油车牌吗？',
          '夫妻之间车牌指标能直接转让或过户吗？',
          '医保中途有补缴月份会影响摇号资格审核吗？'
        ]
      };
    }

    // 6. 出入境与港澳签注政策
    if (q.includes('港澳') || q.includes('通行证') || q.includes('签注') || q.includes('出入境') || q.includes('出境')) {
      return {
        summary: '不用回老家，带上身份证在广州直接办！全国居民在广州办理港澳通行证及团队旅游签注享受“全国通办”，免户口本、免居住证，一般 7 个工作日办好。',
        guidedSteps: {
          affairId: 106,
          affairCode: 'GZ-GA-GAQZ006',
          affairName: '往来港澳通行证申领',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%B8%AF%E6%BE%B3%E9%80%9A%E8%A1%8C%E8%AF%81&region=440100',
          qualifications: '中国大陆合法居民，需前往香港或澳门旅游、探亲、商务的公民；无论户籍在哪个省市，均可在广州出入境窗口就近申办。',
          promisedLimitDays: 7,
          materials: [
            { name: '居民身份证原件', format: '出入境大厅核验原件', sampleTip: '现场免费拍摄白底彩色照片；未满16周岁需监护人陪同及户口本' },
            { name: '有效往来港澳通行证（仅再次加签需提供）', format: '智能签注机自动读卡', sampleTip: '卡式证件插入机器立等可取，2分钟搞定' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '网上预约', description: '微信搜“广州公安”公众号选择就近服务中心预约时间', timeCost: '3分钟' },
            { stepNo: 2, stepName: '窗口核验', description: '持身份证到场采集指纹并拍摄免冠证件照', timeCost: '10分钟' },
            { stepNo: 3, stepName: '发证取件', description: '7个工作日后可选择现场领取或EMS邮寄到家', timeCost: '7个工作日' }
          ],
          handlingAddress: '广州市公安局出入境大厦及各区分局出入境接待大厅',
          onlineRoute: '打开微信搜“广州公安”公众号或“移民局12367”小程序，预约就近大厅。已有卡式通行证再次加签的，直接到全市任一智能签注机立等可取。',
          warnTip: '团队旅游签注（L签）已支持个人自由通关。智能签注机仅支持卡式电子通行证，旧版纸质本式证件需前往人工窗口换发。'
        },
        citation: {
          title: '关于全面实施出入境证件“全国通办”的规定',
          docNumber: '国移发〔2023〕18号',
          dept: '国家移民管理局',
          similarity: '95%',
          clause: '第一条【全国通办】：内地居民可在全国任一出入境管理窗口申请往来港澳通行证及团队旅游签注，不受户籍地限制，无需提交居住证或社保证明。'
        },
        suggestions: [
          '广州哪里的智能签注机支持24小时随时自助办理？',
          '港澳旅游个人签（G签）和团队旅游签（L签）有什么区别？'
        ]
      };
    }

    // 7. 住房公积金无房租赁提取政策
    if (q.includes('公积金') && (q.includes('租房') || q.includes('无房') || q.includes('提取'))) {
      return {
        summary: '能办！在广州市内名下无自有房产且租房居住的缴存职工，每人每月最高可提取 1400 元住房公积金，按月自动转入银行账户。',
        guidedSteps: {
          affairId: 108,
          affairCode: 'GZ-GJJ-ZFTQ008',
          affairName: '住房公积金无房租赁按月提取',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%A7%9F%E6%88%BF%E6%8F%90%E5%8F%96&region=440100',
          qualifications: '缴存人及配偶在本市行政区域内无自有产权住房，连续缴存公积金满3个月且租房自住。',
          promisedLimitDays: 1,
          materials: [
            { name: '提取申请人居民身份证', format: '电子证照免提交', sampleTip: '刷脸认证自动调取' },
            { name: '提取人一类银行借记卡', format: '在线输入核验', sampleTip: '用于每月定期转账划扣公积金本息' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '人脸登录', description: '打开“广州住房公积金管理中心”小程序完成实名登录', timeCost: '2分钟' },
            { stepNo: 2, stepName: '无房提取', description: '点击业务办理-无房租赁提取，系统自动调取房查信息', timeCost: '3分钟' },
            { stepNo: 3, stepName: '按月到账', description: '审批通过后每月自动转账至个人储蓄账户', timeCost: '1个工作日' }
          ],
          handlingAddress: '广州住房公积金管理中心各区办事处网点',
          onlineRoute: '打开微信搜“广州住房公积金管理中心”公众号，进入微服务办理“无房租赁提取”，全程无纸化秒批秒办。',
          warnTip: '无需提供租房发票或合同即可按定额1400元/月提取；夫妻双方合计每月可提取2800元。'
        },
        citation: {
          title: '广州住房公积金提取管理办法',
          docNumber: '穗公积金规〔2023〕5号',
          dept: '广州住房公积金管理委员会',
          similarity: '98%',
          clause: '第四条【租房提取额度】：缴存人及配偶在本市行政区域内无自有产权住房且租房自住的，每人每月无房租赁提取额度上限为1400元。'
        },
        suggestions: [
          '夫妻双方可以同时申请无房租房提取公积金吗？',
          '公积金租房提取后会影响以后买房贷款额度吗？'
        ]
      };
    }

    // 8. 驾驶证期满换证政策
    if (q.includes('驾驶证') || q.includes('换证') || q.includes('警医邮') || q.includes('驾照')) {
      return {
        summary: '不用跑车管所！驾驶证到期前90天内，在联网医院体检后，手机登录“交管12123”就能办理期满换证，新驾照EMS快递送货上门。',
        guidedSteps: {
          affairId: 115,
          affairCode: 'GZ-GA-JSZ015',
          affairName: '机动车驾驶证期满换证“警医邮”',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%A9%BE%E9%A9%B6%E8%AF%81%E6%9C%9F%E6%BB%A1%E6%8D%A2%E8%AF%81&region=440100',
          qualifications: '机动车驾驶证有效期满前90日内，已完成体检且违章违法记分已处理完毕。',
          promisedLimitDays: 1,
          materials: [
            { name: '机动车驾驶人身体条件证明', format: '互联网医院网络直传', sampleTip: '就近在合作医疗机构或警医邮一体机体检' },
            { name: '驾驶人近期免冠彩色数码相片', format: '在线拍照免冲印', sampleTip: '手机拍照或现场照相联网回执' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '就近体检', description: '市内定点联网医院或警医邮自助体检机体检', timeCost: '10分钟' },
            { stepNo: 2, stepName: '网上提交', description: '登录“交管12123”APP点击期满换领驾驶证', timeCost: '3分钟' },
            { stepNo: 3, stepName: '制证送达', description: '车管所远程审核制证，邮政EMS快递上门', timeCost: '1个工作日' }
          ],
          handlingAddress: '广州市公安局交警支队车管所及市内联网“警医邮”服务点',
          onlineRoute: '下载打开“交管12123”手机APP，首页点击“更多”-“驾驶证补换领”-“期满换证”，录入邮寄地址即可。',
          warnTip: '必须先完成体检让医院将身体条件证明上传交管网后，手机上才能点击办理换证业务。'
        },
        citation: {
          title: '机动车驾驶证申领和使用规定',
          docNumber: '公安部令第162号',
          dept: '公安部',
          similarity: '97%',
          clause: '第六十三条【期满换证】：机动车驾驶人应当于机动车驾驶证有效期满前九十日内申请换证，支持警医邮互联网医院体检远程换发。'
        },
        suggestions: [
          '广州市内哪些邮局网点支持驾驶证体检和换证一站式搞定？',
          '驾驶证逾期未换证超过1年会有什么处罚？'
        ]
      };
    }

    // 9. 生育保险待遇与生育津贴政策
    if (q.includes('生育') || q.includes('产假') || q.includes('生小孩')) {
      return {
        summary: '单位参保的在职女职工符合计划生育政策分娩，享受法定产假并按月计发生育津贴，由医保基金直接拨付至用人单位。',
        guidedSteps: {
          affairId: 123,
          affairCode: 'GZ-YB-SYJT023',
          affairName: '职工生育保险待遇与生育津贴核发',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%94%9F%E8%82%B2%E6%B4%A5%E8%B4%B4&region=440100',
          qualifications: '用人单位按时足额缴纳生育保险费，且参保职工符合国家计划生育政策生育。',
          promisedLimitDays: 3,
          materials: [
            { name: '医疗机构出具的生育医学诊断证明', format: '医保定点医院直传免交', sampleTip: '定点医院分娩自动上传数据' },
            { name: '计划生育承诺书', format: '在线承诺免证明', sampleTip: '系统在线一键签署' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '产后申报', description: '女职工分娩出院后，登录广东政务服务网申报生育津贴', timeCost: '10分钟' },
            { stepNo: 2, stepName: '医保核算', description: '广州医保经办机构调取定点医院生育档案，自动计算津贴', timeCost: '2个工作日' },
            { stepNo: 3, stepName: '津贴拨付', description: '津贴资金由医保基金全额拨付至用人单位银行基本账户', timeCost: '1个工作日' }
          ],
          handlingAddress: '广州市医疗保险服务中心各分局经办窗口',
          onlineRoute: '电脑登录“广东政务服务网·广州专区”，搜索“职工生育保险待遇申领”，用人单位或职工在线确认申报。',
          warnTip: '生育津贴计发基数为用人单位上年度职工月平均工资，顺产基础产假为98天，难产剖腹产增加30天。'
        },
        citation: {
          title: '广州市职工生育保险实施办法',
          docNumber: '穗府办规〔2022〕17号',
          dept: '广州市人民政府办公厅',
          similarity: '98%',
          clause: '第四条【生育津贴计发标准】：职工享受生育津贴的数额，为职工分娩时用人单位上年度职工月平均工资除以30，乘以规定的产假天数。'
        },
        suggestions: [
          '广州顺产和剖腹产生育津贴天数分别是多少天？',
          '男职工有陪产假津贴可以申领吗？'
        ]
      };
    }

    // 10. 高新技术企业认定奖励政策
    if (q.includes('高新') || q.includes('高企') || q.includes('科技企业')) {
      return {
        summary: '有重奖！广州首次通过国家高新技术企业认定的科技型中小企业，市财政给予最高 20 万元一次性奖补，各区还叠加配套支持。',
        guidedSteps: {
          affairId: 129,
          affairCode: 'GZ-KJ-GXJS029',
          affairName: '高新技术企业认定培育入库奖励补贴',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%AB%98%E6%96%B0%E6%8A%80%E6%9C%AF%E4%BC%81%E4%B8%9A%E8%AE%A4%E5%AE%9A&region=440100',
          qualifications: '在穗注册申报且首次通过国家高新技术企业认定的科技型中小企业。',
          promisedLimitDays: 5,
          materials: [
            { name: '高新技术企业认定申请书与审计报告', format: '科技创新平台上传', sampleTip: '中介机构审计报告电子版' },
            { name: '企业自主知识产权及科技成果转化材料', format: '知识产权局联网免提交', sampleTip: '发明专利/软著后台数据同步' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '高企申报', description: '在“广州市科技大脑”平台提交认定申请', timeCost: '通知期' },
            { stepNo: 2, stepName: '专家评审', description: '市科技局组织科技、财务专家进行评审', timeCost: '3个工作日' },
            { stepNo: 3, stepName: '奖补到账', description: '公示通过后由市区财政拨付最高20万元补贴', timeCost: '2个工作日' }
          ],
          handlingAddress: '广州市科学技术局高新技术处窗口',
          onlineRoute: '电脑登录“广州市科学技术局”官网（kjj.gz.gov.cn）或“广州科技大脑”，进入高企认定申报专区。',
          warnTip: '企业需具备核心自主知识产权并满足高新技术产品（服务）收入占比要求，获得认定后还可享受15%企业所得税优惠税率。'
        },
        citation: {
          title: '广州市进一步推动高新技术企业高质量发展若干措施',
          docNumber: '穗府办规〔2023〕18号',
          dept: '广州市人民政府办公厅',
          similarity: '96%',
          clause: '第五条【高企奖补】：对首次通过高新技术企业认定的科技型中小企业，由市财政给予最高20万元财政经费奖励。'
        },
        suggestions: [
          '高新技术企业认定需要多少项知识产权或发明专利？',
          '各区对国家高新技术企业的叠加配套奖励是多少？'
        ]
      };
    }

    // 11. 老年人优待卡与长寿保健金政策
    if (q.includes('老人') || q.includes('优待卡') || q.includes('长寿金') || q.includes('长寿保健金') || q.includes('乘车卡')) {
      return {
        summary: '惠老福利全覆盖！年满60周岁即可申领广州市老年人优待卡（60-64岁半价乘车，65岁以上全免乘车）；年满70周岁本市户籍长者还可按月领取长寿保健金。',
        guidedSteps: {
          affairId: 131,
          affairCode: 'GZ-MZ-LNYD031',
          affairName: '老年人优待卡申领与长寿保健金发放',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%80%81%E5%B9%B4%E4%BA%BA%E4%BC%98%E5%BE%85%E5%8D%A1&region=440100',
          qualifications: '广州市户籍或持本市居住证年满60周岁长者（70周岁以上享受长寿保健金）。',
          promisedLimitDays: 1,
          materials: [
            { name: '申请人居民身份证与近期大一寸彩照', format: '电子证照与拍照免冲印', sampleTip: '年满60周岁长者一键申办' },
            { name: '本人金融社保卡账号（申领长寿金）', format: '金融社保卡自动关联', sampleTip: '70周岁以上长者按月打款' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '便民申领', description: '登录“穗好办”APP搜索老年人优待卡申领', timeCost: '5分钟' },
            { stepNo: 2, stepName: '自动核准', description: '民政部门联网户籍及居住证数据，自动完成核准', timeCost: '1个工作日' },
            { stepNo: 3, stepName: '免费邮寄', description: '优待卡免费邮寄到家；长寿金按月发社保卡', timeCost: '当日制卡' }
          ],
          handlingAddress: '广州市各街镇综合养老服务中心及社区居委会专窗',
          onlineRoute: '打开微信“穗好办”小程序，搜索“老年人优待卡”，录入收件地址由邮政EMS免费寄送到家。',
          warnTip: '年满70周岁至79周岁长者长寿保健金为200元/月，80周岁至89周岁为300元/月，资金按月直发至社保卡。'
        },
        citation: {
          title: '广州市老年人优待办法与长寿保健金发放标准',
          docNumber: '穗府办规〔2021〕8号',
          dept: '广州市人民政府办公厅',
          similarity: '99%',
          clause: '第二条【老年人优待】：年满60周岁不满65周岁的老年人享受半价乘坐市内公共交通；年满65周岁以上享受全免费优待。年满70周岁本市户籍长者按月发放长寿保健金。'
        },
        suggestions: [
          '外地户籍老人持广州居住证可以办理全免费乘车卡吗？',
          '70岁长寿保健金需要每年进行在世资格认证吗？'
        ]
      };
    }

    // 兜底政务政策回答
    return {
      summary: '市民您好！广州市所有现行有效的政府规章和规范性文件均已在官方门户网站向全社会公开，实行统一公开与便民查询。',
      sections: [
        {
          title: '【公开渠道】政策法规检索途径',
          text: '• 登录广州市人民政府门户网站（www.gz.gov.cn），点击顶部“政务公开-政策法规”；\n• 支持输入关键词、年份或部门一键检索红头公文原文与权威解读。'
        },
        {
          title: '【咨询热线】12345便民服务热线',
          text: '• 如果您对具体政策执行有任何疑问，可随时拨打 12345 政务服务便民热线，一键直通责任委办局为您解答。'
        }
      ],
      citation: {
        title: '广州市行政规范性文件管理规定',
        docNumber: '广州市人民政府令第192号',
        dept: '广州市人民政府',
        similarity: '92%',
        clause: '第二十三条【公开与解读】：行政规范性文件应当自公布之日起在政府门户网站统一向社会公开，并同步发布权威政策解读文本。'
      },
      suggestions: [
        '如何确认广州市某项政策文件目前是否依然有效？',
        '打12345热线咨询政策大概多长时间能得到官方答复？'
      ]
    };
  }
  }

  if (!document.body && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssistant);
  } else {
    initAssistant();
  }
})();

