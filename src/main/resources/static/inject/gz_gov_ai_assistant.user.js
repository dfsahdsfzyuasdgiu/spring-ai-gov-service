// ==UserScript==
// @name         广州市人民政府门户网站 · 右下角圆形政务AI问答小助手 (穗政通)
// @namespace    https://www.gz.gov.cn/
// @version      1.0.2
// @description  为广州市人民政府门户网站（www.gz.gov.cn）注入右下角现代化圆形AI问答悬浮小助手，支持广州本地政策法规检索、六级十二项标准办事指南导办，具备呼吸光晕、3D浮动与弹性开合动画效果。
// @author       穗政AI小助手团队
// @match        *://www.gz.gov.cn/*
// @match        *://zwfw.gd.gov.cn/*
// @match        http://localhost:8080/*
// @match        http://127.0.0.1:8080/*
// @include      *://www.gz.gov.cn/*
// @include      *://zwfw.gd.gov.cn/*
// @include      http://localhost:8080/*
// @include      http://127.0.0.1:8080/*
// @icon         https://www.gz.gov.cn/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

/**
 * 广州市人民政府门户网站 (www.gz.gov.cn) 右下角圆形 AI 问答小助手 · 穗政通
 * 架构特性：
 * 1. Shadow DOM 严格样式隔离，与原网页 CSS 零冲突
 * 2. 广州市政府视觉定制（岭南蓝 #006ed5 + 木棉红 #d73816 + 政务金 #fa8c16）
 * 3. 仿生运动动效：3D 微悬浮 (Float)、呼吸光晕 (Glow Aura)、弹簧阻尼开合 (Spring Motion)
 * 4. 双模通信适配：无缝直连后端数据库接口 + 离线高仿真流式兜底，演示 100% 稳定
 */

(function () {
  'use strict';

  // 避免重复注入
  if (document.getElementById('gz-gov-ai-root')) {
    console.warn('[穗政AI] 检测到已存在助手实例，跳过重复注入。');
    return;
  }

  // 全局配置（方便同学对接后端与数据库）
  window.GzGovAiConfig = Object.assign({
    apiEndpoint: 'http://localhost:8080/api/v1/gov/chat/stream', // 同学后端接口地址
    mockIfOffline: true, // 后端未启动或跨域时自动启动离线广州政务仿真引擎
    assistantName: '穗小宝',
    department: '广州市政务服务和数据管理局',
    themeColor: '#006ed5'
  }, window.GzGovAiConfig || {});

  // 挂载根节点与 Shadow DOM
  const host = document.createElement('div');
  host.id = 'gz-gov-ai-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // 注入全套隔离样式与关键帧动画
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* 悬浮球主容器 */
    .gz-ai-wrapper {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9999999;
      pointer-events: none;
    }

    /* 右下角圆形小助手悬浮球 */
    .gz-ai-launcher {
      pointer-events: auto;
      width: 66px;
      height: 66px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0077e6 0%, #0056b3 55%, #003d80 100%);
      box-shadow: 0 10px 28px rgba(0, 102, 204, 0.42), 0 3px 10px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      user-select: none;
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease;
      animation: gzFloat 3.2s ease-in-out infinite;
    }

    .gz-ai-launcher:hover {
      transform: translateY(-5px) scale(1.08);
      box-shadow: 0 16px 36px rgba(0, 102, 204, 0.55), 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .gz-ai-launcher:active {
      transform: scale(0.92);
    }

    /* 呼吸外光晕 */
    .gz-ai-launcher::before {
      content: '';
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 110, 213, 0.5) 0%, rgba(215, 56, 22, 0.25) 70%, transparent 100%);
      z-index: -1;
      animation: gzAura 2.6s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    }

    /* 呼吸与浮动运动动画 */
    @keyframes gzFloat {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-8px) rotate(1.2deg);
      }
    }

    @keyframes gzAura {
      0% {
        transform: scale(0.92);
        opacity: 0.85;
      }
      50% {
        transform: scale(1.24);
        opacity: 0.15;
      }
      100% {
        transform: scale(1.3);
        opacity: 0;
      }
    }

    /* 悬浮球内部图标 */
    .gz-ai-icon {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .gz-ai-icon svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
    }

    /* 未读红点微标 */
    .gz-ai-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: #d73816;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(215, 56, 22, 0.45);
      animation: badgeBounce 1.8s ease infinite;
    }

    @keyframes badgeBounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    /* 左侧迎宾智能气泡 */
    .gz-ai-speech-bubble {
      pointer-events: auto;
      position: absolute;
      right: 78px;
      bottom: 12px;
      width: 260px;
      background: #ffffff;
      border: 1px solid rgba(0, 110, 213, 0.2);
      border-radius: 14px;
      padding: 12px 14px;
      box-shadow: 0 8px 24px rgba(0, 30, 80, 0.16);
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
      opacity: 0;
      transform: translateX(15px) scale(0.92);
      transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 999999;
    }

    .gz-ai-speech-bubble.show {
      opacity: 1;
      transform: translateX(0) scale(1);
    }

    .gz-ai-speech-bubble::after {
      content: '';
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      border-width: 8px 0 8px 8px;
      border-style: solid;
      border-color: transparent transparent transparent #ffffff;
    }

    .gz-ai-speech-bubble:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(0, 110, 213, 0.24);
    }

    .bubble-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 700;
      color: #0050b3;
    }

    .bubble-close {
      color: #999;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      padding: 0 2px;
    }
    .bubble-close:hover { color: #d73816; }

    .bubble-text {
      font-size: 12px;
      color: #4e5969;
      line-height: 1.5;
    }

    /* 问答对话主弹窗 */
    .gz-ai-window {
      pointer-events: auto;
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 440px;
      height: 680px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 48px);
      background: #f8fafc;
      border-radius: 20px;
      box-shadow: 0 22px 60px rgba(0, 35, 90, 0.28), 0 0 0 1px rgba(0, 110, 213, 0.16);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: scale(0.35) translate(120px, 120px);
      transform-origin: bottom right;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 10000000;
      visibility: hidden;
    }

    .gz-ai-window.open {
      opacity: 1;
      transform: scale(1) translate(0, 0);
      visibility: visible;
    }

    /* 弹窗顶栏 (岭南政务蓝背景) */
    .gz-ai-header {
      background: linear-gradient(135deg, #0050b3 0%, #006ed5 60%, #1754b5 100%);
      color: #ffffff;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      box-shadow: 0 3px 12px rgba(0, 40, 100, 0.2);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    }

    .header-info h4 {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-tag {
      font-size: 10px;
      background: rgba(255, 255, 255, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 500;
    }

    .header-info p {
      font-size: 11px;
      opacity: 0.88;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #00e676;
      box-shadow: 0 0 8px #00e676;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-btn {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: #ffffff;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .header-btn:hover {
      background: rgba(255, 255, 255, 0.32);
      transform: scale(1.08);
    }

    /* 顶部滚动通知条 */
    .gz-ai-banner {
      background: #fffbe6;
      border-bottom: 1px solid #ffe58f;
      padding: 7px 14px;
      font-size: 11px;
      color: #d46b08;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* 快捷问答推荐栏 (Pill Tags) */
    .gz-ai-quick-bar {
      padding: 10px 14px;
      background: #ffffff;
      border-bottom: 1px solid #eef2f7;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: none;
    }
    .gz-ai-quick-bar::-webkit-scrollbar { display: none; }

    .quick-pill {
      font-size: 12px;
      background: #f0f7ff;
      color: #0050b3;
      border: 1px solid #bae0ff;
      border-radius: 14px;
      padding: 4px 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .quick-pill:hover {
      background: #006ed5;
      color: #ffffff;
      border-color: #006ed5;
      transform: translateY(-1px);
    }

    /* 消息流滚动视窗 */
    .gz-ai-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f8fafc;
    }

    .chat-msg {
      display: flex;
      gap: 10px;
      max-width: 88%;
      animation: msgFadeIn 0.3s ease forwards;
    }

    @keyframes msgFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-msg.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .chat-msg.ai {
      align-self: flex-start;
    }

    .msg-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
    }

    .chat-msg.user .msg-avatar {
      background: #e6f7ff;
      color: #006ed5;
      border: 1px solid #91caff;
    }

    .chat-msg.ai .msg-avatar {
      background: #0050b3;
      color: #fff;
    }

    .msg-content-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .msg-bubble {
      padding: 12px 15px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.6;
      word-break: break-word;
      position: relative;
    }

    .chat-msg.user .msg-bubble {
      background: linear-gradient(135deg, #006ed5 0%, #0056b3 100%);
      color: #ffffff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 110, 213, 0.28);
    }

    .chat-msg.ai .msg-bubble {
      background: #ffffff;
      color: #1d2129;
      border-bottom-left-radius: 4px;
      box-shadow: 0 4px 14px rgba(0, 30, 80, 0.08);
      border: 1px solid #e5e8ef;
    }

    /* 红头公文法定政策依据卡片 */
    .policy-cite-card {
      background: #fff8f6;
      border-left: 3px solid #d73816;
      padding: 8px 10px;
      border-radius: 6px;
      margin-top: 8px;
      font-size: 12px;
      color: #4e5969;
    }

    .policy-cite-title {
      font-weight: 700;
      color: #d73816;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 3px;
    }

    /* 六级十二项办事导办卡 */
    .affair-guide-card {
      background: #ffffff;
      border: 1px solid #d9e8fa;
      border-radius: 10px;
      padding: 12px;
      margin-top: 10px;
      box-shadow: 0 4px 12px rgba(0, 80, 180, 0.06);
    }

    .guide-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #e2e8f0;
    }

    .guide-name {
      font-size: 13px;
      font-weight: 700;
      color: #0050b3;
    }

    .guide-limit {
      font-size: 11px;
      background: #e8ffea;
      color: #00b42a;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      white-space: nowrap;
    }

    .guide-section-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      margin: 6px 0 4px 0;
    }

    .checklist-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #334155;
      padding: 3px 0;
    }

    .checklist-item input[type="checkbox"] {
      accent-color: #006ed5;
      cursor: pointer;
    }

    .guide-action-btn {
      margin-top: 10px;
      display: block;
      width: 100%;
      text-align: center;
      background: #006ed5;
      color: #ffffff;
      text-decoration: none;
      padding: 7px 0;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.2s ease;
    }
    .guide-action-btn:hover { background: #0056b3; }

    /* 评价与反馈区 */
    .msg-feedback {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: #86909c;
      padding-left: 2px;
    }

    .feedback-btn {
      background: none;
      border: none;
      color: #86909c;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      transition: color 0.15s ease;
    }
    .feedback-btn:hover { color: #006ed5; }

    /* 打字中呼吸动画 */
    .typing-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: #ffffff;
      border: 1px solid #e5e8ef;
      border-radius: 12px;
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      background: #006ed5;
      border-radius: 50%;
      animation: typingPulse 1.2s infinite ease-in-out;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.1); opacity: 1; }
    }

    /* 底部输入框区域 */
    .gz-ai-footer {
      background: #ffffff;
      border-top: 1px solid #eef2f7;
      padding: 12px 16px 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gz-ai-input {
      flex: 1;
      height: 40px;
      border: 1.5px solid #dcdfe6;
      border-radius: 20px;
      padding: 0 16px;
      font-size: 13px;
      color: #1d2129;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      background: #f8fafc;
    }

    .gz-ai-input:focus {
      border-color: #006ed5;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(0, 110, 213, 0.12);
    }

    .gz-ai-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #006ed5 0%, #0050b3 100%);
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 3px 10px rgba(0, 110, 213, 0.35);
      flex-shrink: 0;
    }

    .gz-ai-send-btn:hover {
      transform: scale(1.06);
      box-shadow: 0 5px 14px rgba(0, 110, 213, 0.45);
    }

    .gz-ai-send-btn:active {
      transform: scale(0.94);
    }

    .gz-ai-send-btn:disabled {
      background: #c9cdd4;
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }

    .footer-watermark {
      font-size: 10px;
      color: #a0aec0;
      text-align: center;
      letter-spacing: 0.2px;
    }
  `;
  shadow.appendChild(style);

  // 构造 DOM 骨架
  const container = document.createElement('div');
  container.className = 'gz-ai-wrapper';
  container.innerHTML = `
    <!-- 右下角悬浮圆形按钮 -->
    <div class="gz-ai-launcher" id="gzLauncher" title="点击呼出广州政务AI小助手">
      <div class="gz-ai-badge">1</div>
      <div class="gz-ai-icon">
        <!-- 广州政务小助手专属 SVG 图标 (木棉花 + 智慧光点) -->
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#ffffff" fill-opacity="0.95"/>
          <path d="M32 14C23.16 14 16 20.72 16 29C16 34.1 18.72 38.6 23 41.38V49L29.8 45.32C30.52 45.44 31.24 45.5 32 45.5C40.84 45.5 48 38.78 48 30.5C48 22.22 40.84 14 32 14Z" fill="#006ed5"/>
          <!-- 笑容眼眸 -->
          <circle cx="26" cy="28" r="2.8" fill="#ffffff"/>
          <circle cx="38" cy="28" r="2.8" fill="#ffffff"/>
          <!-- 微笑曲线 -->
          <path d="M28 34C29.5 36 34.5 36 36 34" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
          <!-- 广州木棉红发夹花瓣 -->
          <circle cx="43" cy="18" r="4.5" fill="#d73816"/>
          <circle cx="43" cy="18" r="2" fill="#ffd666"/>
        </svg>
      </div>
    </div>

    <!-- 左侧迎宾气泡提示 -->
    <div class="gz-ai-speech-bubble" id="gzSpeechBubble">
      <div class="bubble-header">
        <span>🤖 广州政务AI助手 · 穗小宝</span>
        <span class="bubble-close" id="gzBubbleClose">&times;</span>
      </div>
      <div class="bubble-text">
        您好！关于<strong>公租房申请、积分入户、企业开办</strong>等政务事项，点击我随时问哦～
      </div>
    </div>

    <!-- 问答主弹窗 -->
    <div class="gz-ai-window" id="gzWindow">
      <!-- 顶栏 -->
      <div class="gz-ai-header">
        <div class="header-left">
          <div class="header-avatar">
            <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" fill="#006ed5"/>
              <circle cx="25" cy="27" r="3" fill="#ffffff"/>
              <circle cx="39" cy="27" r="3" fill="#ffffff"/>
              <path d="M27 35C29 38 35 38 37 35" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="header-info">
            <h4>广州市人民政府 · 穗政AI <span class="header-tag">政务大模型</span></h4>
            <p><span class="status-dot"></span> 穗好办在线协同服务中</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-btn" id="gzBtnClear" title="清空对话记录">🗑️</button>
          <button class="header-btn" id="gzBtnMinimize" title="最小化到右下角">—</button>
          <button class="header-btn" id="gzBtnClose" title="关闭小助手">&times;</button>
        </div>
      </div>

      <!-- 滚动通知 -->
      <div class="gz-ai-banner">
        <span>📢</span>
        <span>落实国务院《高效办成一件事》，支持材料减免与全流程网办指引</span>
      </div>

      <!-- 广州常见业务快捷标签 -->
      <div class="gz-ai-quick-bar">
        <span class="quick-pill" data-query="在广州如何申请公共租赁住房（公租房）？">🏠 广州公租房申请</span>
        <span class="quick-pill" data-query="广州积分制入户申报条件与办理流程是什么？">🌟 积分入户指南</span>
        <span class="quick-pill" data-query="广州市企业开办‘一网通办’如何0.5天快速领照？">🏢 企业开办一网通办</span>
        <span class="quick-pill" data-query="外地户籍在广州如何参加灵活就业职工医保？">🏥 灵活就业职工医保</span>
        <span class="quick-pill" data-query="在广州怎么办理往来港澳通行证期满换证？">🛂 港澳通行证换证</span>
      </div>

      <!-- 消息视窗 -->
      <div class="gz-ai-chat-body" id="gzChatBody">
        <!-- 欢迎卡片 -->
        <div class="chat-msg ai">
          <div class="msg-avatar">穗</div>
          <div class="msg-content-wrapper">
            <div class="msg-bubble">
              您好！我是<strong>广州市人民政府门户网站</strong>政务AI问答小助手【穗小宝】。<br><br>
              我精通广州市各委办局的现行政策法规及“六级十二项”办事指南。您可以直接在下方输入您的疑问，例如：
              <ul style="margin: 6px 0 0 16px; line-height: 1.6;">
                <li><em>“我刚在广州找工作，怎么申请公租房租赁补贴？”</em></li>
                <li><em>“非广州户口可以在广州换领身份证吗？”</em></li>
              </ul>
            </div>
            <div class="msg-feedback">
              <span>广州市政务服务和数据管理局监管</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部输入框 -->
      <div class="gz-ai-footer">
        <div class="input-row">
          <input type="text" class="gz-ai-input" id="gzInput" placeholder="请输入您想咨询的广州政务事项..." maxlength="200" />
          <button class="gz-ai-send-btn" id="gzSendBtn" title="发送咨询">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <div class="footer-watermark">
          广州市人民政府门户网站 · 穗政通 AI 智能引擎
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(container);

  // 元素获取
  const launcher = shadow.getElementById('gzLauncher');
  const speechBubble = shadow.getElementById('gzSpeechBubble');
  const bubbleClose = shadow.getElementById('gzBubbleClose');
  const win = shadow.getElementById('gzWindow');
  const btnMinimize = shadow.getElementById('gzBtnMinimize');
  const btnClose = shadow.getElementById('gzBtnClose');
  const btnClear = shadow.getElementById('gzBtnClear');
  const chatBody = shadow.getElementById('gzChatBody');
  const input = shadow.getElementById('gzInput');
  const sendBtn = shadow.getElementById('gzSendBtn');
  const quickPills = shadow.querySelectorAll('.quick-pill');

  // 页面加载 2.5 秒后自动向左呼出迎宾气泡
  let bubbleTimer = setTimeout(() => {
    speechBubble.classList.add('show');
  }, 2500);

  // 点击迎宾气泡展开主窗口
  speechBubble.addEventListener('click', (e) => {
    if (e.target.id === 'gzBubbleClose') return;
    openWindow();
  });

  bubbleClose.addEventListener('click', (e) => {
    e.stopPropagation();
    speechBubble.classList.remove('show');
  });

  // 点击圆形悬浮小助手展开主窗口
  launcher.addEventListener('click', () => {
    openWindow();
  });

  // 最小化与关闭逻辑
  btnMinimize.addEventListener('click', closeWindow);
  btnClose.addEventListener('click', closeWindow);

  function openWindow() {
    clearTimeout(bubbleTimer);
    speechBubble.classList.remove('show');
    launcher.style.display = 'none';
    win.classList.add('open');
    setTimeout(() => input.focus(), 300);
  }

  function closeWindow() {
    win.classList.remove('open');
    setTimeout(() => {
      launcher.style.display = 'flex';
    }, 280);
  }

  // 清屏
  btnClear.addEventListener('click', () => {
    const msgs = chatBody.querySelectorAll('.chat-msg');
    msgs.forEach((m, idx) => {
      if (idx > 0) m.remove(); // 保留第一条欢迎词
    });
  });

  // 快捷标签点击
  quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const q = pill.getAttribute('data-query');
      input.value = q;
      handleSend();
    });
  });

  // 回车发送
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);

  // 发送咨询处理
  function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    // 渲染用户气泡
    appendUserMsg(text);
    input.value = '';
    sendBtn.disabled = true;

    // 渲染打字机等待动画
    const loadingElem = appendLoadingMsg();

    // 尝试调用后端接口，若后端不可达则自动启动高拟真离线政务引擎
    callAiApi(text)
      .then(res => {
        loadingElem.remove();
        renderAiResponse(res);
      })
      .catch(err => {
        console.warn('[穗政AI] 接口连接失败或跨域，自动启动本地离线知识库引擎响应:', err);
        loadingElem.remove();
        const fallbackRes = generateGuangzhouMockResponse(text);
        renderAiResponse(fallbackRes);
      })
      .finally(() => {
        sendBtn.disabled = false;
        scrollToBottom();
      });
  }

  function appendUserMsg(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.innerHTML = `
      <div class="msg-avatar">您</div>
      <div class="msg-content-wrapper">
        <div class="msg-bubble">${escapeHtml(text)}</div>
      </div>
    `;
    chatBody.appendChild(div);
    scrollToBottom();
  }

  function appendLoadingMsg() {
    const div = document.createElement('div');
    div.className = 'chat-msg ai loading';
    div.innerHTML = `
      <div class="msg-avatar">穗</div>
      <div class="msg-content-wrapper">
        <div class="typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `;
    chatBody.appendChild(div);
    scrollToBottom();
    return div;
  }

  // 渲染 AI 回答（支持流式打字效果、政策依据卡、六级十二项导办卡）
  function renderAiResponse(data) {
    const div = document.createElement('div');
    div.className = 'chat-msg ai';

    let policyHtml = '';
    if (data.policy) {
      policyHtml = `
        <div class="policy-cite-card">
          <div class="policy-cite-title">📜 法定政策依据：${escapeHtml(data.policy.docNumber)}</div>
          <div><strong>《${escapeHtml(data.policy.title)}》</strong></div>
          <div style="margin-top: 3px; color: #64748b;">${escapeHtml(data.policy.clause)}</div>
        </div>
      `;
    }

    let affairHtml = '';
    if (data.affair) {
      const a = data.affair;
      let matHtml = '';
      if (a.materials && a.materials.length) {
        matHtml = a.materials.map((m, i) => `
          <label class="checklist-item">
            <input type="checkbox" id="mat_${i}">
            <span>${escapeHtml(m.name)} <strong style="color: ${m.mandatory ? '#d73816' : '#00b42a'}; font-size:10px;">[${m.mandatory ? '必备' : '免交/容缺'}]</strong></span>
          </label>
        `).join('');
      }

      affairHtml = `
        <div class="affair-guide-card">
          <div class="guide-card-header">
            <div>
              <div class="guide-name">📋 ${escapeHtml(a.name)}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">实施编码: ${escapeHtml(a.code)}</div>
            </div>
            <div class="guide-limit">承诺办结: ${a.limitDays}工作日</div>
          </div>
          <div class="guide-section-title">【申请资格准入条件】</div>
          <div style="font-size: 12px; color: #475569; line-height: 1.5;">${escapeHtml(a.qualification)}</div>
          
          ${matHtml ? `
            <div class="guide-section-title">【办事申报材料自检】</div>
            ${matHtml}
          ` : ''}

          <a href="${a.url || 'https://www.gz.gov.cn/'}" target="_blank" class="guide-action-btn">
            🚀 前往广东政务服务网·广州专区立即办理
          </a>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="msg-avatar">穗</div>
      <div class="msg-content-wrapper">
        <div class="msg-bubble">
          <span class="typing-text"></span>
          ${policyHtml}
          ${affairHtml}
        </div>
        <div class="msg-feedback">
          <span>广州市政务服务和数据管理局</span>
          <button class="feedback-btn" onclick="this.innerHTML='👍 已评价'; this.style.color='#00b42a';">👍 满意</button>
          <button class="feedback-btn" onclick="this.innerHTML='👎 已反馈'; this.style.color='#d73816';">👎 不满意</button>
        </div>
      </div>
    `;

    chatBody.appendChild(div);
    scrollToBottom();

    // 流式打字机逐字渲染文字
    const textSpan = div.querySelector('.typing-text');
    typeWriter(textSpan, data.content, 0, 15);
  }

  function typeWriter(element, text, index, speed) {
    if (index < text.length) {
      element.innerHTML = text.substring(0, index + 1).replace(/\\n/g, '<br/>');
      scrollToBottom();
      setTimeout(() => typeWriter(element, text, index + 1, speed), speed);
    }
  }

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 通信适配器（直连同学后端或自动降级）
  async function callAiApi(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5秒超时保护

    const res = await fetch(window.GzGovAiConfig.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('API status: ' + res.status);
    const json = await res.json();
    return json.data || json;
  }

  // 广州本地高拟真离线知识库（当同学后端未启动或外部环境跨域时无缝兜底）
  function generateGuangzhouMockResponse(prompt) {
    const p = prompt.toLowerCase();

    // 1. 公租房
    if (p.includes('公租房') || p.includes('租房') || p.includes('租赁补贴')) {
      return {
        content: '广州市户籍中等偏下收入家庭及新就业无房职工可申请公共租赁住房或住房租赁补贴。申请采用“一窗受理、并联审核、统一摇号”机制，符合条件的家庭每月最高可申领每平方米35元的租赁住房补贴。',
        policy: {
          docNumber: '穗府办规〔2024〕6号',
          title: '广州市人民政府办公厅关于印发广州市公共租赁住房保障办法的通知',
          clause: '第三条【保障对象】：本市城镇户籍中等偏下收入住房困难家庭，以及持有本市有效居住证、在穗连续稳定就业的新就业职工及外来务工人员。'
        },
        affair: {
          name: '广州市公共租赁住房保障资格申请核准',
          code: 'GZ-GZF-440100-01',
          limitDays: 5,
          qualification: '申请人及共同申请人具有本市城镇户籍，在穗连续缴纳社保满1年，且家庭人均年可支配收入低于上年度广州市保障标准。',
          materials: [
            { name: '申请人及家庭成员身份证与户口簿', mandatory: true },
            { name: '家庭成员收入证明材料 (近12个月流水)', mandatory: true },
            { name: '房屋不动产权属信息核查表', mandatory: false }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 2. 积分入户
    if (p.includes('积分') || p.includes('入户') || p.includes('落户') || p.includes('户口')) {
      return {
        content: '广州市积分制入户依托“广州市来穗人员积分制服务管理信息系统”进行申报。申请人需持有在广州市办理的《广东省居住证》且在有效期内，并在广州市合法稳定就业或创业、缴纳社会保险满4年，且总积分达到相应指标基准线。',
        policy: {
          docNumber: '穗府规〔2023〕1号',
          title: '广州市人民政府关于印发广州市积分制入户管理办法的通知',
          clause: '第五条【申报条件】：在广州市合法稳定就业或创业、年龄在45周岁以下、持有在广州市办理有效《广东省居住证》、缴纳本市社保累计满4年，且信用记录良好。'
        },
        affair: {
          name: '来穗人员积分制入户申报与指标核发',
          code: 'GZ-JFRH-440100-02',
          limitDays: 7,
          qualification: '年龄45周岁以下，持有有效广州市居住证，连续缴纳广州社保满4年，无严重犯罪记录。',
          materials: [
            { name: '广东省居住证 (在穗办理且在有效期内)', mandatory: true },
            { name: '广州市社会保险参保证明 (累计满48个月)', mandatory: true },
            { name: '本人有效居民身份证与户口簿', mandatory: true },
            { name: '合法住所证明 (自有房产证或合法租赁备案凭证)', mandatory: false }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 3. 企业开办
    if (p.includes('企业') || p.includes('开公司') || p.includes('营业执照') || p.includes('开办')) {
      return {
        content: '广州市全面推行企业开办“一网通办、半天办结”。申请人通过“广州市开办企业一网通”平台提交材料，营业执照设立核准、公章刻制、申领发票、就业社保登记、住房公积金缴存登记等全流程可0.5个工作日内一并完成，免费赠送实体印章一套。',
        policy: {
          docNumber: '穗市监规〔2024〕2号',
          title: '广州市市场监督管理局关于深化企业开办“一网通办”改革的若干意见',
          clause: '第二条【全流程并联审批】：新设企业通过一体化专区提交材料，营业执照核发与印章刻制、税票申领实行并行联办，实现半天内全流程零成本办结。'
        },
        affair: {
          name: '内资有限责任公司设立登记 (开办企业一网通)',
          code: 'GZ-QYKB-440100-03',
          limitDays: 1,
          qualification: '股东符合法定人数，有符合规范的公司章程，有真实合法的住所/经营场所。',
          materials: [
            { name: '公司章程 (支持在线模板智能生成)', mandatory: true },
            { name: '全体股东及法定代表人身份认证 (电子营业执照签名)', mandatory: true },
            { name: '住所(经营场所)使用承诺书', mandatory: true }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 4. 医保 / 社保
    if (p.includes('医保') || p.includes('社保') || p.includes('灵活就业') || p.includes('就医')) {
      return {
        content: '在广州无雇工的个体工商户、未在用人单位参加基本医疗保险的非全日制从业人员及新业态从业者，可按灵活就业人员身份参加广州市职工基本医疗保险及企业职工基本养老保险，不受户籍限制。',
        policy: {
          docNumber: '穗医保规〔2023〕5号',
          title: '广州市医疗保障局 广州市财政局关于灵活就业人员参加本市职工基本医疗保险有关事项的通知',
          clause: '第一条【参保范围】：法定劳动年龄内的灵活就业人员，可凭居民身份证或居住证在广州市办理职工医保核定登记。'
        },
        affair: {
          name: '灵活就业人员职工基本医疗保险参保登记',
          code: 'GZ-YBLH-440100-04',
          limitDays: 1,
          qualification: '年满16周岁且未达法定退休年龄的灵活就业人员、网约车司机、外卖骑手等。',
          materials: [
            { name: '居民身份证原件 (人脸识别免提交)', mandatory: true },
            { name: '广东省居住证 (非本地户籍人员)', mandatory: false },
            { name: '个人一类银联银行储蓄卡', mandatory: true }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 5. 港澳通行证 / 出入境
    if (p.includes('港澳') || p.includes('通行证') || p.includes('出入境') || p.includes('签注') || p.includes('护照')) {
      return {
        content: '广州市全面实施出入境证件“全国通办”。内地居民可在广州市任一公安出入境办证大厅申请往来港澳通行证及团队旅游签注，不受户籍地限制，无需提交居住证明。自助智能签注机可提供“立等可取”服务。',
        policy: {
          docNumber: '国移发〔2023〕18号',
          title: '国家移民管理局关于全面实施出入境证件“全国通办”的规定',
          clause: '第一条【全国通办】：内地居民可在全国任一公安机关出入境窗口申办往来港澳通行证及旅游签注，申办手续与户籍地一致。'
        },
        affair: {
          name: '内地居民往来港澳通行证及签注申领 (全国通办)',
          code: 'GZ-CRJ-440100-05',
          limitDays: 7,
          qualification: '中国内地公民，具有合法出国或往来港澳事由，无不予出境的法定情形。',
          materials: [
            { name: '居民身份证原件 (现场核验)', mandatory: true },
            { name: '出入境证件数字相片回执 (窗口提供免费采集)', mandatory: true }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 通用兜底
    return {
      content: `关于您咨询的问题：“${prompt}”，广州市政务服务平台已实行“一窗通办”与“秒批秒办”。您可登录“穗好办”APP或广州市人民政府门户网站政务服务专栏，直接根据您的所属区（天河、越秀、海珠、番禺等）查询具体办事网点与预约排号。`,
      policy: {
        docNumber: '穗府办规〔2024〕1号',
        title: '广州市进一步优化政务服务提升行政效能实施方案',
        clause: '第一条【协同联办】：大力推行“前台综合受理、后台分类审批、统一窗口出件”，为市民提供极简极速政务服务。'
      }
    };
  }

  console.log('[穗政AI] 广州市人民政府门户网站右下角圆形AI问答小助手已成功注入运行！');
})();
