// ==UserScript==
// @name         骞垮窞甯備汉姘戞斂搴滈棬鎴风綉绔?路 鏀垮姟鍜ㄨ闂瓟鍔╂墜 (鏍囧噯鍏枃鐩磋鐗?
// @namespace    https://www.gz.gov.cn/
// @version      1.1.0
// @description  涓哄箍宸炲競浜烘皯鏀垮簻闂ㄦ埛缃戠珯锛坵ww.gz.gov.cn锛夋彁渚涘彸涓嬭鏀垮姟鍜ㄨ涓撶獥锛屼弗鏍奸伒寰畼鏂瑰叕鏂囩洿瑙掕瑙夎鑼冿紙鍘婚櫎鍗￠€氬浘鏍囷紝鏀垮姟钃濈孩涓ヨ皑鎺掔増锛夛紝鏀寔娉曞畾鏀跨瓥渚濇嵁绮惧噯婧簮涓庡姙浜嬫潗鏂欒嚜妫€銆?// @author       骞垮窞鏀垮姟闂瓟涓撶獥鍥㈤槦
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
 * 政务智能咨询专窗 · 前端独立注入插件
 * 
 * 视觉规范：
 * 1. 严格契合广州市人民政府官方视觉体系 (GB/T 33356 国家政务门户网站规范)
 * 2. 经典政务基色：广州天蓝 (#006ed5) + 岭南深蓝 (#003a8c) + 顶栏公文红 (#c20505) + 暖白纸色 (#fafbfc)
 * 3. 严谨直角排版：取消圆角，全系直角公文风格，杜绝任何浮夸卡通元素与非规范 Emoji
 * 4. 工业级顶栏交互：极简矢量 SVG 控制按钮 (清屏/最小化/关闭)，彻底杜绝文字折行与样式生硬
 * 5. Shadow DOM 物理隔离：与 gz.gov.cn 现有 CSS/JS 零冲突、零污染
 * 6. 双模通信：支持对接同学后端数据库接口，在离线/无网络时自动切换至广州政务仿真知识库引擎
 */

(function () {
  'use strict';

  // 避免在同一页面重复注入
  if (document.getElementById('gz-gov-ai-root')) {
    console.warn('[广州政务咨询] 已存在运行实例，跳过重复初始化。');
    return;
  }

  // 全局对接配置 (便于开发小组同学直连数据库与大模型服务)
  window.GzGovAiConfig = Object.assign({
    apiEndpoint: 'http://localhost:8080/api/v1/gov/chat/stream', // 同学后端流式/普通问答接口
    mockIfOffline: true,                                       // 后端服务离线时自动切换为内置高保真知识库
    assistantName: '广州政务智能咨询专窗',
    authority: '广州市人民政府门户网站',
    organizer: '广州市政务服务和数据管理局',
    hotline: '12345政务服务便民热线'
  }, window.GzGovAiConfig || {});

  // 宿主节点与 Shadow DOM 挂载
  const host = document.createElement('div');
  host.id = 'gz-gov-ai-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // 注入量身定做的官方公文直角视觉样式
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
      bottom: 28px;
      right: 28px;
      z-index: 99999999;
      pointer-events: none;
    }

    /* ========================================================
       1. 右下角悬浮徽标 (经典正圆徽标，内置穗字官印与呼吸动效)
       ======================================================== */
    .gz-launcher {
      pointer-events: auto;
      width: 66px;
      height: 66px;
      border-radius: 50%;
      background: linear-gradient(135deg, #006ed5 0%, #003a8c 100%);
      box-shadow: 0 8px 24px rgba(0, 58, 140, 0.35), 0 2px 6px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      user-select: none;
      border: 2px solid #ffffff;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
      animation: gzFloat 3.5s ease-in-out infinite;
    }

    .gz-launcher:hover {
      transform: translateY(-5px) scale(1.04);
      box-shadow: 0 12px 32px rgba(0, 58, 140, 0.45), 0 4px 10px rgba(0, 0, 0, 0.2);
    }

    .gz-launcher:active {
      transform: scale(0.96);
    }

    /* 柔和的政务蓝呼吸外光环 */
    .gz-launcher::before {
      content: '';
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 110, 213, 0.35) 0%, rgba(194, 5, 5, 0.18) 70%, transparent 100%);
      z-index: -1;
      animation: gzAura 2.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    }

    @keyframes gzFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-7px); }
    }

    @keyframes gzAura {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.25); opacity: 0.1; }
      100% { transform: scale(1.3); opacity: 0; }
    }

    .launcher-seal {
      font-size: 21px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
      letter-spacing: 1px;
      text-shadow: 0 1px 3px rgba(0, 20, 60, 0.4);
    }

    .launcher-caption {
      font-size: 10px;
      font-weight: 700;
      color: #ffd666;
      margin-top: 3px;
      letter-spacing: 0.5px;
      transform: scale(0.9);
    }

    .launcher-tag {
      position: absolute;
      top: -3px;
      right: -3px;
      background: #c20505;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 0;
      border: 1px solid #ffffff;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 5px rgba(194, 5, 5, 0.4);
    }

    /* ========================================================
       2. 欢迎公文气泡提示 (向左滑出，直角通告条)
       ======================================================== */
    .gz-greeting-card {
      pointer-events: auto;
      position: absolute;
      right: 78px;
      bottom: 10px;
      width: 280px;
      background: #ffffff;
      border: 1px solid #b0cbe8;
      border-top: 3px solid #c20505;
      border-radius: 0;
      padding: 12px 14px;
      box-shadow: 0 8px 24px rgba(0, 30, 80, 0.16);
      display: flex;
      flex-direction: column;
      gap: 6px;
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
       3. 核心咨询对话大厅 (全直角公文排版，权威政务视觉)
       ======================================================== */
    .gz-dialog-window {
      pointer-events: auto;
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 460px;
      height: 700px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 48px);
      background: #ffffff;
      border: 1px solid #003a8c;
      border-top: 4px solid #c20505; /* 广州市人民政府顶头公文红 */
      border-radius: 0 !important;   /* 彻底直角 */
      box-shadow: 0 16px 48px rgba(0, 30, 80, 0.28);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: scale(0.88) translateY(36px);
      transform-origin: bottom right;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100000000;
      visibility: hidden;
    }

    .gz-dialog-window.open {
      opacity: 1;
      transform: scale(1) translateY(0);
      visibility: visible;
    }

    /* 顶栏：广州政务蓝 + 穗印 + 精致矢量 SVG 控制按钮 */
    .gz-window-header {
      background: linear-gradient(90deg, #0050b3 0%, #006ed5 100%);
      color: #ffffff;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #003a8c;
      user-select: none;
    }

    .header-main {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-seal-box {
      width: 32px;
      height: 32px;
      background: #c20505;
      border: 1px solid #ffd666;
      border-radius: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 900;
      color: #ffffff;
      flex-shrink: 0;
      box-shadow: inset 0 0 4px rgba(0,0,0,0.3);
    }

    .header-titles h3 {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #ffffff;
      line-height: 1.3;
    }

    .header-titles p {
      font-size: 11px;
      color: #d6e4ff;
      letter-spacing: 0.3px;
      margin-top: 1px;
    }

    /* 工业级 SVG 矢量控制按钮 (解决换行与简陋方块问题) */
    .header-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .win-ctrl-btn {
      width: 28px;
      height: 28px;
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
      width: 15px;
      height: 15px;
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
      padding: 7px 12px;
      font-size: 11px;
      color: #003a8c;
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.4;
    }

    .notice-badge {
      background: #c20505;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 0;
      flex-shrink: 0;
      letter-spacing: 0.5px;
    }

    /* 广州高频政务导航直角标签 */
    .gz-quick-bar {
      padding: 8px 12px;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: none;
    }
    .gz-quick-bar::-webkit-scrollbar { display: none; }

    .quick-chip {
      font-size: 12px;
      background: #ffffff;
      color: #003a8c;
      border: 1px solid #b0cbe8;
      border-radius: 0;
      padding: 4px 9px;
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
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f7f9fc;
    }

    .chat-row {
      display: flex;
      flex-direction: column;
      max-width: 95%;
      animation: gzMsgFade 0.22s ease forwards;
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
      padding: 12px 14px;
      border-radius: 0 !important;
      font-size: 13px;
      line-height: 1.65;
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

    /* 红头公文法定政策依据卡 */
    .doc-statute-card {
      background: #fdf6ec;
      border: 1px solid #faecd8;
      border-left: 4px solid #c20505;
      border-radius: 0 !important;
      padding: 10px 12px;
      margin-top: 10px;
      font-size: 12px;
      color: #333333;
    }

    .doc-statute-title {
      font-weight: 700;
      color: #c20505;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .doc-statute-body {
      color: #555555;
      line-height: 1.55;
      margin-top: 4px;
    }

    /* 六级十二项办事标准指南卡 */
    .doc-affair-card {
      background: #ffffff;
      border: 1px solid #b0cbe8;
      border-radius: 0 !important;
      padding: 12px;
      margin-top: 12px;
    }

    .affair-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6px;
      border-bottom: 1px solid #e8e8e8;
      margin-bottom: 8px;
    }

    .affair-title {
      font-size: 13px;
      font-weight: 700;
      color: #003a8c;
    }

    .affair-code {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    .affair-limit-tag {
      font-size: 11px;
      background: #f6ffed;
      color: #389e0d;
      border: 1px solid #b7eb8f;
      padding: 2px 6px;
      border-radius: 0;
      font-weight: 600;
      white-space: nowrap;
    }

    .affair-sec-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin: 8px 0 4px 0;
    }

    .affair-check-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #333333;
      padding: 3px 0;
    }

    .affair-check-row input[type="checkbox"] {
      accent-color: #0050b3;
      cursor: pointer;
    }

    .affair-direct-btn {
      margin-top: 10px;
      display: block;
      width: 100%;
      text-align: center;
      background: #006ed5;
      color: #ffffff;
      text-decoration: none;
      padding: 8px 0;
      border-radius: 0;
      font-size: 12px;
      font-weight: 600;
      transition: background 0.18s ease;
    }
    .affair-direct-btn:hover { background: #0050b3; }

    /* 评价与采纳操作行 */
    .chat-feedback-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: #8c8c8c;
      margin-top: 6px;
    }

    .action-sub-btn {
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      border-radius: 0;
      color: #595959;
      cursor: pointer;
      padding: 2px 8px;
      font-size: 11px;
      transition: all 0.15s ease;
    }
    .action-sub-btn:hover { color: #0050b3; border-color: #0050b3; background: #ffffff; }

    /* 等待打字动效 */
    .typing-box {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: #ffffff;
      border: 1px solid #dcdfe6;
      border-radius: 0;
    }

    .typing-block {
      width: 6px;
      height: 6px;
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
      border-top: 1px solid #e8e8e8;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gz-text-input {
      flex: 1;
      height: 38px;
      border: 1px solid #b0cbe8;
      border-radius: 0 !important;
      padding: 0 12px;
      font-size: 13px;
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
      height: 38px;
      padding: 0 18px;
      border-radius: 0 !important;
      border: none;
      background: #006ed5;
      color: #ffffff;
      cursor: pointer;
      font-size: 13px;
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
      font-size: 10px;
      color: #8c8c8c;
      text-align: center;
      letter-spacing: 0.3px;
    }
  `;
  shadow.appendChild(style);

  // 构造 DOM 骨架 (全系矢量 SVG 图标与直角公文)
  const container = document.createElement('div');
  container.className = 'gz-gov-shell';
  container.innerHTML = `
    <!-- 右下角悬浮圆形徽章 -->
    <div class="gz-launcher" id="gzLauncher" title="点击呼出广州市人民政府政务智能咨询专窗">
      <div class="launcher-tag">咨询</div>
      <div class="launcher-seal">穗</div>
      <div class="launcher-caption">政务问答</div>
    </div>

    <!-- 左侧迎宾公文通告卡片 -->
    <div class="gz-greeting-card" id="gzGreetingCard">
      <div class="greeting-header">
        <span>广州市人民政府 · 政务咨询服务</span>
        <span class="greeting-close" id="gzGreetingClose" title="关闭提示">&times;</span>
      </div>
      <div class="greeting-body">
        市民您好！关于<strong>公租房保障、积分制入户、企业开办、医保社保、港澳通行证</strong>等办理指引，欢迎点击此处进行咨询。
      </div>
    </div>

    <!-- 咨询对话大厅主弹窗 (全直角公文标准结构) -->
    <div class="gz-dialog-window" id="gzDialogWindow">
      <!-- 顶栏与控制按钮 -->
      <div class="gz-window-header">
        <div class="header-main">
          <div class="header-seal-box">穗</div>
          <div class="header-titles">
            <h3>广州市人民政府门户网站 · 政务智能咨询</h3>
            <p>广州市政务服务和数据管理局主办 ｜ 12345热线协同</p>
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
        <span>全面落实“高效办成一件事”标准，支持法定政策依据精准溯源与申报材料自检</span>
      </div>

      <!-- 高频热搜业务导航直角标签 -->
      <div class="gz-quick-bar">
        <span class="quick-chip" data-query="在广州如何申请公共租赁住房（公租房）？">公租房保障申请</span>
        <span class="quick-chip" data-query="广州积分制入户申报条件与办理流程是什么？">积分制入户申报</span>
        <span class="quick-chip" data-query="广州市企业开办‘一网通办’如何0.5天快速领照？">企业开办一网通</span>
        <span class="quick-chip" data-query="外地户籍在广州如何参加灵活就业职工医保？">灵活就业职工医保</span>
        <span class="quick-chip" data-query="广州市中小客车增量指标（摇号与竞价）申请条件？">车牌摇号竞价</span>
        <span class="quick-chip" data-query="在广州怎么办理往来港澳通行证期满换发？">港澳通行证换证</span>
      </div>

      <!-- 消息列表流 -->
      <div class="gz-chat-main" id="gzChatMain">
        <div class="chat-row ai">
          <div class="chat-author">广州市政务咨询专窗</div>
          <div class="chat-bubble">
            您好，欢迎使用<strong>广州市人民政府门户网站</strong>政务智能咨询服务。<br><br>
            本专窗汇集广州市各委办局现行有效的政策规章及“六级十二项”标准办事指南。您可以通过文字咨询办理条件、申报材料及网上申办流程，例如：
            <ul style="margin: 6px 0 0 18px; line-height: 1.6; color: #475569;">
              <li><em>“新就业无房职工在广州申请公租房租赁补贴的条件是什么？”</em></li>
              <li><em>“外地户籍居民如何在广州申请办理积分入户？”</em></li>
            </ul>
          </div>
          <div class="chat-feedback-bar">
            <span>信息保障：广州市政务服务和数据管理局</span>
          </div>
        </div>
      </div>

      <!-- 底部输入栏 -->
      <div class="gz-input-footer">
        <div class="input-wrapper">
          <input type="text" class="gz-text-input" id="gzTextInput" placeholder="请输入您要咨询的广州市政策法规或政务办事事项..." maxlength="200" />
          <button class="gz-submit-btn" id="gzSubmitBtn">发 送</button>
        </div>
        <div class="footer-authority-note">
          广州市人民政府门户网站 · 穗政通标准化政务专窗 ｜ 12345 便民热线协同
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

  // 页面加载 2.4 秒后优雅弹出迎宾卡片
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
    setTimeout(() => textInput.focus(), 260);
  }

  function closeDialog() {
    dialogWindow.classList.remove('open');
    setTimeout(() => {
      launcher.style.display = 'flex';
    }, 240);
  }

  // 清空对话
  btnReset.addEventListener('click', () => {
    const rows = chatMain.querySelectorAll('.chat-row');
    rows.forEach((row, idx) => {
      if (idx > 0) row.remove();
    });
  });

  // 快捷标签点击提问
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

    fetchAiAnswer(content)
      .then(res => {
        loadingElem.remove();
        renderAiAnswer(res);
      })
      .catch(err => {
        console.warn('[广州政务咨询] 远端接口未就绪，无缝启用离线仿真知识库引擎:', err);
        loadingElem.remove();
        const mockRes = getGuangzhouMockData(content);
        renderAiAnswer(mockRes);
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
      <div class="chat-author">广州市政务咨询专窗</div>
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

  function renderAiAnswer(data) {
    const div = document.createElement('div');
    div.className = 'chat-row ai';

    // 1. 法定政策依据卡
    let statuteHtml = '';
    if (data.policy) {
      statuteHtml = `
        <div class="doc-statute-card">
          <div class="doc-statute-title">
            <span>【法定政策依据】</span>
            <span>文号：${escapeText(data.policy.docNumber)}</span>
          </div>
          <div><strong>《${escapeText(data.policy.title)}》</strong></div>
          <div class="doc-statute-body">${escapeText(data.policy.clause)}</div>
        </div>
      `;
    }

    // 2. 六级十二项办事指南卡
    let affairHtml = '';
    if (data.affair) {
      const a = data.affair;
      let materialsHtml = '';
      if (a.materials && a.materials.length) {
        materialsHtml = a.materials.map((m, i) => `
          <label class="affair-check-row">
            <input type="checkbox" id="chk_mat_${i}">
            <span>${escapeText(m.name)} <strong style="color: ${m.mandatory ? '#c20505' : '#389e0d'}; font-size:11px;">[${m.mandatory ? '法定必备' : '电子证照免交'}]</strong></span>
          </label>
        `).join('');
      }

      affairHtml = `
        <div class="doc-affair-card">
          <div class="affair-head">
            <div>
              <div class="affair-title">【事项】${escapeText(a.name)}</div>
              <div class="affair-code">统一实施编码: ${escapeText(a.code)}</div>
            </div>
            <div class="affair-limit-tag">承诺时限: ${a.limitDays}个工作日</div>
          </div>
          <div class="affair-sec-title">【受理准入条件】</div>
          <div style="font-size: 12px; color: #333333; line-height: 1.5;">${escapeText(a.qualification)}</div>
          
          ${materialsHtml ? `
            <div class="affair-sec-title">【申办材料自检核验】</div>
            ${materialsHtml}
          ` : ''}

          <a href="${a.url || 'https://www.gz.gov.cn/'}" target="_blank" class="affair-direct-btn">
            前往广东政务服务网·广州专区立即申办
          </a>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="chat-author">广州市政务咨询专窗</div>
      <div class="chat-bubble">
        <div class="typing-target"></div>
        ${statuteHtml}
        ${affairHtml}
      </div>
      <div class="chat-feedback-bar">
        <span>信息承办：广州市政务服务和数据管理局</span>
        <button class="action-sub-btn" onclick="this.innerHTML='已采纳'; this.style.color='#389e0d';">采纳</button>
        <button class="action-sub-btn" onclick="this.innerHTML='已反馈'; this.style.color='#c20505';">有疑问</button>
      </div>
    `;

    chatMain.appendChild(div);
    scrollChatBottom();

    const targetElem = div.querySelector('.typing-target');
    runTypeWriter(targetElem, data.content, 0, 14);
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

  // 接口请求 (预留对接后端服务)
  async function fetchAiAnswer(prompt) {
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

  // 内置广州市人民政府官方高保真问答仿真知识库
  function getGuangzhouMockData(prompt) {
    const q = prompt.toLowerCase();

    // 1. 公共租赁住房
    if (q.includes('公租房') || q.includes('租房') || q.includes('租赁补贴')) {
      return {
        content: '根据《广州市公共租赁住房保障办法》，广州市城镇户籍中等偏下收入住房困难家庭及新就业无房职工，可依规定申请公共租赁住房或住房租赁补贴。申请实行“一窗受理、并联审核”，符合条件家庭每月最高可申领每平方米35元的租赁住房补贴。',
        policy: {
          docNumber: '穗府办规〔2024〕6号',
          title: '广州市人民政府办公厅关于印发广州市公共租赁住房保障办法的通知',
          clause: '第三条【保障对象】：本市城镇户籍中等偏下收入住房困难家庭，以及持有本市有效居住证、在穗连续稳定就业的新就业职工及外来务工人员。'
        },
        affair: {
          name: '广州市公共租赁住房保障资格申请核准',
          code: 'GZ-GZF-440100-01',
          limitDays: 5,
          qualification: '申请人及共同申请人具有本市城镇户籍，在穗连续缴纳社保满1年，且家庭人均年可支配收入低于上年度保障标准。',
          materials: [
            { name: '申请人及家庭成员居民身份证与户口簿', mandatory: true },
            { name: '家庭成员年可支配收入核查证明材料', mandatory: true },
            { name: '广州市不动产权属信息查询凭据 (共享数据免交)', mandatory: false }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 2. 积分入户
    if (q.includes('积分') || q.includes('入户') || q.includes('落户') || q.includes('户口')) {
      return {
        content: '广州市积分制入户依据《广州市积分制入户管理办法》规范实施。来穗人员申请积分制入户需持有在广州市办理的有效《广东省居住证》，在穗合法稳定就业或创业并累计缴纳社会保险满4年，且在“广州市来穗人员积分制服务管理信息系统”核定积分达到当年度规定分值。',
        policy: {
          docNumber: '穗府规〔2023〕1号',
          title: '广州市人民政府关于印发广州市积分制入户管理办法的通知',
          clause: '第五条【申报条件】：在广州市合法稳定就业或创业、年龄在45周岁以下、持有在穗办理的有效《广东省居住证》、缴纳本市社会保险累计满4年，信用记录良好。'
        },
        affair: {
          name: '来穗人员积分制入户申报与指标卡核发',
          code: 'GZ-JFRH-440100-02',
          limitDays: 7,
          qualification: '年龄45周岁以下，持有有效广州市居住证，连续缴纳广州社保满4年，无严重犯罪记录。',
          materials: [
            { name: '广东省居住证 (在穗办理且在有效期内)', mandatory: true },
            { name: '广州市社会保险参保证明 (累计满48个月)', mandatory: true },
            { name: '居民户口簿及居民身份证原件', mandatory: true },
            { name: '合法住所证明材料 (房屋产权证或租赁备案凭证)', mandatory: false }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 3. 企业开办
    if (q.includes('企业') || q.includes('开公司') || q.includes('营业执照') || q.includes('开办') || q.includes('营商')) {
      return {
        content: '广州市全面实施开办企业“一网通办、半天办结”。申请人登录“广州市开办企业一网通平台”，营业执照设立、公章刻制、发票申领、就业社保登记与公积金缴存开户全部联办并联审批，0.5个工作日内办结并免费赠送一套实体印章。',
        policy: {
          docNumber: '穗市监规〔2024〕2号',
          title: '广州市市场监督管理局关于深化企业开办“一网通办”改革的若干意见',
          clause: '第二条【一网通办】：新设企业通过一体化智能平台办理，全流程免跑动、零成本，0.5天领照并免费发放4枚防伪印章。'
        },
        affair: {
          name: '内资有限责任公司设立登记 (一网通办专区)',
          code: 'GZ-QYKB-440100-03',
          limitDays: 1,
          qualification: '股东符合法定人数，具备规范的公司章程，拥有真实合法的经营场所。',
          materials: [
            { name: '公司章程 (在线标准范本签署)', mandatory: true },
            { name: '法定代表人及全体股东身份核验 (人脸识别认证)', mandatory: true },
            { name: '住所 (经营场所) 使用信息申报承诺书', mandatory: true }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 4. 医保 / 社保
    if (q.includes('医保') || q.includes('社保') || q.includes('灵活就业') || q.includes('报销')) {
      return {
        content: '在广州市从业的灵活就业人员，无论具备本地户籍与否，均可在就业地参加广州市职工基本医疗保险。无雇工的个体工商户、未在用人单位参加职工医保的非全日制从业人员，可凭有效身份证件直接在“穗好办”或政务服务大厅办理参保登记。',
        policy: {
          docNumber: '穗医保规〔2023〕5号',
          title: '广州市医疗保障局 广州市财政局关于灵活就业人员参加本市职工基本医疗保险有关事项的通知',
          clause: '第一条【参保范围】：在法定劳动年龄内的灵活就业人员，可凭居民身份证或居住证在本市办理职工医保核定登记。'
        },
        affair: {
          name: '灵活就业人员职工基本医疗保险参保登记',
          code: 'GZ-YBLH-440100-04',
          limitDays: 1,
          qualification: '年满16周岁且未达到法定退休年龄，在广州从事灵活就业或新业态从业人员。',
          materials: [
            { name: '居民身份证原件 (刷脸授权电子证照免交)', mandatory: true },
            { name: '广东省居住证 (非本地户籍人员提供)', mandatory: false },
            { name: '本人一类银联储蓄卡 (用于按月代扣代缴)', mandatory: true }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 5. 中小客车摇号竞价
    if (q.includes('车牌') || q.includes('摇号') || q.includes('竞价') || q.includes('指标') || q.includes('买车')) {
      return {
        content: '根据《广州市中小客车总量调控管理办法》，符合条件的单位和个人申领中小客车增量指标（摇号或竞价），可通过“广州市中小客车指标调控管理信息系统”进行网上申请。本市户籍居民或持有有效居住证且近两年在穗连续缴纳医保满24个月的非本市户籍人员均可申请。',
        policy: {
          docNumber: '穗府办规〔2023〕15号',
          title: '广州市人民政府办公厅关于印发广州市中小客车总量调控管理办法的通知',
          clause: '第十六条【个人申请条件】：住所地在本市、持有有效机动车驾驶证、名下没有本市登记的中小客车。'
        },
        affair: {
          name: '广州市中小客车增量指标配置申请 (摇号/竞价)',
          code: 'GZ-JTZB-440100-05',
          limitDays: 3,
          qualification: '住所地在穗，名下无本市登记的中小客车，名下未持有有效增量指标，具备机动车驾驶证。',
          materials: [
            { name: '居民身份证与中华人民共和国机动车驾驶证', mandatory: true },
            { name: '广东省居住证及连续24个月医保参保证明 (非本市户籍)', mandatory: true }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 6. 往来港澳通行证
    if (q.includes('港澳') || q.includes('通行证') || q.includes('签注') || q.includes('出入境') || q.includes('香港') || q.includes('澳门')) {
      return {
        content: '广州市全面实施出入境证件“全国通办”。内地居民可在广州市任一公安出入境办证大厅申请往来港澳通行证及团队旅游签注，不受户籍地限制，无需提交户口簿或在穗居住证明，办结时限为7个工作日。',
        policy: {
          docNumber: '国移发〔2023〕18号',
          title: '国家移民管理局关于全面实施出入境证件“全国通办”的规定',
          clause: '第一条【全国通办】：内地居民可在全国任一公安机关出入境管理窗口申请办理往来港澳通行证及旅游签注。'
        },
        affair: {
          name: '内地居民往来港澳通行证及签注申领 (全国通办)',
          code: 'GZ-CRJ-440100-06',
          limitDays: 7,
          qualification: '中国内地居民，具备合法往来港澳事由，无出入境法定不准出境情形。',
          materials: [
            { name: '居民身份证原件 (现场核验)', mandatory: true },
            { name: '广东省出入境证件数字相片采集回执 (现场免费照相免交)', mandatory: true }
          ],
          url: 'https://www.gz.gov.cn/'
        }
      };
    }

    // 兜底政务问答
    return {
      content: `关于您咨询的问题：“${prompt}”，广州市政务服务平台已全面推行“一网通办、综合受理”。您可以登录“穗好办”APP或通过广州市人民政府门户网站政务公开与政务服务专栏，查询各区所属经办窗口具体办事指南及预约号源。`,
      policy: {
        docNumber: '穗府办规〔2024〕1号',
        title: '广州市进一步优化政务服务提升行政效能实施方案',
        clause: '第一条【综合受理】：大力推行“前台综合受理、后台分类审批、统一窗口出件”，为企业群众提供高效便捷政务服务。'
      }
    };
  }

  console.log('[广州政务咨询] 广州市人民政府门户网站专属政务智能专窗已注入运行。');
})();
