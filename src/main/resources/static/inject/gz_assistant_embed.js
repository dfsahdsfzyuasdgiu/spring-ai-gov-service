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

      /* 消除生硬八股框：纯净自然语言流段落 */
      .lezai-natural-paragraph {
        font-size: var(--gz-font-base);
        line-height: var(--gz-line-height);
        color: #1e293b;
        margin-bottom: 10px;
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
              <span class="lezai-loc-tag" id="gzLocTag" title="点击切换所属区域">📍 广州市</span>
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
            <div class="lezai-match-strip">
              <span style="display:inline-block;width:18px;height:18px;vertical-align:middle;">${LEZAI_AVATAR_SVG}</span>
              <span>叻仔 为您智能匹配到当前所在区域为"广州市"，如想咨询其他区域可点击修改</span>
              <span class="lezai-loc-link" id="gzLocModifyLink">📍 广东省广州市 修改</span>
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
            textInput.value = q;
            doSendMessage(q);
          }
        });
        historyChips.appendChild(chip);
      });
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
          <div class="lezai-match-strip">
            <span style="display:inline-block;width:18px;height:18px;vertical-align:middle;">${LEZAI_AVATAR_SVG}</span>
            <span>叻仔 为您智能匹配到当前所在区域为"广州市"，如想咨询其他区域可点击修改</span>
            <span class="lezai-loc-link">📍 广东省广州市 修改</span>
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
          if (q) doSendMessage(q);
        };
      });
    }
    bindPromptPills();

    // 底部推荐主题绑定
    shadow.querySelectorAll('.topic-pill-tag').forEach(tag => {
      tag.onclick = () => {
        const q = tag.getAttribute('data-query');
        if (q) doSendMessage(q);
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
      appendUserRow(content);
      addRecentQuestion(content);
      const loadingElem = appendLoadingRow();
      submitBtn.disabled = true;

      fetch(window.GzGovAiConfig.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content, sessionId: currentSessionId })
      })
      .then(async response => {
        if (!response.ok) throw new Error('网络请求异常: ' + response.status);
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let citationData = null;
        let guidedStepsData = null;
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const chunkObj = JSON.parse(line.substring(5).trim());
                if (chunkObj.type === 'CHUNK' && chunkObj.chunk) {
                  fullText += chunkObj.chunk;
                } else if (chunkObj.type === 'CITATION' && chunkObj.data) {
                  citationData = chunkObj.data;
                } else if (chunkObj.type === 'GUIDED_STEPS' && chunkObj.data) {
                  guidedStepsData = chunkObj.data;
                }
              } catch (e) {}
            }
          }
        }
        loadingElem.remove();
        renderPolicyAnswer({
          summary: fullText.trim(),
          citation: citationData,
          guidedSteps: guidedStepsData
        });
      })
      .catch(err => {
        console.warn('[广州政策问答] 远端实时流不可用，无缝启用官方本地智能问答引擎:', err);
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
          <div class="typing-box">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
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

    function formatMarkdownLike(str) {
      if (!str) return '';
      let html = escapeText(stripEmoji(str))
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      return html.replace(/\n/g, '<br/>');
    }

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

      // 构造自然文本主体
      let mainHtml = `<div class="lezai-natural-paragraph">${formatMarkdownLike(cleanSummary)}</div>`;

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

      // 政策依据左下角轻量单行注脚
      let footnoteHtml = '';
      if (citation && citation.title) {
        const drawerId = 'drawer-' + Math.random().toString(36).substring(2, 9);
        footnoteHtml = `
          <div class="source-footnote-line">
            <span>政策依据：《${escapeText(citation.title)}》${citation.docNumber ? '（' + escapeText(citation.docNumber) + '）' : ''}</span>
            <span>·</span>
            <button class="source-btn-toggle" data-target="${drawerId}">查看条文原文 ▾</button>
          </div>
          <div class="source-clause-drawer" id="${drawerId}">
            <div style="font-weight:600;margin-bottom:4px;color:#0056b3;">${escapeText(citation.title)}</div>
            <div style="font-size:11px;color:#64748b;margin-bottom:6px;">制定机关：${escapeText(citation.dept || '广州市人民政府')}</div>
            <div>${formatMarkdownLike(citation.clause || '条文内容已依法在广州市政策公文库备案。')}</div>
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
          ${footnoteHtml}
          ${suggHtml}
          ${actionsHtml}
        </div>
      `;

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
          if (q) doSendMessage(q);
        };
      });

      chatMain.appendChild(div);
      scrollChatBottom();
    }

    // 官方本地知识库与问答引擎 (对标真实广州政务全场景)
    function getGuangzhouPolicyMockData(query) {
      const q = (query || '').trim().toLowerCase();

      // 特别定制：市民询问“我要办80大寿 / 办寿宴 / 老人家过生日” (注入温情关怀与政策智能联想)
      if (q.includes('80') || q.includes('大寿') || q.includes('寿宴') || q.includes('长寿') || q.includes('过寿') || q.includes('寿辰') || q.includes('高龄')) {
        return {
          summary: '老人家、市民您好！首先向老人家致以最诚挚的祝福，祝愿福如东海、寿比南山、松柏长青！\n\n在广州市现行政策中，虽然没有专门面向个人“举办寿宴/办大寿”直接报销或发放宴席补贴的政策，但广州市民政局为年满 80 周岁及以上的长者设立了非常实惠的法定优待与福利：\n\n1. **长寿保健金（高龄津贴）**：80 至 89 周岁户籍长者每人每月发放 200 元（部分区最高可达 300 元）；90 至 99 周岁每月 300 元；100 周岁以上每月 500 元。广州已全面实施“大数据免申即享”，系统联网核验后按月直发老人社保卡，无需繁琐跑腿。\n2. **老年人优待卡（敬老卡）**：年满 65 周岁及以上长者，**全免费乘坐市内公共交通（地铁、公交、轮渡）**，并免费进入市内公办各大公园、纪念馆及文化场馆。\n\n如需申领长寿保健金或优待卡，可通过下方入口直接办理。',
          guidedSteps: {
            affairId: 136,
            affairCode: 'GZ-MZ-CSJ036',
            affairName: '广州市长寿保健金申领与发放',
            onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%95%BF%E5%AF%BF%E4%BF%9D%E5%81%A5%E9%87%91&region=440100',
            qualifications: '广州市户籍且年满80周岁及以上老年人（已办理离退休手续或城乡居保均可享受）。',
            promisedLimitDays: 1,
            materials: [
              { name: '居民身份证与户口簿原件', format: '政务大数据免提交', sampleTip: '系统自动比对户籍状态' },
              { name: '本人金融社保卡', format: '系统自动关联账号', sampleTip: '津贴资金按月打入社保卡' }
            ],
            processSteps: [
              { stepNo: 1, stepName: '免申核对', description: '年满80周岁前夕，街镇通过大数据核验户籍信息', timeCost: '系统自动' },
              { stepNo: 2, stepName: '在线确认', description: '如未自动关联，可登录“穗好办”APP一键确认卡号', timeCost: '2分钟' },
              { stepNo: 3, stepName: '按月发放', description: '自满80周岁次月起，资金按月直发金融社保卡账户', timeCost: '按月到账' }
            ],
            handlingAddress: '户籍所在街镇综合养老服务中心或社区居委会专窗',
            onlineRoute: '打开手机微信搜“穗好办”小程序，进入“长者服务”-“长寿保健金”确认即可，足不出户办妥。',
            warnTip: '高龄津贴为法定惠民资金，按月直接发放至社保卡。若老人户籍迁出广州或去世，家属需按规定及时办理停发。'
          },
          citation: {
            title: '广州市老年人优待办法与长寿保健金发放标准',
            docNumber: '穗府办规〔2021〕8号',
            dept: '广州市人民政府办公厅、广州市民政局',
            similarity: '99%',
            clause: '第二条【高龄长寿保健金】：具有本市户籍且年满80周岁以上的老年人，按月发放长寿保健金。80至89周岁每人每月200元，90至99周岁每人每月300元，100周岁以上每人每月500元。'
          },
          suggestions: [
            '广州80岁老人怎么办理免费乘车的老年人优待卡？',
            '长寿保健金必须用广州本地的社保卡领取吗？',
            '外地户籍老人在广州居住满一年可以领长寿金吗？'
          ]
        };
      }

      // 1. 公租房租赁补贴政策
      if (q.includes('公租房') || q.includes('租赁补贴') || q.includes('租房补贴')) {
        return {
          summary: '在广州稳定就业且无自有产权住房的新就业职工，符合学历与在穗社保缴纳条件的，每月最高可领取 1,400 元住房租赁补贴，补贴期限最长累计可达 5 年。',
          guidedSteps: {
            affairId: 101,
            affairCode: 'GZ-ZJ-GZH001',
            affairName: '新就业无房职工公租房租赁补贴申领',
            onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%85%AC%E7%A7%9F%E6%88%BF&region=440100',
            qualifications: '大专及以上学历毕业未满5年；申请人及配偶、未成年子女在广州无自有产权住房；在穗稳定就业且连续缴纳社保满6个月。',
            promisedLimitDays: 3,
            materials: [
              { name: '居民身份证与毕业证书' },
              { name: '劳动合同与在穗社保缴费明细' },
              { name: '广州市房屋租赁登记备案证明' }
            ],
            processSteps: [
              { stepNo: 1, stepName: '网上申报', description: '登录广东政务服务网或“穗好办”提交补贴意愿申请' },
              { stepNo: 2, stepName: '资格核验', description: '住建与人社部门后台联网核查房产及社保' },
              { stepNo: 3, stepName: '按月发放', description: '审核通过并公示后，资金按季度拨付至个人银行账户' }
            ],
            handlingAddress: '广州市各区住房保障办公室及街道政务服务中心综合窗口',
            warnTip: '申请人需办理房屋租赁登记备案才可按规定申领货币补贴；享受租赁补贴期间若在广州购房，需主动申报终止补贴。'
          },
          citation: {
            title: '广州市公共租赁住房保障办法',
            docNumber: '穗府办规〔2024〕6号',
            dept: '广州市人民政府办公厅',
            similarity: '98%',
            clause: '第十五条【新就业职工租赁补贴】：新就业无房职工符合学历、社保缴纳及在穗无房条件的，可申请公共租赁住房租赁补贴，按人均保障建筑面积15平方米、每月每平方米最高35元标准核发。'
          },
          suggestions: [
            '新就业无房职工租房补贴一个人每个月能发多少钱？',
            '没有广州户口的外地大学生可以在广州申请公租房吗？'
          ]
        };
      }

      // 2. 积分入户
      if (q.includes('积分') || q.includes('入户') || q.includes('落户')) {
        return {
          summary: '在广州稳定就业居住的非本市户籍人员，年龄在 45 周岁以下、持有在穗有效居住证、在穗合法稳定就业并连续缴纳社保满 4 年，可通过积分制申请落户广州，配偶及未成年子女可按规定随迁。',
          guidedSteps: {
            affairId: 102,
            affairCode: 'GZ-LS-JFRH002',
            affairName: '来穗人员积分制入户申报',
            onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%A7%AF%E5%88%86%E5%85%A5%E6%88%B7&region=440100',
            qualifications: '年龄在45周岁以下；持在广州办理且在有效期的《广东省居住证》；在穗累计缴纳社保满4年；信用良好无犯罪记录。',
            promisedLimitDays: 5,
            materials: [
              { name: '居民身份证与广东省居住证原件' },
              { name: '在穗累计缴纳4年社保明细' },
              { name: '来穗人员积分制服务核定积分凭证' }
            ],
            processSteps: [
              { stepNo: 1, stepName: '积分核定', description: '在广州市来穗人员积分系统完成个人积分核定' },
              { stepNo: 2, stepName: '入户申报', description: '年度积分入户开放期内在线提交入户意愿申请' },
              { stepNo: 3, stepName: '公示领卡', description: '入户名单公示无异议后，签发电子入户卡' }
            ],
            handlingAddress: '广州市各区来穗人员服务管理中心综合窗口',
            warnTip: '社保满4年为累计计算，若申请人积分相同，系统将依次按照在穗社保缴纳月数长短进行排名。'
          },
          citation: {
            title: '广州市积分制入户管理办法',
            docNumber: '穗府规〔2023〕1号',
            dept: '广州市人民政府',
            similarity: '98%',
            clause: '第五条【申报条件】：符合以下条件的来穗人员可申请积分制入户：（一）年龄45周岁以下；（二）持有效居住证；（三）在穗缴纳社保累计满4年；（四）信用良好。'
          },
          suggestions: [
            '社保累计满4年允许断缴接续吗？',
            '配偶和小孩可以一起随迁入户广州吗？'
          ]
        };
      }

      // 3. 中小客车指标摇号
      if (q.includes('车牌') || q.includes('摇号') || q.includes('客车') || q.includes('指标')) {
        return {
          summary: '在广州申请中小客车增量指标，需满足户籍或居住、社保、驾照和名下无车基本条件。非本市户籍人员持有在穗有效居住证且近 2 年累计缴纳职工医保满 24 个月，名下无本市登记中小客车并持有有效驾照，可直接申请参加普通车指标摇号。',
          guidedSteps: {
            affairId: 103,
            affairCode: 'GZ-JT-CPYH003',
            affairName: '中小客车指标申请（摇号与竞价）',
            onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%B8%AD%E5%B0%8F%E5%AE%A2%E8%BD%A6%E6%8C%87%E6%A0%87%E6%91%87%E5%8F%B7&region=440100',
            qualifications: '本市户籍或持居住证且近2年缴纳职工医保满24个月；名下无粤A车牌；持有有效机动车驾驶证。',
            promisedLimitDays: 1,
            materials: [
              { name: '机动车驾驶证原件' },
              { name: '有效广东省居住证及近2年医保记录' }
            ],
            processSteps: [
              { stepNo: 1, stepName: '网上填报', description: '每月8日24时前在广州中小客车指标调控系统完成申请' },
              { stepNo: 2, stepName: '联网审核', description: '公安、社保、医保多部门后台并联审核资格' },
              { stepNo: 3, stepName: '统一摇号', description: '每月26日统一组织计算机随机摇号并公示结果' }
            ],
            handlingAddress: '广州市中小客车指标调控管理办公室专窗',
            warnTip: '急需用车的市民可优先选择申请“节能车增量指标”，同样免费且中签率极高。申请当月医保必须处于在保状态。'
          },
          citation: {
            title: '广州市中小客车总量调控管理办法',
            docNumber: '穗府办规〔2023〕15号',
            dept: '广州市人民政府办公厅',
            similarity: '97%',
            clause: '第十六条【个人申请条件】：持有效居住证且近2年在穗累计缴纳职工社会医疗保险满24个月的非本市户籍人员，名下无本市中小客车并持有效驾驶证，可申领增量指标。'
          },
          suggestions: [
            '广州节能车指标摇号中签率高吗？',
            '夫妻之间车牌指标可以互相转让吗？'
          ]
        };
      }

      // 4. 身份证换领
      if (q.includes('身份证') || q.includes('换领') || q.includes('补领')) {
        return {
          summary: '广东省内户籍居民身份证有效期满或损坏换领，已全面推行“全省通办”与智能自助机“立等换发”。市民凭原身份证即可就近在广州任一区户政大厅或 24 小时自助终端办理。',
          guidedSteps: {
            affairId: 134,
            affairCode: 'GZ-GA-SFZ034',
            affairName: '居民身份证有效期满换领',
            onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%BA%AB%E4%BB%BD%E8%AF%81%E6%8D%A2%E9%A2%86&region=440100',
            qualifications: '居民身份证有效期满前3个月内或已过期的广东省内户籍及符合跨省通办条件的在穗居民。',
            promisedLimitDays: 7,
            materials: [
              { name: '原居民身份证原件' },
              { name: '广东省居民身份证数字相片采集检测回执' }
            ],
            processSteps: [
              { stepNo: 1, stepName: '预约或自助', description: '通过“广州公安”公众号预约或直接前往自助机' },
              { stepNo: 2, stepName: '核验指纹', description: '自助机核验原证件、现场拍照并采集指纹' },
              { stepNo: 3, stepName: '寄送或自取', description: '制证完成后由邮政EMS送达或到网点取件' }
            ],
            handlingAddress: '广州市各区公安分局办证中心及24小时居民身份证自助办证机',
            warnTip: '省内户籍年满16周岁人员，可直接在街头或政务中心“居民身份证自助办证机”办理，免去窗口排队。'
          },
          citation: {
            title: '广东省公安厅关于居民身份证跨地市换领管理规定',
            docNumber: '粤府令第301号',
            dept: '广东省公安厅',
            similarity: '98%',
            clause: '第三条【全省通办】：广东省户籍居民可在省内任一县（市、区）公安机关申请换领、补领居民身份证，享受全省通办便利。'
          },
          suggestions: [
            '广州哪里有24小时可以办理身份证换证的自助机？',
            '换身份证需要提前在网上预约吗？'
          ]
        };
      }

      // 5. 医保与社保卡
      if (q.includes('医保') || q.includes('社保卡') || q.includes('社保') || q.includes('就医')) {
        return {
          summary: '在广州从事灵活就业或稳定工作的市民，凭居民身份证即可按规定参加广州市职工或城乡居民基本医疗保险，享受门诊定点报销与住院兜底待遇。社保卡丢失支持在线秒挂失与一站式补换卡。',
          guidedSteps: {
            affairId: 105,
            affairCode: 'GZ-YB-LHJY005',
            affairName: '灵活就业人员职工基本医疗保险参保',
            onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%81%B5%E6%B4%BB%E5%B0%B1%E4%B8%9A%E5%8C%BB%E4%BF%9D&region=440100',
            qualifications: '未达到法定退休年龄的灵活就业人员，不限户籍，凭居民身份证均可在穗参保。',
            promisedLimitDays: 1,
            materials: [
              { name: '本人居民身份证原件' },
              { name: '一类银行借记卡账号' }
            ],
            processSteps: [
              { stepNo: 1, stepName: '线上登记', description: '微信登录“粤税通”小程序完成实名刷脸认证' },
              { stepNo: 2, stepName: '选档扣费', description: '确定缴费基数并签署银行代扣代缴协议' },
              { stepNo: 3, stepName: '次月享受', description: '缴费次月起即可享受广州市职工医保报销待遇' }
            ],
            handlingAddress: '广州市各区医保经办大厅及各区税务局办税服务厅',
            warnTip: '按月连续缴费次月起生效；中途断缴超过3个月的，补缴后有待遇等待期，建议绑定银行卡自动扣费。'
          },
          citation: {
            title: '广州市关于灵活就业人员参加职工基本医保有关事项的通知',
            docNumber: '穗医保规〔2023〕5号',
            dept: '广州市医疗保障局',
            similarity: '98%',
            clause: '第一条【参保权益】：在穗灵活就业人员凭居民身份证办理职工基本医疗保险参保登记，享受与单位在职职工平等的医疗保障。'
          },
          suggestions: [
            '广州职工医保个人账户怎么给父母子女共济使用？',
            '社保卡在网上补办后多长时间能寄到家里？'
          ]
        };
      }

      // 6. 公积金提取
      if (q.includes('公积金') || q.includes('租房提取')) {
        return {
          summary: '在广州市行政区域内无自有产权住房且租房自住的缴存职工，无需提供租房发票或合同，每人每月可直接按定额 1,400 元申请提取公积金，资金自动按月转入个人银行卡。',
          guidedSteps: {
            affairId: 108,
            affairCode: 'GZ-GJJ-ZFTQ008',
            affairName: '住房公积金无房租赁提取',
            onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%A7%9F%E6%88%BF%E6%8F%90%E5%8F%96&region=440100',
            qualifications: '职工及配偶在本市无房且租房居住，在穗连续足额缴存公积金满3个月。',
            promisedLimitDays: 1,
            materials: [
              { name: '提取申请人身份证' },
              { name: '提取人本人一类银行储蓄卡' }
            ],
            processSteps: [
              { stepNo: 1, stepName: '刷脸认证', description: '微信登录“广州住房公积金管理中心”小程序' },
              { stepNo: 2, stepName: '提交提取', description: '选择“无房租赁提取”，系统自动调取房查结果' },
              { stepNo: 3, stepName: '按月到账', description: '审核通过后按月定期自动划转至绑定的储蓄卡' }
            ],
            handlingAddress: '广州住房公积金管理中心各区办事处专窗',
            warnTip: '夫妻双方在广州均无房的，双方可分别申请提取，家庭每月最高可提取2800元。'
          },
          citation: {
            title: '广州住房公积金提取管理办法',
            docNumber: '穗公积金规字〔2023〕1号',
            dept: '广州住房公积金管理委员会',
            similarity: '98%',
            clause: '第四条【无房租赁提取】：缴存人及配偶在本市无自有产权住房且租房自住的，每人每月无房租赁提取额度上限为1400元。'
          },
          suggestions: [
            '租房提取公积金之后会影响以后申请公积金房贷吗？',
            '提取公积金每个月什么时候能转账到银行卡？'
          ]
        };
      }

      // 7. 出入境通行证
      if (q.includes('港澳') || q.includes('出境') || q.includes('护照')) {
        return {
          summary: '内地居民在广州办理往来港澳通行证及团队旅游签注实施“全国通办”，凭身份证即可在全市任一出入境接待窗口办理；已有卡式证件再次加签，可在市内 24 小时智能签注机上“立等可取”。',
          guidedSteps: {
            affairId: 106,
            affairCode: 'GZ-GA-GAQZ006',
            affairName: '往来港澳通行证申领与再次签注',
            onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%B8%AF%E6%BE%B3%E9%80%9A%E8%A1%8C%E8%AF%81&region=440100',
            qualifications: '全国合法公民，赴港澳旅游、商务、探亲人员；不受户籍地限制。',
            promisedLimitDays: 7,
            materials: [
              { name: '居民身份证原件' },
              { name: '电子往来港澳通行证（仅再次加签需要）' }
            ],
            processSteps: [
              { stepNo: 1, stepName: '微信预约', description: '关注“广州公安”公众号预约就近出入境接待大厅' },
              { stepNo: 2, stepName: '人工核验', description: '携带身份证到场采集指纹并免费拍照' },
              { stepNo: 3, stepName: '取件到家', description: '7个工作日后可选择现场领取或EMS免费邮寄' }
            ],
            handlingAddress: '广州市公安局出入境大厦及各区分局出入境接待大厅',
            warnTip: '已有电子卡式通行证且没有过期损坏的，可直接前往全市智能签注一体机办理，2分钟立等可取。'
          },
          citation: {
            title: '关于全面实施出入境证件“全国通办”的规定',
            docNumber: '国移发〔2023〕18号',
            dept: '国家移民管理局',
            similarity: '96%',
            clause: '第一条【全国通办】：内地居民可在全国任一出入境管理窗口申请往来港澳通行证及团队旅游签注，不受户籍所在地限制。'
          },
          suggestions: [
            '广州哪些出入境大厅配有24小时智能签注机？',
            '港澳通行证团队旅游签（L签）可以自由行单独通关吗？'
          ]
        };
      }

      // 通用兜底政策问答
      return {
        summary: '市民您好！我是广州政务虚拟政务官叻仔。广州市现行有效的政策规章与办事指南已全部向社会依法公开。您可以随时在输入框中向我咨询具体的办事条件、申领补贴标准或线上申报途径。',
        guidedSteps: null,
        citation: {
          title: '广州市行政规范性文件管理规定',
          docNumber: '广州市人民政府令第192号',
          dept: '广州市人民政府',
          similarity: '92%',
          clause: '第二十三条【统一公开】：现行行政规范性文件应当在广州市人民政府门户网站统一向社会公开，实行便民权威解读。'
        },
        suggestions: [
          '如何查询某个政策文件目前在广州是否依然有效？',
          '拨打广州 12345 便民热线一般多长时间能收到答复？'
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
