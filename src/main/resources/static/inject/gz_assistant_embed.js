/**
 * 广州市人民政府门户网站 (www.gz.gov.cn) 右下角政务问答小助手 · 穗政通
 * 视觉与交互规范：
 * 1. 深度适配广州市政府门户网站视觉体系：取消圆角（直角政务公文风格）、去除浮夸 AI 元素，融入政府严肃、权威、严谨的官网排版
 * 2. 经典政务色彩：岭南政务蓝 (#0050b3, #006ed5) + 顶栏政务红线 (#c20505) + 暖调公文黄 (#fdf6ec)
 * 3. 样式绝对隔离：基于 Shadow DOM，与 gz.gov.cn 现有 CSS 零冲突、零污染
 * 4. 拟生物理动效：右下角徽标微悬浮、呼吸光晕、平滑直角弹窗开合
 * 5. 双模通信：支持同学数据库/后端直连 + 离线政务仿真引擎
 */

(function () {
  'use strict';

  // 避免重复注入
  if (document.getElementById('gz-gov-ai-root')) {
    console.warn('[广州政务问答] 检测到已存在助手实例，跳过重复注入。');
    return;
  }

  // 全局配置（方便同学对接后端与数据库）
  window.GzGovAiConfig = Object.assign({
    apiEndpoint: 'http://localhost:8080/api/v1/gov/chat/stream', // 同学后端接口地址
    mockIfOffline: true, // 后端未启动或跨域时自动启动离线仿真知识库
    assistantName: '广州政务咨询助手',
    department: '广州市政务服务和数据管理局',
    themeColor: '#0050b3'
  }, window.GzGovAiConfig || {});

  // 挂载根节点与 Shadow DOM
  const host = document.createElement('div');
  host.id = 'gz-gov-ai-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // 注入全套直角化、严肃政府公文风格样式
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
    .gz-gov-wrapper {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999999;
      pointer-events: none;
    }

    /* 右下角圆形悬浮徽标 (保留圆形微标，内部采用严肃政务红蓝印章设计) */
    .gz-gov-launcher {
      pointer-events: auto;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(145deg, #0050b3 0%, #003a8c 100%);
      box-shadow: 0 8px 24px rgba(0, 58, 140, 0.38), 0 2px 8px rgba(0, 0, 0, 0.18);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      user-select: none;
      border: 2px solid #ffffff;
      transition: transform 0.24s ease, box-shadow 0.24s ease;
      animation: gzFloat 3.4s ease-in-out infinite;
    }

    .gz-gov-launcher:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 12px 30px rgba(0, 58, 140, 0.48), 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .gz-gov-launcher:active {
      transform: scale(0.95);
    }

    /* 呼吸外光晕 */
    .gz-gov-launcher::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 80, 179, 0.4) 0%, rgba(194, 5, 5, 0.2) 70%, transparent 100%);
      z-index: -1;
      animation: gzAura 2.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    }

    @keyframes gzFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }

    @keyframes gzAura {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.22); opacity: 0.1; }
      100% { transform: scale(1.28); opacity: 0; }
    }

    .launcher-emblem {
      font-size: 20px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
      letter-spacing: 0.5px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }

    .launcher-label {
      font-size: 10px;
      font-weight: 700;
      color: #ffd666;
      margin-top: 2px;
      transform: scale(0.92);
      letter-spacing: 0.5px;
    }

    /* 提示红点 */
    .gz-gov-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: #c20505;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 0px; /* 直角 */
      border: 1px solid #ffffff;
      box-shadow: 0 2px 5px rgba(194, 5, 5, 0.4);
    }

    /* 左侧迎宾气泡（取消圆角，改为直角政务公文通告条） */
    .gz-gov-speech-bubble {
      pointer-events: auto;
      position: absolute;
      right: 76px;
      bottom: 8px;
      width: 270px;
      background: #ffffff;
      border: 1px solid #0050b3;
      border-top: 3px solid #c20505; /* 广州市人民政府红顶线 */
      border-radius: 0px; /* 直角 */
      padding: 12px 14px;
      box-shadow: 0 8px 24px rgba(0, 30, 80, 0.16);
      display: flex;
      flex-direction: column;
      gap: 5px;
      cursor: pointer;
      opacity: 0;
      transform: translateX(12px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 999999;
    }

    .gz-gov-speech-bubble.show {
      opacity: 1;
      transform: translateX(0);
    }

    .gz-gov-speech-bubble::after {
      content: '';
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      border-width: 7px 0 7px 8px;
      border-style: solid;
      border-color: transparent transparent transparent #0050b3;
    }

    .gz-gov-speech-bubble:hover {
      box-shadow: 0 10px 28px rgba(0, 80, 179, 0.22);
    }

    .bubble-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 700;
      color: #003a8c;
      border-bottom: 1px solid #eef2f7;
      padding-bottom: 4px;
    }

    .bubble-close {
      color: #8c8c8c;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }
    .bubble-close:hover { color: #c20505; }

    .bubble-text {
      font-size: 12px;
      color: #333333;
      line-height: 1.55;
    }

    /* 问答对话主弹窗（全部直角、庄严政务蓝红配色） */
    .gz-gov-window {
      pointer-events: auto;
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 450px;
      height: 680px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 48px);
      background: #ffffff;
      border: 1px solid #003a8c;
      border-top: 4px solid #c20505; /* 广州政务红顶条 */
      border-radius: 0px !important; /* 严格直角，取消圆角 */
      box-shadow: 0 16px 45px rgba(0, 30, 80, 0.28);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: scale(0.85) translateY(40px);
      transform-origin: bottom right;
      transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 10000000;
      visibility: hidden;
    }

    .gz-gov-window.open {
      opacity: 1;
      transform: scale(1) translateY(0);
      visibility: visible;
    }

    /* 弹窗顶栏 (广州政务蓝) */
    .gz-gov-header {
      background: #0050b3;
      color: #ffffff;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #003a8c;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-crest {
      width: 28px;
      height: 28px;
      background: #c20505;
      border: 1px solid #ffd666;
      border-radius: 0px; /* 直角印章 */
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 900;
      color: #ffffff;
      flex-shrink: 0;
    }

    .header-info h4 {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-info p {
      font-size: 11px;
      color: #d6e4ff;
      margin-top: 2px;
      letter-spacing: 0.3px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-btn {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 0px; /* 直角按钮 */
      color: #ffffff;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.18s ease;
    }

    .header-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* 官方政务公告横幅 */
    .gz-gov-banner {
      background: #f0f7ff;
      border-bottom: 1px solid #d6e4ff;
      padding: 7px 14px;
      font-size: 11px;
      color: #003a8c;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* 热点问答导航栏（直角标签） */
    .gz-gov-quick-bar {
      padding: 8px 12px;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      white-space: nowrap;
      scrollbar-width: none;
    }
    .gz-gov-quick-bar::-webkit-scrollbar { display: none; }

    .quick-pill {
      font-size: 12px;
      background: #ffffff;
      color: #003a8c;
      border: 1px solid #b0cbe8;
      border-radius: 0px; /* 直角 */
      padding: 4px 9px;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .quick-pill:hover {
      background: #0050b3;
      color: #ffffff;
      border-color: #0050b3;
    }

    /* 消息流主体 */
    .gz-gov-chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f7f9fc;
    }

    .chat-msg {
      display: flex;
      flex-direction: column;
      max-width: 94%;
      animation: msgFadeIn 0.25s ease forwards;
    }

    @keyframes msgFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-msg.user {
      align-self: flex-end;
      align-items: flex-end;
    }

    .chat-msg.ai {
      align-self: flex-start;
      align-items: flex-start;
    }

    .msg-sender-name {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
      padding: 0 2px;
    }

    .msg-bubble {
      padding: 12px 14px;
      border-radius: 0px !important; /* 彻底直角 */
      font-size: 13px;
      line-height: 1.65;
      word-break: break-word;
    }

    .chat-msg.user .msg-bubble {
      background: #0050b3;
      color: #ffffff;
      border: 1px solid #003a8c;
    }

    .chat-msg.ai .msg-bubble {
      background: #ffffff;
      color: #1a1a1a;
      border: 1px solid #dcdfe6;
      border-left: 3px solid #0050b3;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    /* 红头公文法定政策依据卡（直角公文红框） */
    .policy-cite-card {
      background: #fdf6ec;
      border: 1px solid #faecd8;
      border-left: 4px solid #c20505;
      border-radius: 0px !important;
      padding: 9px 12px;
      margin-top: 10px;
      font-size: 12px;
      color: #4a4a4a;
    }

    .policy-cite-title {
      font-weight: 700;
      color: #c20505;
      margin-bottom: 4px;
    }

    /* 六级十二项标准办事指南卡（严肃政务表格结构） */
    .affair-guide-card {
      background: #ffffff;
      border: 1px solid #b0cbe8;
      border-radius: 0px !important;
      padding: 12px;
      margin-top: 12px;
    }

    .guide-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 6px;
      border-bottom: 1px solid #e8e8e8;
      margin-bottom: 8px;
    }

    .guide-name {
      font-size: 13px;
      font-weight: 700;
      color: #003a8c;
    }

    .guide-limit {
      font-size: 11px;
      background: #f6ffed;
      color: #389e0d;
      border: 1px solid #b7eb8f;
      padding: 1px 6px;
      border-radius: 0px;
      font-weight: 600;
    }

    .guide-section-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin: 8px 0 4px 0;
    }

    .checklist-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #333333;
      padding: 3px 0;
    }

    .checklist-item input[type="checkbox"] {
      accent-color: #0050b3;
      cursor: pointer;
    }

    .guide-action-btn {
      margin-top: 10px;
      display: block;
      width: 100%;
      text-align: center;
      background: #0050b3;
      color: #ffffff;
      text-decoration: none;
      padding: 8px 0;
      border-radius: 0px; /* 直角 */
      font-size: 12px;
      font-weight: 600;
      transition: background 0.18s ease;
    }
    .guide-action-btn:hover { background: #003a8c; }

    /* 评价区 */
    .msg-feedback {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: #8c8c8c;
      margin-top: 6px;
    }

    .feedback-btn {
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      border-radius: 0px;
      color: #595959;
      cursor: pointer;
      padding: 2px 7px;
      font-size: 11px;
    }
    .feedback-btn:hover { color: #0050b3; border-color: #0050b3; }

    /* 打字等待状态 */
    .typing-indicator {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: #ffffff;
      border: 1px solid #dcdfe6;
      border-radius: 0px;
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      background: #0050b3;
      border-radius: 0px;
      animation: typingPulse 1.2s infinite ease-in-out;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.1); opacity: 1; }
    }

    /* 底部输入框（直角政务框） */
    .gz-gov-footer {
      background: #ffffff;
      border-top: 1px solid #e8e8e8;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gz-gov-input {
      flex: 1;
      height: 38px;
      border: 1px solid #b0cbe8;
      border-radius: 0px !important; /* 直角输入框 */
      padding: 0 12px;
      font-size: 13px;
      color: #1a1a1a;
      outline: none;
      background: #ffffff;
    }

    .gz-gov-input:focus {
      border-color: #0050b3;
      box-shadow: 0 0 0 2px rgba(0, 80, 179, 0.12);
    }

    .gz-gov-send-btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 0px !important; /* 直角按钮 */
      border: none;
      background: #0050b3;
      color: #ffffff;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: background 0.18s ease;
    }

    .gz-gov-send-btn:hover {
      background: #003a8c;
    }

    .gz-gov-send-btn:disabled {
      background: #bfbfbf;
      cursor: not-allowed;
    }

    .footer-watermark {
      font-size: 10px;
      color: #8c8c8c;
      text-align: center;
      letter-spacing: 0.2px;
    }
  `;
  shadow.appendChild(style);

  // 构造 DOM 骨架
  const container = document.createElement('div');
  container.className = 'gz-gov-wrapper';
  container.innerHTML = `
    <!-- 右下角悬浮圆形徽标 (庄重政务蓝金风格) -->
    <div class="gz-gov-launcher" id="gzLauncher" title="点击呼出广州市人民政府政务咨询助手">
      <div class="gz-gov-badge">咨询</div>
      <div class="launcher-emblem">穗</div>
      <div class="launcher-label">政务问答</div>
    </div>

    <!-- 左侧迎宾公文通告条 (直角、政府红顶条) -->
    <div class="gz-gov-speech-bubble" id="gzSpeechBubble">
      <div class="bubble-header">
        <span>广州市人民政府 · 政务咨询服务</span>
        <span class="bubble-close" id="gzBubbleClose">&times;</span>
      </div>
      <div class="bubble-text">
        您好！关于<strong>公租房申请、积分入户、企业开办、医保社保</strong>等事项，欢迎点击此处向我咨询。
      </div>
    </div>

    <!-- 问答主弹窗 (直角政务公文大厅) -->
    <div class="gz-gov-window" id="gzWindow">
      <!-- 顶栏 -->
      <div class="gz-gov-header">
        <div class="header-left">
          <div class="header-crest">穗</div>
          <div class="header-info">
            <h4>广州市人民政府门户网站 · 政务咨询</h4>
            <p>广州市政务服务和数据管理局主办 ｜ 12345热线协同</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-btn" id="gzBtnClear" title="清空对话记录">清屏</button>
          <button class="header-btn" id="gzBtnMinimize" title="最小化到右下角">最小化</button>
          <button class="header-btn" id="gzBtnClose" title="关闭窗口">关闭</button>
        </div>
      </div>

      <!-- 官方公告条 -->
      <div class="gz-gov-banner">
        <span>📌</span>
        <span>全面落实“高效办成一件事”标准，支持法定政策依据精准溯源与申报材料自检</span>
      </div>

      <!-- 常见业务直角标签 -->
      <div class="gz-gov-quick-bar">
        <span class="quick-pill" data-query="在广州如何申请公共租赁住房（公租房）？">公租房保障申请</span>
        <span class="quick-pill" data-query="广州积分制入户申报条件与办理流程是什么？">积分制入户申报</span>
        <span class="quick-pill" data-query="广州市企业开办‘一网通办’如何0.5天快速领照？">企业开办一网通办</span>
        <span class="quick-pill" data-query="外地户籍在广州如何参加灵活就业职工医保？">灵活就业职工医保</span>
        <span class="quick-pill" data-query="在广州怎么办理往来港澳通行证期满换证？">港澳通行证换证</span>
      </div>

      <!-- 消息列表 -->
      <div class="gz-gov-chat-body" id="gzChatBody">
        <div class="chat-msg ai">
          <div class="msg-sender-name">广州市政务咨询专窗</div>
          <div class="msg-bubble">
            您好，欢迎使用<strong>广州市人民政府门户网站</strong>政务咨询问答服务。<br><br>
            本专窗汇集广州市各委办局现行有效的政策规章及“六级十二项”标准办事指南。您可以通过文字咨询办理条件、所需材料及网上申办流程，例如：
            <ul style="margin: 6px 0 0 18px; line-height: 1.6; color: #475569;">
              <li><em>“新就业无房职工在广州申请公租房租赁补贴的条件是什么？”</em></li>
              <li><em>“非广州户籍居民如何在广州办理身份证期满换领？”</em></li>
            </ul>
          </div>
          <div class="msg-feedback">
            <span>官方权威信息保障</span>
          </div>
        </div>
      </div>

      <!-- 底部输入栏 -->
      <div class="gz-gov-footer">
        <div class="input-row">
          <input type="text" class="gz-gov-input" id="gzInput" placeholder="请输入您要咨询的政策法规或政务服务事项..." maxlength="200" />
          <button class="gz-gov-send-btn" id="gzSendBtn">发 送</button>
        </div>
        <div class="footer-watermark">
          广州市人民政府门户网站 · 穗政通标准化政务问答专窗
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

  // 页面加载 2.5 秒后自动向左呼出通告气泡
  let bubbleTimer = setTimeout(() => {
    speechBubble.classList.add('show');
  }, 2500);

  speechBubble.addEventListener('click', (e) => {
    if (e.target.id === 'gzBubbleClose') return;
    openWindow();
  });

  bubbleClose.addEventListener('click', (e) => {
    e.stopPropagation();
    speechBubble.classList.remove('show');
  });

  launcher.addEventListener('click', openWindow);
  btnMinimize.addEventListener('click', closeWindow);
  btnClose.addEventListener('click', closeWindow);

  function openWindow() {
    clearTimeout(bubbleTimer);
    speechBubble.classList.remove('show');
    launcher.style.display = 'none';
    win.classList.add('open');
    setTimeout(() => input.focus(), 250);
  }

  function closeWindow() {
    win.classList.remove('open');
    setTimeout(() => {
      launcher.style.display = 'flex';
    }, 240);
  }

  // 清屏
  btnClear.addEventListener('click', () => {
    const msgs = chatBody.querySelectorAll('.chat-msg');
    msgs.forEach((m, idx) => {
      if (idx > 0) m.remove();
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

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;

    appendUserMsg(text);
    input.value = '';
    sendBtn.disabled = true;

    const loadingElem = appendLoadingMsg();

    callAiApi(text)
      .then(res => {
        loadingElem.remove();
        renderAiResponse(res);
      })
      .catch(err => {
        console.warn('[广州政务问答] 接口调用异常，自动启动离线仿真知识库引擎:', err);
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
      <div class="msg-sender-name">咨询市民</div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    `;
    chatBody.appendChild(div);
    scrollToBottom();
  }

  function appendLoadingMsg() {
    const div = document.createElement('div');
    div.className = 'chat-msg ai loading';
    div.innerHTML = `
      <div class="msg-sender-name">广州市政务咨询专窗</div>
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    chatBody.appendChild(div);
    scrollToBottom();
    return div;
  }

  function renderAiResponse(data) {
    const div = document.createElement('div');
    div.className = 'chat-msg ai';

    let policyHtml = '';
    if (data.policy) {
      policyHtml = `
        <div class="policy-cite-card">
          <div class="policy-cite-title">【法定政策公文依据】发文字号：${escapeHtml(data.policy.docNumber)}</div>
          <div><strong>《${escapeHtml(data.policy.title)}》</strong></div>
          <div style="margin-top: 4px; color: #555555; line-height: 1.5;">${escapeHtml(data.policy.clause)}</div>
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
            <span>${escapeHtml(m.name)} <strong style="color: ${m.mandatory ? '#c20505' : '#389e0d'}; font-size:11px;">[${m.mandatory ? '法定必备' : '电子证照免交/容缺'}]</strong></span>
          </label>
        `).join('');
      }

      affairHtml = `
        <div class="affair-guide-card">
          <div class="guide-card-header">
            <div>
              <div class="guide-name">【事项名称】${escapeHtml(a.name)}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">统一实施编码: ${escapeHtml(a.code)}</div>
            </div>
            <div class="guide-limit">承诺办结时限: ${a.limitDays}工作日</div>
          </div>
          <div class="guide-section-title">【申请准入条件】</div>
          <div style="font-size: 12px; color: #333333; line-height: 1.5;">${escapeHtml(a.qualification)}</div>
          
          ${matHtml ? `
            <div class="guide-section-title">【办事材料自检核验】</div>
            ${matHtml}
          ` : ''}

          <a href="${a.url || 'https://www.gz.gov.cn/'}" target="_blank" class="guide-action-btn">
            前往广东政务服务网·广州专区立即申办
          </a>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="msg-sender-name">广州市政务咨询专窗</div>
      <div class="msg-bubble">
        <div class="typing-text"></div>
        ${policyHtml}
        ${affairHtml}
      </div>
      <div class="msg-feedback">
        <span>信息承办：广州市政务服务和数据管理局</span>
        <button class="feedback-btn" onclick="this.innerHTML='已采纳'; this.style.color='#389e0d';">采纳</button>
        <button class="feedback-btn" onclick="this.innerHTML='已反馈'; this.style.color='#c20505';">有疑问</button>
      </div>
    `;

    chatBody.appendChild(div);
    scrollToBottom();

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

  async function callAiApi(prompt) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

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

  function generateGuangzhouMockResponse(prompt) {
    const p = prompt.toLowerCase();

    // 1. 公租房
    if (p.includes('公租房') || p.includes('租房') || p.includes('租赁补贴')) {
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
        content: '广州市积分制入户依据《广州市积分制入户管理办法》开展。申请人需持有在广州市办理的有效《广东省居住证》，在广州市合法稳定就业或创业并缴纳社会保险累计满4年，且总积分达到当年度规定基准值。',
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
        content: '广州市全面实施企业开办“一网通办、半天办结”。申请人登录“广州市开办企业一网通”平台，设立登记、公章刻制、发票申领、社保用工登记及公积金开户全部并联办理，0.5个工作日办结并免费刻制发放实体印章一套。',
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
        content: '在广州市从业的灵活就业人员，无论具备本地户籍与否，均可在就业地参加城镇从业人员基本医疗保险及企业职工基本养老保险。参保人凭居民身份证即可办理参保核定，按月缴纳基本养老与医疗保险费。',
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

    // 5. 港澳通行证
    if (p.includes('港澳') || p.includes('通行证') || p.includes('出入境') || p.includes('签注') || p.includes('护照')) {
      return {
        content: '广州市全面实施出入境证件“全国通办”。内地居民可在广州市任一公安出入境服务大厅申请往来港澳通行证及团队旅游签注，不受户籍地限制，无需提交户籍或居住证明，办结时限为7个工作日。',
        policy: {
          docNumber: '国移发〔2023〕18号',
          title: '国家移民管理局关于全面实施出入境证件“全国通办”的规定',
          clause: '第一条【全国通办】：内地居民可在全国任一公安机关出入境窗口申办往来港澳通行证及旅游签注，申办手续与户籍地一致。'
        },
        affair: {
          name: '内地居民往来港澳通行证及签注申领 (全国通办)',
          code: 'GZ-CRJ-440100-05',
          limitDays: 7,
          qualification: '中国内地公民，具有合法往来港澳事由，无不予出境的法定情形。',
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
      content: `关于您咨询的问题：“${prompt}”，广州市政务服务平台已全面推行“一网通办、综合受理”。您可以登录“穗好办”APP或通过广州市人民政府门户网站政务公开与政务服务专栏，查询各区所属经办窗口具体办事指南及预约号源。`,
      policy: {
        docNumber: '穗府办规〔2024〕1号',
        title: '广州市进一步优化政务服务提升行政效能实施方案',
        clause: '第一条【综合受理】：大力推行“前台综合受理、后台分类审批、统一窗口出件”，为企业群众提供高效便捷政务服务。'
      }
    };
  }

  console.log('[广州政务问答] 广州市人民政府门户网站政务咨询助手已注入运行（直角政务公文版）。');
})();
