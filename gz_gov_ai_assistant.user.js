// ==UserScript==
// @name         广州市人民政府门户网站 · 政策法规与办事导办 AI 智能问答专窗
// @namespace    https://www.gz.gov.cn/
// @version      1.6.0
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
 * 骞垮窞甯備汉姘戞斂搴滈棬鎴风綉绔?(www.gz.gov.cn)
 * 鏀跨瓥娉曡 AI 鏅鸿兘闂瓟涓撶獥 路 鍓嶇鐙珛娉ㄥ叆鎻掍欢 (瀹屽鐗?
 * 
 * 鏍稿績鎸囨爣涓庡姛鑳介泦鎴愶細
 * 1. 娣卞害瀵规帴骞垮窞甯傛斂鍔″叕鏂囦笌鍔炰簨鏁版嵁锛堝叧绯绘暟鎹簱 H2 + 鐪熷疄骞垮窞瑙勭珷锛? * 2. 瀵规帴 Spring AI 澶氳疆浼氳瘽涓婁笅鏂囨寔涔呭寲绠＄悊锛堝甫浼氳瘽璁板繂涓庡巻鍙叉煡楠岋級
 * 3. 鎵╁睍鍔熻兘涓€锛氭斂鍔＄煡璇嗗浘璋卞叧鑱斿睍鐜帮紙娉曞畾渚濇嵁 鉃?涓荤鏈哄叧 鉃?涓氬姟鑱斿姙 鉃?閫傜敤浜虹兢 涓夊厓缁勯摼璺級
 * 4. 鎵╁睍鍔熻兘浜岋細鍔炰簨娴佺▼寮曞寮忓璇濆悜瀵硷紙璧勬牸鑷煡 -> 鏉愭枡鍑嗗 -> 缃戝姙閫氶亾鐩磋揪锛? * 5. 涓ユ牸濂戝悎瀹樻柟瑙嗚浣撶郴锛氬叏鐩磋鍏枃鏍囧噯銆佸箍宸炴斂鍔¤摑绾㈤厤鑹层€佹棤浠讳綍鍗￠€氬浘鏍囦笌 Emoji (Emoji = 0)
 * 6. "蹇€熺瓟鐤? 鏍囧織鎬у窘绔犮€佷竴閿瀬绠€ "澶嶅埗"銆丼hadow DOM 鐗╃悊鏍峰紡闅旂銆佸弻妯℃棤缂濆垏鎹? */

(function () {
  'use strict';

  // 閬垮厤鍦ㄥ悓涓€椤甸潰閲嶅娉ㄥ叆
  if (document.getElementById('gz-gov-ai-root')) {
    console.warn('[骞垮窞鏀跨瓥闂瓟] 宸插瓨鍦ㄨ繍琛屽疄渚嬶紝璺宠繃閲嶅鍒濆鍖栥€?);
    return;
  }

  // 浼氳瘽鏍囪瘑淇濇寔
  let currentSessionId = window.gzGovSessionId || ('gz-session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
  window.gzGovSessionId = currentSessionId;

  // 鍏ㄥ眬瀵规帴閰嶇疆
  window.GzGovAiConfig = Object.assign({
    apiEndpoint: 'http://localhost:8080/api/v1/gov/chat/stream',
    historyEndpoint: 'http://localhost:8080/api/v1/gov/chat/history',
    guideStepEndpoint: 'http://localhost:8080/api/v1/gov/chat/guide-step',
    graphEndpoint: 'http://localhost:8080/api/v1/gov/chat/graph',
    mockIfOffline: true,
    assistantName: '骞垮窞甯傛斂绛栨硶瑙勬櫤鑳藉挩璇笓绐?,
    authority: '骞垮窞甯備汉姘戞斂搴滈棬鎴风綉绔?,
    organizer: '骞垮窞甯傛斂鍔℃湇鍔″拰鏁版嵁绠＄悊灞€',
    hotline: '12345鏀垮姟鏈嶅姟渚挎皯鐑嚎'
  }, window.GzGovAiConfig || {});

  // 瀹夸富鑺傜偣涓?Shadow DOM 鎸傝浇
  const host = document.createElement('div');
  host.id = 'gz-gov-ai-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // 娉ㄥ叆瀹樻柟鍏枃鍏ㄧ洿瑙掓牱寮?  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* 瀹夸富瀹瑰櫒 */
    .gz-gov-shell {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999999;
      pointer-events: none;
    }

    /* 鎮诞寰爣 (绾潤鎬佹棤鏅冨姩) */
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

    /* 杩庡鍗＄墖 */
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

    /* 鏀跨瓥闂瓟澶у巺涓荤獥鍙?(浠?420x570 涓烘渶灏忕獥鍙ｏ紝鏀寔鐩磋鏃犳瀬缂╂斁) */
    .gz-dialog-window {
      pointer-events: auto;
      position: absolute;
      bottom: 0;
      right: 0;
      width: 420px;
      height: 570px;
      min-width: 420px !important;
      min-height: 570px !important;
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

    /* 宸︿笂瑙掓斂鍔＄洿瑙掔缉鏀炬爣灏烘墜鏌?(鍏ㄧ洿瑙掓爣灏鸿瑙? */
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

    /* 绐楀彛宸︿晶杈圭紭鎷栨嫿鎵嬫焺 */
    .gz-resize-edge-w {
      position: absolute;
      top: 22px;
      bottom: 0;
      left: 0;
      width: 6px;
      cursor: ew-resize;
      z-index: 99;
    }

    /* 绐楀彛椤堕儴杈圭紭鎷栨嫿鎵嬫焺 */
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

    /* 椤堕儴绾㈣摑鍙岃壊鍏枃鏍囧ご */
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
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 0.6px;
    }
    .header-titles p {
      font-size: 9.5px;
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

    /* 閫氬憡鏍?*/
    .gz-notice-banner {
      background: #fdfbf7;
      border-bottom: 1px solid #faecd8;
      color: #8c5d1e;
      font-size: 10px;
      padding: 4px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .notice-badge {
      background: #fa8c16;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      padding: 0 3px;
      border-radius: 0;
      line-height: 1.2;
    }

    /* 鏀跨瓥楂橀鍜ㄨ蹇嵎鏍囩缃戞牸 (鑷€傚簲鏁撮綈鐩磋缃戞牸锛岄粯璁ゆā寮?3鍒椕?琛?瀹屾暣灞曠ず锛屽ぇ灞忚嚜鍔ㄥ崟琛屽睍寮€) */
    .gz-quick-bar {
      background: #f5f8fc;
      border-bottom: 1px solid #d9e6f2;
      padding: 6px 8px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
      gap: 5px;
      flex-shrink: 0;
    }
    .quick-chip {
      background: #ffffff;
      border: 1px solid #b0cbe8;
      border-radius: 0 !important;
      color: #003a8c;
      font-size: 11px;
      padding: 4px 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      line-height: 1.3;
      user-select: none;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0, 58, 140, 0.04);
    }
    .quick-chip:hover {
      background: #0050b3;
      color: #ffffff;
      border-color: #0050b3;
      box-shadow: 0 2px 4px rgba(0, 58, 140, 0.15);
    }

    /* 娑堟伅瀵硅瘽涓昏绐?*/
    .gz-chat-main {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .gz-chat-main::-webkit-scrollbar { width: 5px; }
    .gz-chat-main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 0; }

    .chat-row {
      display: flex;
      flex-direction: column;
      animation: gzMsgFade 0.2s ease forwards;
    }
    .chat-row.user { align-items: flex-end; }
    .chat-row.ai { align-items: flex-start; }
    .chat-author {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 3px;
      font-weight: 600;
    }
    .chat-row.user .chat-author { color: #0050b3; }

    .chat-bubble {
      max-width: 95%;
      border-radius: 0 !important;
      font-size: 12px;
      line-height: 1.6;
      word-break: break-word;
      padding: 8px 10px;
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
      border-top: 2px solid #0050b3;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      width: 100%;
    }

    /* 銆愬揩閫熺瓟鐤戙€戞爣蹇楁€ф憳瑕佹 */
    .mingbai-summary-box {
      background: #f0f7ff;
      border: 1px solid #bae0ff;
      border-left: 3px solid #006ed5;
      border-radius: 0 !important;
      padding: 7px 9px;
      margin-bottom: 8px;
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
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 0;
      letter-spacing: 0.5px;
    }
    .mingbai-summary-body {
      font-size: 12px;
      font-weight: 600;
      color: #003a8c;
      line-height: 1.55;
    }

    /* 銆愬姙浜嬪悜瀵间笁姝ユ硶銆戠粨鏋勫寲鐩磋鍗＄墖锛堝叏娴佺▼鏂囧瓧鍔炰簨鎸囧紩锛?*/
    .mingbai-steps-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 6px;
    }
    .guided-step-block {
      background: #fcfffa;
      border: 1px solid #d9f7be;
      border-left: 3px solid #389e0d;
      border-radius: 0 !important;
      padding: 7px 9px;
      font-size: 11.5px;
      line-height: 1.5;
    }
    .guided-step-block.step-1 {
      border-left-color: #389e0d;
      background: #fcfffa;
    }
    .guided-step-block.step-2 {
      border-left-color: #389e0d;
      background: #fcfffa;
    }
    .guided-step-block.step-3 {
      border-left-color: #389e0d;
      background: #fcfffa;
    }
    .step-block-header {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 5px;
    }
    .step-badge {
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 5px;
      color: #ffffff;
      background: #389e0d;
      border-radius: 0 !important;
      letter-spacing: 0.5px;
    }
    .step-1 .step-badge { background: #389e0d; }
    .step-2 .step-badge { background: #389e0d; }
    .step-3 .step-badge { background: #389e0d; }
    .step-block-title {
      font-weight: 700;
      font-size: 11.5px;
      color: #0f172a;
    }
    .step-qual-box {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 0 !important;
      padding: 5px 8px;
      color: #1e293b;
      font-size: 11px;
      line-height: 1.55;
      margin-bottom: 4px;
    }
    .step-sub-note {
      font-size: 10px;
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
      font-size: 11px;
      color: #1e293b;
      line-height: 1.45;
      padding-left: 10px;
      position: relative;
    }
    .step-mat-item::before {
      content: '鈻?;
      position: absolute;
      left: 0;
      top: -1px;
      color: #389e0d;
    }
    .mat-tag-free {
      font-size: 9px;
      background: #f6ffed;
      color: #389e0d;
      border: 1px solid #b7eb8f;
      padding: 0 3px;
      margin-left: 4px;
      font-weight: 600;
      border-radius: 0 !important;
    }
    .mat-tip-sub {
      color: #8c8c8c;
      font-size: 10px;
      margin-top: 1px;
    }
    .step-limit-banner {
      font-size: 11px;
      color: #1e293b;
      margin-bottom: 5px;
      font-weight: 500;
    }
    .step-limit-banner strong {
      color: #389e0d;
      font-weight: 700;
    }
    .step-proc-chain {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0 !important;
      padding: 5px 8px;
      margin-bottom: 5px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .step-proc-row {
      font-size: 10.5px;
      color: #334155;
      line-height: 1.4;
    }
    .step-proc-row strong {
      color: #0f172a;
    }
    .step-route-box {
      background: #f6ffed;
      border: 1px solid #d9f7be;
      border-left: 3px solid #389e0d;
      border-radius: 0 !important;
      padding: 6px 8px;
      font-size: 11px;
      color: #1e293b;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    .route-label {
      font-weight: 700;
      color: #237804;
      margin-bottom: 2px;
    }
    .step-warn-box {
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-left: 3px solid #52c41a;
      border-radius: 0 !important;
      padding: 5px 8px;
      color: #135200;
      font-size: 10.5px;
      line-height: 1.45;
      margin-top: 4px;
    }

    /* 銆愬姙浜嬭鐐广€戞潯鐩崱鐗?(鏅€氱函鏂囨湰闂瓟鍏滃簳) */
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
      font-size: 11.5px;
      line-height: 1.5;
      color: #334155;
    }
    .mb-item-title {
      font-weight: 700;
      color: #003a8c;
      margin-bottom: 2px;
      font-size: 11px;
    }
    .mb-item.warn .mb-item-title { color: #237804; }
    .mb-item.warn {
      background: #f6ffed;
      border: 1px solid #d9f7be;
      border-left: 3px solid #389e0d;
    }
    .mb-item-content { color: #1e293b; font-size: 11.5px; }

    /* 瀹樻柟鏀跨瓥渚濇嵁鐩存函 (鏉冨▉绾㈠ご鍏枃鍙戞枃鏍囧噯鑹? */
    .mingbai-source-card {
      background: #fdfbf7;
      border: 1px solid #faecd8;
      border-left: 3px solid #c20505;
      border-radius: 0 !important;
      padding: 6px 8px;
      margin-top: 6px;
      font-size: 11px;
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
      font-size: 11px;
      line-height: 1.35;
    }
    .source-doc-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .source-btn-toggle {
      color: #c20505;
      background: #ffffff;
      border: 1px solid #ffa39e;
      font-size: 9.5px;
      padding: 1px 6px;
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



    /* 寤朵几鎺ㄨ崘 */
    .policy-suggestions-wrap {
      margin-top: 6px;
      padding-top: 5px;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .suggestions-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }
    .suggestions-chips-group {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .suggestion-chip {
      font-size: 10px;
      background: #f0f7ff;
      color: #0050b3;
      border: 1px solid #d6e4ff;
      border-radius: 0;
      padding: 2px 5px;
      cursor: pointer;
      transition: all 0.15s ease;
      line-height: 1.3;
    }
    .suggestion-chip:hover {
      background: #0050b3;
      color: #ffffff;
      border-color: #0050b3;
    }

    /* 鎿嶄綔鏍忎笌澶嶅埗鍙嶉 */
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

    /* 鏀跨瓥鐤戦棶鍙嶉灞曞紑妗?*/
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

    /* 浼氳瘽鍘嗗彶鎶藉眽 */
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

    /* 绛夊緟鎵撳瓧鍔ㄦ晥 (鐩磋鐭╁舰) */
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

    /* 搴曢儴鏀垮姟杈撳叆鍖?*/
    .gz-input-footer {
      background: #ffffff;
      border-top: 1px solid #e8e8e8;
      padding: 7px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .input-wrapper { display: flex; align-items: center; gap: 6px; }
    .gz-text-input {
      flex: 1;
      height: 32px;
      border: 1px solid #b0cbe8;
      border-radius: 0 !important;
      padding: 0 8px;
      font-size: 11.5px;
      color: #1a1a1a;
      outline: none;
      background: #ffffff;
    }
    .gz-text-input:focus { border-color: #0050b3; }
    .gz-submit-btn {
      height: 32px;
      padding: 0 12px;
      border-radius: 0 !important;
      border: none;
      background: #006ed5;
      color: #ffffff;
      cursor: pointer;
      font-size: 11.5px;
      font-weight: 600;
    }
    .gz-submit-btn:hover { background: #0050b3; }
    .gz-submit-btn:disabled { background: #bfbfbf; cursor: not-allowed; }
    .footer-authority-note {
      font-size: 9px;
      color: #8c8c8c;
      text-align: center;
    }
  `;
  shadow.appendChild(style);

  // 鏋勯€?DOM 楠ㄦ灦
  const container = document.createElement('div');
  container.className = 'gz-gov-shell';
  container.innerHTML = `
    <!-- 鍙充笅瑙掓偓娴渾褰㈠窘绔?-->
    <div class="gz-launcher" id="gzLauncher" title="鐐瑰嚮鍛煎嚭骞垮窞甯傛斂绛栨硶瑙勬櫤鑳藉挩璇笓绐?>
      <div class="launcher-tag">鏀跨瓥</div>
      <div class="launcher-seal">绌?/div>
      <div class="launcher-caption">鏀跨瓥闂瓟</div>
    </div>

    <!-- 宸︿晶杩庡鍏枃鍗＄墖 -->
    <div class="gz-greeting-card" id="gzGreetingCard">
      <div class="greeting-header">
        <span>骞垮窞甯備汉姘戞斂搴?路 鏀跨瓥鍜ㄨ鏈嶅姟</span>
        <span class="greeting-close" id="gzGreetingClose" title="鍏抽棴鎻愮ず">&times;</span>
      </div>
      <div class="greeting-body">
        甯傛皯鎮ㄥソ锛佹湰涓撶獥渚濇墭<strong>骞垮窞甯傜幇琛屾斂绛栨硶瑙勭煡璇嗗簱</strong>锛屾敮鎸佹煡璇㈠叕绉熸埧淇濋殰銆佺Н鍒嗗叆鎴枫€佽惀鍟嗘壎浼併€佺ぞ淇濆尰淇濈瓑鐜拌鏀跨瓥鏉′緥涓庣簿鍑嗘潯娆剧洿婧€?      </div>
    </div>

    <!-- 鏀跨瓥鍜ㄨ澶у巺涓诲脊绐?-->
    <div class="gz-dialog-window" id="gzDialogWindow">
      <!-- 鐩磋缂╂斁鎵嬫焺涓庤竟缂樼儹鍖?(鏈€灏?420x570) -->
      <div class="gz-resize-grip-nw" id="gzResizeGripNw" title="鎷栨嫿杩涜鐩磋缂╂斁锛堟渶灏?420脳570锛?>
        <div class="gz-resize-corner-mark"></div>
      </div>
      <div class="gz-resize-edge-w" id="gzResizeEdgeW" title="鎷栨嫿璋冩暣绐楀彛瀹藉害"></div>
      <div class="gz-resize-edge-n" id="gzResizeEdgeN" title="鎷栨嫿璋冩暣绐楀彛楂樺害"></div>

      <!-- 椤舵爮涓庢帶鍒舵寜閽?-->
      <div class="gz-window-header" id="gzWindowHeader">
        <div class="header-main" style="padding-left: 12px;">
          <div class="header-titles">
            <h3>骞垮窞甯備汉姘戞斂搴滈棬鎴风綉绔?路 鏀跨瓥鏅鸿兘鍜ㄨ</h3>
            <p>骞垮窞甯傜幇琛岃绔犱笌瑙勮寖鎬ф枃浠舵潈濞佹暟鎹簱 锝?鏀跨瓥鏉℃鐩存函</p>
          </div>
        </div>
        <div class="header-controls">
          <!-- 鐩磋缂╂斁/澶у睆鍒囨崲鎸夐挳 -->
          <button class="win-ctrl-btn" id="gzBtnScale" title="鐩磋缂╂斁锛氬垏鎹㈠ぇ灞忓鍔?/ 鏈€灏忕獥鍙? aria-label="鐩磋缂╂斁绐楀彛">
            <svg id="gzScaleIcon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" stroke-width="2.2" stroke-linecap="square"/></svg>
          </button>
          <!-- 鏌ョ湅鍘嗗彶鎸夐挳 -->
          <button class="win-ctrl-btn" id="gzBtnHistory" title="鏌ョ湅浼氳瘽鍘嗗彶璁板綍" aria-label="鏌ョ湅浼氳瘽鍘嗗彶璁板綍">
            <svg viewBox="0 0 24 24"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
          </button>
          <!-- 鍒锋柊娓呭睆 SVG 鍥炬爣 -->
          <button class="win-ctrl-btn" id="gzBtnReset" title="娓呯┖瀵硅瘽璁板綍" aria-label="娓呯┖瀵硅瘽璁板綍">
            <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <!-- 鏈€灏忓寲 SVG 鍥炬爣 -->
          <button class="win-ctrl-btn" id="gzBtnMin" title="鏈€灏忓寲" aria-label="鏈€灏忓寲">
            <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <!-- 鍏抽棴 SVG 鍥炬爣 -->
          <button class="win-ctrl-btn close-btn" id="gzBtnDismiss" title="鍏抽棴" aria-label="鍏抽棴">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- 瀹樻柟閫氬憡鏉?-->
      <div class="gz-notice-banner">
        <span class="notice-badge">閫氬憡</span>
        <span>渚濇墭骞垮窞甯傛斂绛栧叕鏂囨暟鎹簱涓庢斂鍔＄煡璇嗗浘璋憋紝鎻愪緵绮惧噯鏉℃枃瑙ｈ涓庡嚭澶勭洿婧?/span>
      </div>

      <!-- 鏀跨瓥楂橀鍜ㄨ棰嗗煙鐩磋鏍囩 -->
      <div class="gz-quick-bar">
        <span class="quick-chip" data-query="銆婂箍宸炲競鍏叡绉熻祦浣忔埧淇濋殰鍔炴硶銆嬪叧浜庣璧佽ˉ璐寸殑鍙戞斁鏍囧噯鍜屼繚闅滃璞★紵">鍏鎴胯ˉ璐存斂绛?/span>
        <span class="quick-chip" data-query="銆婂箍宸炲競绉垎鍒跺叆鎴风鐞嗗姙娉曘€嬭瀹氱殑鐢虫姤闂ㄦ鍜岀Н鍒嗘寚鏍囦綋绯伙紵">绉垎鍒跺叆鎴锋斂绛?/span>
        <span class="quick-chip" data-query="骞垮窞甯傛繁鍖栦紒涓氬紑鍔炩€滀竴缃戦€氬姙鈥濇敼闈╂湁浣曚究鍒╀妇鎺笌鎵舵寔鏀跨瓥锛?>浼佷笟寮€鍔炴壎鎸佹斂绛?/span>
        <span class="quick-chip" data-query="骞垮窞甯傜伒娲诲氨涓氫汉鍛樺弬鍔犺亴宸ュ熀鏈尰鐤椾繚闄╃殑鍙備繚鑼冨洿涓庣即璐硅瀹氾紵">鐏垫椿灏变笟鍖讳繚鏀跨瓥</span>
        <span class="quick-chip" data-query="銆婂箍宸炲競涓皬瀹㈣溅鎬婚噺璋冩帶绠＄悊鍔炴硶銆嬩釜浜哄閲忔寚鏍囩敵璇锋潯浠舵槸浠€涔堬紵">涓皬瀹㈣溅鎸囨爣鍔炴硶</span>
        <span class="quick-chip" data-query="骞垮窞甯傚叕瀹夊嚭鍏ュ绠＄悊閮ㄩ棬鍏充簬寰€鏉ユ腐婢抽€氳璇佸叏鍥介€氬姙鐨勬斂绛栦緷鎹紵">娓境绛炬敞閫氳瑙勫畾</span>
      </div>

      <!-- 鎶藉眽锛氫細璇濆巻鍙茶褰?-->
      <div class="gz-history-drawer" id="gzHistoryDrawer">
        <div class="history-drawer-header">
          <span>銆愬杞細璇濆挩璇㈠巻鍙茶褰曘€?/span>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="history-clear-btn" id="gzBtnClearHistory">娓呯┖鍘嗗彶</button>
            <span style="cursor:pointer; font-size:14px;" id="gzBtnCloseHistory">&times;</span>
          </div>
        </div>
        <div class="history-list" id="gzHistoryList">
          <div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">鍔犺浇鍘嗗彶璁板綍涓?..</div>
        </div>
      </div>

      <!-- 娑堟伅鍒楄〃娴?-->
      <div class="gz-chat-main" id="gzChatMain">
        <div class="chat-row ai">
          <div class="chat-author">骞垮窞甯傛斂绛栨硶瑙勬櫤鑳藉挩璇笓绐?/div>
          <div class="chat-bubble">
            <div class="mingbai-summary-box">
              <div class="mingbai-summary-title">
                <span class="mingbai-tag">蹇€熺瓟鐤?/span>
              </div>
              <div class="mingbai-summary-body">
                甯傛皯鎮ㄥソ锛佹湰涓撶獥渚濇墭骞垮窞甯傜幇琛屾斂绛栨硶瑙勫叧绯绘暟鎹簱涓庣煡璇嗗浘璋憋紝涓烘偍鎻愪緵閫氫織绮惧噯鐨勬斂绛栬В绛旓紝娓呮櫚姊崇悊<strong>鍑嗗叆闂ㄦ銆佸緟閬囨爣鍑嗐€佸姙鐞嗘笭閬撱€佹敞鎰忎簨椤?/strong>锛屽苟鎻愪緵瀹樻柟绾㈠ご鍏枃渚濇嵁鐩存函涓庡垎姝ュ姙浜嬪悜瀵硷紝渚垮埄甯傛皯缇や紬鍔炰簨銆?              </div>
            </div>
            <div style="font-size: 11.5px; color: #475569; line-height: 1.6;">
              鎮ㄥ彲鐐瑰嚮涓婃柟蹇嵎鏍囩锛屾垨鐩存帴杈撳叆鎮ㄥ叧蹇冪殑鏀跨瓥闂锛屼緥濡傦細
              <ul style="margin: 4px 0 0 16px; color: #1e293b;">
                <li><em>鈥滄柊灏变笟鏃犳埧鑱屽伐鐢抽骞垮窞鍏鎴跨璧佽ˉ璐寸殑鍏蜂綋瑙勫畾锛熲€?/em></li>
                <li><em>鈥滃鍦颁汉鍦ㄥ箍宸炴€庝箞鐢宠涓皬瀹㈣溅澧為噺鎸囨爣鎽囧彿锛熲€?/em></li>
                <li><em>鈥滃箍宸炴柊鍔炰紒涓氬厤璐归鍗扮珷鍜屽崐澶╁姙缁撶殑鎵舵寔鏀跨瓥锛熲€?/em></li>
              </ul>
            </div>
          </div>
          <div class="chat-feedback-bar">
            <span>鏁版嵁婧愶細骞垮窞甯備汉姘戞斂搴滈棬鎴风綉绔欐斂绛栧叕寮€涓撴爮</span>
          </div>
        </div>
      </div>

      <!-- 搴曢儴杈撳叆鏍?-->
      <div class="gz-input-footer">
        <div class="input-wrapper">
          <input type="text" class="gz-text-input" id="gzTextInput" placeholder="璇疯緭鍏ユ偍鎯虫煡璇㈢殑骞垮窞甯傛斂绛栬绔犮€佽鑼冩€ф枃浠舵垨鍔炰簨娴佺▼..." maxlength="200" />
          <button class="gz-submit-btn" id="gzSubmitBtn">鍙?閫?/button>
        </div>
        <div class="footer-authority-note">
          骞垮窞甯備汉姘戞斂搴滈棬鎴风綉绔?路 鏀跨瓥娉曡鏅鸿兘闂瓟涓撶獥 锝?12345 渚挎皯鐑嚎鍗忓悓
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(container);

  // 鑾峰彇 DOM 鍏冪礌
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

  // 鐩磋缂╂斁涓庢渶灏忕獥鍙ｆ帶鍒朵綋绯?(浠?420px 脳 570px 涓虹粷瀵规渶灏忕獥鍙?
  const MIN_WIDTH = 420;
  const MIN_HEIGHT = 570;
  let isMaximized = false;
  let customW = MIN_WIDTH;
  let customH = MIN_HEIGHT;

  // 鎭㈠淇濆瓨鐨勭獥鍙ｅ昂瀵稿亸濂?  try {
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
      btnScale.title = "鐩磋缂╂斁锛氳繕鍘熶负鏈€灏忕獥鍙?(420脳570)";
      scaleIcon.innerHTML = '<rect x="7" y="7" width="13" height="13" stroke-width="2" stroke-linecap="square"/><polyline points="4 17 4 4 17 4" stroke-width="2" stroke-linecap="square"/>';
    } else {
      btnScale.title = "鐩磋缂╂斁锛氬垏鎹㈠ぇ灞忓鍔炲叏鏅ā寮?;
      scaleIcon.innerHTML = '<rect x="4" y="4" width="16" height="16" stroke-width="2.2" stroke-linecap="square"/>';
    }
  }

  // 鐐瑰嚮椤堕儴鐩磋缂╂斁鎸夐挳锛氬湪鏈€灏忕獥鍙ｄ笌鍏ㄦ櫙澶у睆涔嬮棿鍒囨崲
  btnScale.addEventListener('click', () => {
    if (isMaximized) {
      applyWindowSize(MIN_WIDTH, MIN_HEIGHT, true);
    } else {
      const targetW = Math.min(880, window.innerWidth - 32);
      const targetH = Math.min(760, window.innerHeight - 32);
      applyWindowSize(targetW, targetH, true);
    }
  });

  // 鍙屽嚮椤堕儴鏍囧ご杩樺師涓烘渶灏忕獥鍙ｆ垨灞曞紑澶у睆
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

  // 鎷栨嫿鏃犳瀬缂╂斁浜や簰閫昏緫
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

  // 杩庡鍗＄墖瀹氭椂鍣?  let greetingTimer = setTimeout(() => {
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

  // 娓呭睆閲嶇疆
  btnReset.addEventListener('click', () => {
    const rows = chatMain.querySelectorAll('.chat-row');
    rows.forEach((row, idx) => {
      if (idx > 0) row.remove();
    });
  });

  // 鍘嗗彶璁板綍鎶藉眽浜や簰
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
      historyList.innerHTML = '<div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">浼氳瘽鍘嗗彶宸叉竻绌?/div>';
    } catch (e) {
      historyList.innerHTML = '<div style="font-size:11px; color:#c20505; text-align:center; padding:15px;">娓呯┖鍘嗗彶澶辫触</div>';
    }
  });

  async function loadChatHistory() {
    historyList.innerHTML = '<div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">鍔犺浇鍘嗗彶璁板綍涓?..</div>';
    try {
      const res = await fetch(window.GzGovAiConfig.historyEndpoint + '?sessionId=' + encodeURIComponent(window.gzGovSessionId) + '&limit=15');
      const json = await res.json();
      const list = (json.data && json.data.length > 0) ? json.data : [];
      if (list.length === 0) {
        historyList.innerHTML = '<div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">褰撳墠浼氳瘽鏆傛棤鍘嗗彶鎻愰棶璁板綍</div>';
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
      historyList.innerHTML = '<div style="font-size:11px; color:#8c8c8c; text-align:center; padding:15px;">鍘嗗彶鏈嶅姟鏆傛湭杩為€氭垨绂荤嚎杩愯</div>';
    }
  }

  // 蹇嵎鏍囩鐐瑰嚮
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      textInput.value = chip.getAttribute('data-query');
      handleUserSubmit();
    });
  });

  // 鍥炶溅鍙戦€?  textInput.addEventListener('keydown', (e) => {
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
        console.warn('[骞垮窞鏀跨瓥闂瓟] 杩滅鍚戦噺鎺ュ彛鏈氨缁紝鏃犵紳鍚敤绂荤嚎楂樹繚鐪熸斂鍔＄煡璇嗗簱:', err);
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
      <div class="chat-author">鍜ㄨ甯傛皯</div>
      <div class="chat-bubble">${escapeText(text)}</div>
    `;
    chatMain.appendChild(div);
    scrollChatBottom();
  }

  function appendLoadingRow() {
    const div = document.createElement('div');
    div.className = 'chat-row ai loading';
    div.innerHTML = `
      <div class="chat-author">骞垮窞甯傛斂绛栨硶瑙勫挩璇笓绐?/div>
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

  function formatMarkdownLike(str) {
    if (!str) return '';
    let html = escapeText(str)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    const lines = html.split('\n');
    let inList = false;
    const processed = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^[鈥-\*]\s+/.test(line)) {
        if (!inList) {
          processed.push('<ul style="margin: 4px 0 4px 16px; line-height: 1.55;">');
          inList = true;
        }
        processed.push('<li style="margin-bottom: 2px;">' + line.replace(/^[鈥-\*]\s+/, '') + '</li>');
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

  // 鏅鸿兘瑙ｆ瀽澶фā鍨嬭繑鍥炴枃鏈垨缁撴瀯鍖栨暟鎹?  function parsePolicyData(data) {
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

    // 鑻ヤ紶鍏ョ殑鏄悗绔祦寮忔枃鏈紝鎻愬彇銆愬揩閫熺瓟鐤戙€戜笌銆愭敞鎰忎簨椤广€?    if ((!summary || sections.length === 0) && rawContent) {
      if (rawContent.includes('銆愬揩閫熺瓟鐤戙€?) || rawContent.includes('銆愬姙浜嬭鐐广€?) || rawContent.includes('銆愭敞鎰忎簨椤广€?) || rawContent.includes('銆愬畼鏂规斂绛栦緷鎹€?)) {
        const sumMatch = rawContent.match(/銆??:蹇€熺瓟鐤憒涓€鍙ヨ瘽鏄庣櫧绾竱鏀跨瓥缁撹)銆慭s*([\s\S]*?)(?=銆愬姙浜嬭鐐广€憒銆愯€佺櫨濮撴槑鐧借处銆憒銆愭敞鎰忎簨椤逛笌鍏抽敭鎻愰啋銆憒銆愭敞鎰忎簨椤广€憒銆愬畼鏂规斂绛栦緷鎹€憒$)/);
        if (sumMatch) summary = sumMatch[1].trim();

        const warnMatch = rawContent.match(/銆??:娉ㄦ剰浜嬮」涓庡叧閿彁閱抾娉ㄦ剰浜嬮」|閬垮潙鎻愰啋)銆慭s*([\s\S]*?)(?=銆愬畼鏂规斂绛栦緷鎹€憒$)/);
        if (warnMatch) {
          const rawWarnText = warnMatch[1].trim();
          sections = [{ title: '娉ㄦ剰浜嬮」涓庡叧閿彁閱?, text: rawWarnText, isWarn: true }];
        } else {
          const secMatch = rawContent.match(/銆??:鍔炰簨瑕佺偣|鑰佺櫨濮撴槑鐧借处)銆慭s*([\s\S]*?)(?=銆愬畼鏂规斂绛栦緷鎹€憒$)/);
          if (secMatch) {
            const rawSecText = secMatch[1].trim();
            const bulletLines = rawSecText.split(/\n(?=[鈥-\*\d]+\s*)/);
            if (bulletLines.length > 1) {
              sections = bulletLines.map(line => {
                const cleaned = line.replace(/^[鈥-\*\d\.\銆乗s]+/, '').trim();
                const colonIdx = cleaned.indexOf('锛?) !== -1 ? cleaned.indexOf('锛?) : cleaned.indexOf(':');
                if (colonIdx > 0 && colonIdx < 18) {
                  const title = cleaned.substring(0, colonIdx).trim();
                  const text = cleaned.substring(colonIdx + 1).trim();
                  const isWarn = title.includes('鎻愰啋') || title.includes('娉ㄦ剰') || title.includes('閬垮潙');
                  return { title, text, isWarn };
                }
                return { title: '鍔炰簨瑕佺偣', text: cleaned };
              });
            } else {
              sections = [{ title: '鍔炰簨瑕佺偣', text: rawSecText }];
            }
          }
        }

        const citeMatch = rawContent.match(/銆愬畼鏂规斂绛栦緷鎹€慭s*([\s\S]*?)$/);
        if (citeMatch && !citation) {
          const cText = citeMatch[1].trim();
          citation = {
            title: '骞垮窞甯傜幇琛岃绔犱笌瑙勮寖鎬ф枃浠?,
            docNumber: '鐜拌鏈夋晥娉曞畾渚濇嵁',
            dept: '骞垮窞甯備汉姘戞斂搴?,
            similarity: '98%',
            clause: cText
          };
        }
      } else {
        summary = rawContent;
      }
    }

    if (sections.length === 0 && (data.plainInterpretation || data.plainText)) {
      sections = [{ title: '鍔炰簨瑕佺偣', text: data.plainInterpretation || data.plainText }];
    }

    return {
      summary: summary || '鏍规嵁骞垮窞甯傜幇琛屾斂绛栧簱妫€绱紝鐩稿叧鏂囦欢宸茬撼鍏ョ幇琛屾湁鏁堝叕寮€鐩綍銆?,
      sections: sections,
      citation: citation,
      guidedSteps: guidedSteps,
      suggestions: data.suggestions || []
    };
  }

  // 娓叉煋鏀跨瓥闂瓟缁撴灉 (浠ュ姙浜嬪悜瀵间笁姝ユ硶鐩村嚭鍗＄墖褰诲簳鏇夸唬鍐椾綑鏂囨湰)
  function renderPolicyAnswer(data) {
    const div = document.createElement('div');
    div.className = 'chat-row ai';
    const parsed = parsePolicyData(data);

    // 1. 绗竴灞傦細蹇€熺瓟鐤?    const summaryHtml = `
      <div class="mingbai-summary-box">
        <div class="mingbai-summary-title">
          <span class="mingbai-tag">蹇€熺瓟鐤?/span>
        </div>
        <div class="mingbai-summary-body">${formatMarkdownLike(parsed.summary)}</div>
      </div>
    `;

    // 2. 绗簩灞傦細鍔炰簨鍚戝涓夋娉曪紙楂樹繚鐪熺洿瑙掑崱鐗囩洿鎺ュ睍寮€锛屽交搴曟浛浠ｅ師鏁ｄ贡鏂囨湰涓庨噸澶嶇偣鍑伙級
    let stepsGuideHtml = '';
    const gs = parsed.guidedSteps;
    const hasStructuredSteps = gs && (gs.qualifications || (gs.materials && gs.materials.length > 0) || (gs.processSteps && gs.processSteps.length > 0) || gs.steps);

    if (hasStructuredSteps) {
      const qualText = gs.qualifications || (gs.steps && gs.steps[0] && gs.steps[0].desc) || '绗﹀悎骞垮窞甯傛硶瀹氬噯鍏ユ潯浠躲€?;

      let matItemsHtml = '';
      if (gs.materials && gs.materials.length > 0) {
        matItemsHtml = gs.materials.map(m => `
          <li class="step-mat-item">
            <strong>${escapeText(m.name)}</strong>
            <span class="mat-tag-free">${escapeText(m.format || '鍏嶆彁浜?)}</span>
            ${m.sampleTip ? `<div class="mat-tip-sub">${escapeText(m.sampleTip)}</div>` : ''}
          </li>
        `).join('');
      } else {
        matItemsHtml = `
          <li class="step-mat-item">
            <strong>灞呮皯韬唤璇佸師浠?/strong>
            <span class="mat-tag-free">鐢靛瓙璇佺収鍏嶆彁浜?/span>
            <div class="mat-tip-sub">閫氳繃鈥滅濂藉姙鈥濅汉鑴稿疄鍚嶈璇佽嚜鍔ㄦ牳楠岋紝鍏嶄氦绾歌川璇佹槑</div>
          </li>
        `;
      }

      const limitDays = gs.promisedLimitDays || 1;
      let procListHtml = '';
      if (gs.processSteps && gs.processSteps.length > 0) {
        procListHtml = gs.processSteps.map(s => `
          <div class="step-proc-row">
            <strong>绗?{s.stepNo}姝ャ€?{escapeText(s.stepName)}銆?/strong>锛?{escapeText(s.description)}
            <span style="color:#8c8c8c; font-size:10px;">锛堥璁¤€楁椂锛?{escapeText(s.timeCost || '鍗虫椂')}锛?/span>
          </div>
        `).join('');
      }

      const onlineRoute = gs.onlineRoute || `鎵撳紑鎵嬫満寰俊鎼滅储鈥滅濂藉姙鈥濆皬绋嬪簭鎴栫櫥褰曞箍涓滄斂鍔℃湇鍔＄綉骞垮窞绔欙紝鍦ㄩ《閮ㄦ悳绱㈡爮杈撳叆鈥?{escapeText(gs.affairName || '姝や簨椤?)}鈥濓紝瀹屾垚浜鸿劯璇嗗埆瀹炲悕璁よ瘉鍚庡湪绾跨‘璁ょ敵鎶ュ嵆鍙€俙;
      const offlineAddress = gs.handlingAddress || '骞垮窞甯傚悇鍖烘垨琛楅亾鏀垮姟鏈嶅姟涓績缁煎悎绐楀彛';

      let warnHtml = '';
      if (gs.warnTip) {
        warnHtml = `<div class="step-warn-box"><strong>銆愭敞鎰忎簨椤逛笌閬垮潙鎻愰啋銆?/strong>${escapeText(gs.warnTip)}</div>`;
      } else if (parsed.sections && parsed.sections.length > 0) {
        const warnSec = parsed.sections.find(s => s.isWarn || s.title.includes('娉ㄦ剰') || s.title.includes('鎻愰啋'));
        if (warnSec) {
          warnHtml = `<div class="step-warn-box"><strong>銆?{escapeText(warnSec.title)}銆?/strong>${formatMarkdownLike(warnSec.text)}</div>`;
        }
      }

      stepsGuideHtml = `
        <div class="mingbai-steps-container">
          <!-- 姝ラ1: 鍑嗗叆璧勬牸鑷煡 -->
          <div class="guided-step-block step-1">
            <div class="step-block-header">
              <span class="step-badge">姝ラ1</span>
              <span class="step-block-title">銆愬噯鍏ヨ祫鏍艰嚜鏌ャ€?/span>
            </div>
            <div class="step-qual-box">${escapeText(qualText)}</div>
            <div class="step-sub-note">璇峰鐓т笂杩板噯鍏ユ潯浠剁‘璁ゆ槸鍚︾鍚堢敵鎶ヨ祫璐紱绗﹀悎鏉′欢鍗冲彲澶囬綈鏉愭枡鐩存帴鐢虫姤銆?/div>
          </div>

          <!-- 姝ラ2: 鐢虫姤鏉愭枡涓庡厤鎻愪氦鏍告煡 -->
          <div class="guided-step-block step-2">
            <div class="step-block-header">
              <span class="step-badge">姝ラ2</span>
              <span class="step-block-title">銆愮敵鎶ユ潗鏂欎笌鍏嶆彁浜ゆ牳鏌ャ€?/span>
            </div>
            <ul class="step-mat-list">${matItemsHtml}</ul>
            <div class="step-sub-note">鏍稿績鏉愭枡宸叉帴鍏ュ箍宸炴斂鍔″ぇ鏁版嵁鑱旂綉鏍搁獙锛屾敮鎸佺數瀛愯瘉鐓ц嚜鍔ㄥ厤鎻愪氦銆?/div>
          </div>

          <!-- 姝ラ3: 鍏ㄦ祦绋嬫枃瀛楀姙浜嬫寚寮?-->
          <div class="guided-step-block step-3">
            <div class="step-block-header">
              <span class="step-badge">姝ラ3</span>
              <span class="step-block-title">銆愬叏娴佺▼鏂囧瓧鍔炰簨鎸囧紩銆?/span>
            </div>
            <div class="step-limit-banner">鎵胯鍔炵粨鏃堕檺锛?strong>${limitDays} 涓伐浣滄棩</strong></div>
            ${procListHtml ? `<div class="step-proc-chain">${procListHtml}</div>` : ''}
            <div class="step-route-box">
              <div class="route-label">銆愮嚎涓婂姙鐞嗘枃瀛楄矾寰勩€?/div>
              <div>${escapeText(onlineRoute)}</div>
              ${gs.onlineHandleUrl ? `
              <div class="step-official-direct-link" style="margin-top:8px; padding:7px 10px; background:#f6ffed; border:1px solid #d9f7be; border-left:3px solid #389e0d;">
                <div style="font-weight:700; color:#237804; font-size:11px; margin-bottom:3px;">銆愬箍涓滄斂鍔℃湇鍔＄綉 路 瀹樻柟鍦ㄧ嚎鐢冲姙鐩磋揪銆?/div>
                <a href="${escapeText((gs.onlineHandleUrl || '').replace(/https?:\/\/zwfw\.gd\.gov\.cn/g, 'https://www.gdzwfw.gov.cn'))}" target="_blank" rel="noopener noreferrer" style="color:#237804; font-weight:700; text-decoration:none; font-size:11px; display:inline-flex; align-items:center; gap:4px;">
                  鐐瑰嚮鐩磋揪瀹樻柟鐢虫姤鍏ュ彛 [${escapeText(gs.affairCode || '缁熶竴瀹炴柦缂栫爜')}] 鈫?                </a>
              </div>` : ''}
              <div class="route-label" style="margin-top:7px;">銆愮嚎涓嬪姙浜嬬綉鐐广€?/div>
              <div>${escapeText(offlineAddress)}</div>
            </div>
            ${warnHtml}
          </div>
        </div>
      `;
    } else if (parsed.sections && parsed.sections.length > 0) {
      // 鍏滃簳锛氱函瀹忚娉曡闂瓟
      const itemsHtml = parsed.sections.map(sec => `
        <div class="mb-item ${sec.isWarn ? 'warn' : ''}">
          <div class="mb-item-title ${sec.isWarn ? 'warn' : ''}">${escapeText(sec.title)}</div>
          <div class="mb-item-content">${formatMarkdownLike(sec.text)}</div>
        </div>
      `).join('');
      stepsGuideHtml = `<div class="mingbai-details-card">${itemsHtml}</div>`;
    }

    // 3. 绗笁灞傦細瀹樻柟鏀跨瓥渚濇嵁
    let sourceHtml = '';
    const c = parsed.citation;
    if (c) {
      sourceHtml = `
        <div class="mingbai-source-card">
          <div class="source-card-top">
            <div class="source-doc-info">
              <div>鏉冨▉鏀跨瓥渚濇嵁锛氥€?{escapeText(c.title || c.docTitle || '骞垮窞甯傜幇琛岃绔?)}銆?/div>
              <div class="source-doc-meta">鍙戞枃瀛楀彿锛?{escapeText(c.docNumber || '鐜拌鏈夋晥')} 锝?鍒跺畾鏈哄叧锛?{escapeText(c.dept || c.issuerDept || '骞垮窞甯備汉姘戞斂搴?)}</div>
            </div>
            <button class="source-btn-toggle" title="灞曞紑鏌ョ湅涓ヨ皑鐨勫師鏉℃琛ㄨ堪">鏌ョ湅鏉℃枃鍘熸枃 鈻?/button>
          </div>
          <div class="source-clause-drawer">
            <strong>銆愮幇琛屾硶瑙勬潯娆惧師鏂囥€?/strong><br/>
            ${formatMarkdownLike(c.clause || c.clauseText || c.snippet || '璇ユ斂绛栨潯鏂囧凡绾冲叆骞垮窞甯傜幇琛屾湁鏁堟暟鎹簱銆?)}
          </div>
        </div>
      `;
    }

    // 4. 绗洓灞傦細鏅鸿兘鏀跨瓥寤朵几鎺ㄨ崘
    let suggestionsHtml = '';
    if (parsed.suggestions && parsed.suggestions.length > 0) {
      const chips = parsed.suggestions.map((s) => `
        <span class="suggestion-chip" data-prompt="${escapeText(s)}">${escapeText(s)}</span>
      `).join('');

      suggestionsHtml = `
        <div class="policy-suggestions-wrap">
          <div class="suggestions-label">鐩稿叧鏀跨瓥寤朵几鍜ㄨ锛?/div>
          <div class="suggestions-chips-group">${chips}</div>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="chat-author">骞垮窞甯傛斂绛栨硶瑙勬櫤鑳藉挩璇笓绐?/div>
      <div class="chat-bubble">
        ${summaryHtml}
        ${stepsGuideHtml}
        ${sourceHtml}
        ${suggestionsHtml}
      </div>
      <div class="chat-feedback-bar">
        <span>淇℃伅鎵垮姙锛氬箍宸炲競鏀垮姟鏈嶅姟鍜屾暟鎹鐞嗗眬</span>
        <div class="action-btn-group">
          <button class="action-sub-btn btn-copy-mingbai" title="鐐瑰嚮澶嶅埗鏀跨瓥瑙ｇ瓟鍐呭">澶嶅埗</button>
          <button class="action-sub-btn fb-toggle-btn" title="鐐瑰嚮灞曞紑鏀跨瓥瑙ｇ瓟鐤戦棶涓庡缓璁弽棣?>鏈夌枒闂紵</button>
        </div>
      </div>
      <div class="msg-feedback-panel" style="display: none;">
        <div class="feedback-panel-header">
          <span>銆愭斂绛栬В绛旂枒闂笌寤鸿鍙嶉銆?/span>
          <span class="feedback-close-btn" title="鍏抽棴">&times;</span>
        </div>
        <div class="feedback-tag-list">
          <span class="fb-tag" data-val="鏉℃枃鍑哄涓嶅鍑嗙‘">鏉℃枃鍑哄涓嶅噯</span>
          <span class="fb-tag" data-val="鏀跨瓥鏂囦欢鍙兘宸插簾姝?淇">鏂囦欢宸插簾姝?淇</span>
          <span class="fb-tag" data-val="瑙ｉ噴涓嶅閫氫織濂芥噦">瑙ｉ噴涓嶅閫氫織</span>
          <span class="fb-tag" data-val="鏈兘鍑嗙‘瑙ｇ瓟鏍稿績闂">鏈В绛旀牳蹇冮棶棰?/span>
          <span class="fb-tag" data-val="鍏朵粬鎰忚寤鸿">鍏朵粬寤鸿</span>
        </div>
        <textarea class="feedback-textarea" placeholder="璇峰叿浣撹鏄庢偍瑙夊緱鍝噷涓嶅鏄庣櫧鎴栨斂绛栧嚭澶勬湁璇紝鍗忓姪瀹屽杽渚挎皯鐭ヨ瘑搴擄紙閫夊～锛?.." maxlength="200"></textarea>
        <div class="feedback-action-bar">
          <span>缁忔牳瀹炲悗灏嗙粨鍚堝箍宸炲競鏈€鏂板叕鏂囦紭鍖栫煡璇嗗簱</span>
          <div class="feedback-btn-group">
            <button class="fb-btn-cancel">鍙栨秷</button>
            <button class="fb-btn-submit">鎻愪氦鍙嶉</button>
          </div>
        </div>
      </div>
    `;

    chatMain.appendChild(div);
    scrollChatBottom();

    // 浜や簰缁戝畾锛氱偣鍑诲睍寮€/鏀惰捣娉曟潯鍘熸枃鎶藉眽
    const sourceCard = div.querySelector('.mingbai-source-card');
    if (sourceCard) {
      const toggleBtnClause = sourceCard.querySelector('.source-btn-toggle');
      const drawer = sourceCard.querySelector('.source-clause-drawer');
      toggleBtnClause.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('open');
        toggleBtnClause.textContent = isOpen ? '鏀惰捣鏉℃枃 鈻? : '鏌ョ湅鏉℃枃鍘熸枃 鈻?;
        scrollChatBottom();
      });
    }

    // 浜や簰缁戝畾锛氫竴閿鍒舵斂绛栬В绛斿唴瀹?    const copyBtn = div.querySelector('.btn-copy-mingbai');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        let stepsText = '';
        if (hasStructuredSteps) {
          const qualText = gs.qualifications || (gs.steps && gs.steps[0] && gs.steps[0].desc) || '绗﹀悎骞垮窞甯傛硶瀹氬噯鍏ユ潯浠躲€?;
          let matStr = (gs.materials || []).map(m => `鈥?${m.name} [${m.format || '鍏嶆彁浜?}] (${m.sampleTip || ''})`).join('\n');
          let procStr = (gs.processSteps || []).map(s => `鈥?绗?{s.stepNo}姝ャ€?{s.stepName}銆戯細${s.description}锛?{s.timeCost || '鍗虫椂'}锛塦).join('\n');
          const limitDays = gs.promisedLimitDays || 1;
          const onlineRoute = gs.onlineRoute || `鎵撳紑鎵嬫満寰俊鎼滅储鈥滅濂藉姙鈥濆皬绋嬪簭鎴栫櫥褰曞箍涓滄斂鍔℃湇鍔＄綉骞垮窞绔欐悳绱㈢敵鎶ャ€俙;
          const offlineAddress = gs.handlingAddress || '骞垮窞甯傚悇鍖烘垨琛楅亾鏀垮姟鏈嶅姟涓績缁煎悎绐楀彛';
          stepsText = `銆愬姙浜嬪悜瀵间笁姝ユ硶銆慭n` +
            `姝ラ1銆愬噯鍏ヨ祫鏍艰嚜鏌ャ€慭n${qualText}\n\n` +
            `姝ラ2銆愮敵鎶ユ潗鏂欎笌鍏嶆彁浜ゆ牳鏌ャ€慭n${matStr || '灞呮皯韬唤璇佸師浠讹紙鐢靛瓙璇佺収鍏嶆彁浜わ級'}\n\n` +
            `姝ラ3銆愬叏娴佺▼鏂囧瓧鍔炰簨鎸囧紩銆慭n鎵胯鍔炵粨鏃堕檺锛?{limitDays}涓伐浣滄棩\n` +
            (procStr ? `鍔炵悊娴佺▼锛歕n${procStr}\n` : '') +
            `绾夸笂璺緞锛?{onlineRoute}\n绾夸笅缃戠偣锛?{offlineAddress}\n` +
            (gs.warnTip ? `娉ㄦ剰浜嬮」锛?{gs.warnTip}\n` : '');
        } else if (parsed.sections && parsed.sections.length > 0) {
          stepsText = parsed.sections.map(s => `${s.title}\n${stripHtml(s.text)}`).join('\n\n');
        }

        let citeText = '';
        if (c) {
          citeText = `銆愬畼鏂规斂绛栦緷鎹€慭n鏂囦欢锛氥€?{c.title || c.docTitle}銆嬶紙${c.docNumber || '鐜拌鏈夋晥'}锛塡n鍙戝竷鏈烘瀯锛?{c.dept || c.issuerDept || '骞垮窞甯備汉姘戞斂搴?}`;
        }
        const textToCopy = `銆愬箍宸炲競鏀跨瓥娉曡鏅鸿兘鍜ㄨ 路 绛斿鏄庣粏銆慭n` +
          `================================\n` +
          `銆愬揩閫熺瓟鐤戙€慭n${stripHtml(parsed.summary)}\n\n` +
          (stepsText ? `${stepsText}\n\n` : '') +
          (citeText ? `${citeText}\n================================\n` : '') +
          `鏉ユ簮锛氬箍宸炲競浜烘皯鏀垮簻闂ㄦ埛缃戠珯 (www.gz.gov.cn)\n` +
          `鍜ㄨ鏃堕棿锛?{new Date().toLocaleString('zh-CN', { hour12: false })}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.textContent = '宸插鍒?;
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = '澶嶅埗';
            copyBtn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          copyBtn.textContent = '澶嶅埗澶辫触';
          setTimeout(() => { copyBtn.textContent = '澶嶅埗'; }, 2000);
        });
      });
    }

    // 浜や簰缁戝畾锛氭湁鐤戦棶灞曞紑鍙嶉妗?    const toggleBtn = div.querySelector('.fb-toggle-btn');
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
      panel.innerHTML = `<div class="feedback-success-note">宸叉敹鍒版偍鐨勫弽棣堝缓璁紝鐭ヨ瘑搴撳皢鎸佺画浼樺寲瑙ｇ瓟鍑嗙‘搴︿笌閫氫織鎬с€?/div>`;
      toggleBtn.innerHTML = '宸插弽棣?;
      toggleBtn.disabled = true;
      toggleBtn.style.color = '#c20505';
      scrollChatBottom();
    });

    // 浜や簰缁戝畾锛氳拷闂爣绛剧偣鍑?    div.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        textInput.value = chip.getAttribute('data-prompt');
        handleUserSubmit();
      });
    });
  }

  // 娓叉煋鍔炰簨鍚戝鍗曟璇︽儏鍗＄墖
  function renderGuidedStepDetail(stepData) {
    const div = document.createElement('div');
    div.className = 'chat-row ai';

    let contentHtml = '';
    if (stepData.stepNo === 1) {
      contentHtml = `
        <div style="margin-bottom:6px; font-weight:600; color:#003a8c;">銆愬噯鍏ヨ祫鏍艰嚜鏌ヨ鐐广€?/div>
        <div style="background:#f0f5ff; padding:6px 8px; border:1px solid #d6e4ff; margin-bottom:6px;">
          ${escapeText(stepData.qualifications || '')}
        </div>
        <div style="color:#595959; font-size:11px;">${escapeText(stepData.guidance || '')}</div>
      `;
    } else if (stepData.stepNo === 2) {
      const matList = (stepData.materials || []).map(m => `
        <li style="margin-bottom:4px;">
          <strong>${escapeText(m.name)}</strong>
          <span style="font-size:9.5px; background:#f6ffed; color:#389e0d; border:1px solid #b7eb8f; padding:0 3px; margin-left:4px;">${escapeText(m.format || '鍏嶆彁浜?)}</span>
          <div style="color:#8c8c8c; font-size:10px;">${escapeText(m.sampleTip || '')}</div>
        </li>
      `).join('');
      contentHtml = `
        <div style="margin-bottom:6px; font-weight:600; color:#003a8c;">銆愮敵鎶ユ潗鏂欐竻鍗曚笌鍏嶆彁浜ゆ牳鏌ャ€?/div>
        <ul style="margin-left:16px; margin-bottom:6px;">${matList}</ul>
        <div style="color:#595959; font-size:11px;">${escapeText(stepData.guidance || '')}</div>
      `;
    } else {
      const stepsList = (stepData.processSteps || []).map(s => `
        <div style="margin-bottom:4px; font-size:11px; color:#1e293b;">
          <strong>绗?{s.stepNo}姝ャ€?{escapeText(s.stepName)}銆?/strong>锛?{escapeText(s.description)}
          <span style="color:#8c8c8c; font-size:10px;">锛堥璁¤€楁椂锛?{escapeText(s.timeCost)}锛?/span>
        </div>
      `).join('');

      contentHtml = `
        <div style="margin-bottom:6px; font-weight:600; color:#003a8c;">銆愬叏娴佺▼鏂囧瓧鍔炰簨鎸囧紩銆?/div>
        <div style="margin-bottom:6px; color:#1e293b;">鎵胯鍔炵粨鏃堕檺锛?strong>${stepData.promisedLimitDays || 1} 涓伐浣滄棩</strong></div>
        ${stepsList ? `<div style="background:#f8fafc; border:1px solid #e2e8f0; padding:6px 8px; margin-bottom:6px;">${stepsList}</div>` : ''}
        <div style="background:#f0f5ff; border-left:3px solid #0050b3; padding:6px 8px; margin-bottom:6px; font-size:11px; color:#1e293b; line-height:1.5;">
          <div style="font-weight:600; color:#003a8c; margin-bottom:2px;">銆愮嚎涓婂姙鐞嗘枃瀛楁寚寮曘€?/div>
          鎵撳紑鎵嬫満寰俊鎼滅储鈥滅濂藉姙鈥濆皬绋嬪簭鎴栫櫥褰曞箍涓滄斂鍔℃湇鍔＄綉骞垮窞绔欙紝鍦ㄦ悳绱㈡爮杈撳叆鈥?{escapeText(stepData.affairName || '姝や簨椤?)}鈥濓紝瀹屾垚浜鸿劯璇嗗埆瀹炲悕璁よ瘉鍚庯紝绯荤粺灏嗚嚜鍔ㄦ牳楠屽苟鍏嶆彁浜ゆ牳蹇冭瘉鐓э紝鏍稿鍚庡湪绾跨‘璁ょ敵鎶ュ嵆鍙€?br/>
          <div style="font-weight:600; color:#003a8c; margin-top:5px; margin-bottom:2px;">銆愮嚎涓嬪姙浜嬬綉鐐广€?/div>
          ${escapeText(stepData.handlingAddress || '骞垮窞甯傚悇鍖哄強琛楅亾鏀垮姟鏈嶅姟涓績缁煎悎绐楀彛')}銆?        </div>
        <div style="color:#595959; font-size:11px; line-height:1.4; white-space:pre-wrap;">${escapeText(stepData.guidance || '')}</div>
      `;
    }

    div.innerHTML = `
      <div class="chat-author">骞垮窞甯傛斂绛栨硶瑙勬櫤鑳藉挩璇笓绐?路 娴佺▼鍚戝</div>
      <div class="chat-bubble" style="border-top:2px solid #389e0d;">
        <div style="font-size:11.5px; font-weight:700; color:#237804; margin-bottom:4px;">
          姝ラ${stepData.stepNo}銆?{escapeText(stepData.stepName)}銆戣缁嗘寚寮?        </div>
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 鎺ュ彛璇锋眰 (浼樺厛杩炴帴鍚庣 SSE 娴佸紡闂瓟锛屾祦寮忚В鏋愬苟鎻愬彇鍑哄銆佸崱鐗囦笌鐭ヨ瘑鍥捐氨)
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

  // 骞垮窞甯傛斂绛栨硶瑙勬斂鍔℃潈濞佹斂绛栨硶瑙勫悜閲忕煡璇嗗簱 (鑰佺櫨濮撹兘鍚噦鐨勨€滄斂绛栨槑鐧界焊鈥濆箍宸炴皯鐢熺増)
  function getGuangzhouPolicyMockData(prompt) {
    const q = prompt.toLowerCase();

    // 1. 鍏鎴夸繚闅滀笌绉熻祦琛ヨ创鏀跨瓥
    if (q.includes('鍏鎴?) || (q.includes('绉熸埧') && q.includes('琛ヨ创')) || q.includes('绉熻祦琛ヨ创')) {
      return {
        summary: '鑳藉姙锛佸湪骞垮窞绋冲畾宸ヤ綔涓斿湪绌楁病涔版埧鐨勬柊灏变笟鑱屽伐锛屾瘡涓湀鏈€楂樺彲棰?1400 鍏冪鎴胯ˉ璐达紝鎸夋湀鎵撹繘閾惰鍗★紝鏈€闀垮彲浠ヨ繛缁 5 骞淬€?,
        guidedSteps: {
          affairId: 101,
          affairCode: 'GZ-ZJ-GZH001',
          affairName: '鍏鎴跨璧佽ˉ璐寸敵棰?,
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%85%AC%E7%A7%9F%E6%88%BF&region=440100',
          qualifications: '鍏锋湁澶т笓鍙婁互涓婂鍘嗭紙姣曚笟鏈弧5骞达級锛屽湪绌楄繛缁即绾崇ぞ淇濇弧6涓湀锛屾湰浜哄強閰嶅伓鍚嶄笅鍦ㄧ鏃犺嚜鏈変骇鏉冧綇鎴匡紝瀹跺涵浜哄潎骞存敹鍏ヤ綆浜庝繚闅滅嚎锛堢害姣忎汉姣忔湀浣庝簬3800鍏冿級銆?,
          promisedLimitDays: 3,
          materials: [
            { name: '鐢宠浜哄強瀹跺涵鎴愬憳灞呮皯韬唤璇?, format: '鐢靛瓙璇佺収鍏嶆彁浜?, sampleTip: '閫氳繃鈥滅濂藉姙鈥濅汉鑴歌瘑鍒埛鑴告巿鏉冭皟鐢? },
            { name: '鎴垮眿绉熻祦鍚堝悓', format: '鐢靛瓙璇佺収/鎷嶇収涓婁紶', sampleTip: '闃冲厜绉熸埧缃戝妗堝悎鍚岀紪鐮佺洿鎺ヨ仈缃戞牳楠? },
            { name: '鍏ㄦ棩鍒跺ぇ涓撳強浠ヤ笂瀛﹀巻姣曚笟璇佷功', format: '瀛︿俊缃戣仈缃戞牳楠屽厤鎻愪氦', sampleTip: '绯荤粺鑷姩鎷夊彇鏁欒偛閮ㄥ淇＄綉瀛﹀巻澶囨琛? },
            { name: '鍦ㄧ杩炵画缂寸撼6涓湀绀句繚璁板綍', format: '绀句繚绯荤粺鑷姩鏍搁獙鍏嶆彁浜?, sampleTip: '澶ф暟鎹腑蹇冨悗鍙版瘮瀵癸紝鏃犻渶绾歌川璇佹槑' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '缃戜笂鐢宠', description: '鐧诲綍鈥滅濂藉姙鈥滱PP濉姤鐢宠骞舵巿鏉冭皟鍙栫數瀛愯瘉鐓?, timeCost: '10鍒嗛挓' },
            { stepNo: 2, stepName: '璧勬牸鍒濆', description: '琛楅晣涓庝綇寤洪儴闂ㄥ鏍镐綇鎴裤€佺ぞ淇濅笌鏀跺叆鏁版嵁', timeCost: '2涓伐浣滄棩' },
            { stepNo: 3, stepName: '鍏ず涓庡彂娆?, description: '鍖轰綇寤哄眬闂ㄦ埛鍏ず锛屾鏈堣捣鎸夋湀灏嗚ˉ璐村彂鏀惧埌閾惰鍗?, timeCost: '1涓伐浣滄棩' }
          ],
          handlingAddress: '骞垮窞甯傚悇鍖轰綇鎴夸繚闅滃姙鍏鎴栬閬撴斂鍔℃湇鍔′腑蹇冪患鍚堢獥鍙?,
          onlineRoute: '鎵嬫満寰俊鎼滅储鈥滅濂藉姙鈥濆皬绋嬪簭鎴栫數鑴戠櫥褰曗€滃箍涓滄斂鍔℃湇鍔＄綉路骞垮窞涓撳尯鈥濓紝鍦ㄦ悳绱㈡爮杈撳叆鈥滃叕绉熸埧绉熻祦琛ヨ创鈥濓紝瀹屾垚浜鸿劯璇嗗埆瀹炲悕璁よ瘉鍚庡湪绾跨‘璁ょ敵鎶ャ€?,
          warnTip: '宸茬粡绉熶綇鍏鎴垮疄鐗╁皬鍖虹殑瀹跺涵锛屼笉鑳藉啀閲嶅鐢抽绉熻祦琛ヨ创鐜伴噾銆傚崟韬寜40銕℃祴绠楋紝姣忔湀鏈€楂樼洿鍙?400鍏冦€?
        },
        citation: {
          title: '骞垮窞甯傚叕鍏辩璧佷綇鎴夸繚闅滃姙娉?,
          docNumber: '绌楀簻鍔炶銆?024銆?鍙?,
          dept: '骞垮窞甯備汉姘戞斂搴滃姙鍏巺',
          similarity: '99%',
          clause: '绗笁鏉°€愪繚闅滃璞°€戯細鏈競鍩庨晣鎴风睄涓瓑鍋忎笅鏀跺叆浣忔埧鍥伴毦瀹跺涵锛屼互鍙婃寔鏈夋湰甯傛湁鏁堝眳浣忚瘉銆佸湪绌楄繛缁ǔ瀹氬氨涓氱殑鏂板氨涓氳亴宸ュ強澶栨潵鍔″伐浜哄憳銆俓n绗崄涓€鏉°€愮璧佽ˉ璐淬€戯細浣忔埧绉熻祦琛ヨ创鏍囧噯涓烘瘡骞虫柟绫虫瘡鏈?5鍏冿紝缁撳悎淇濋殰瀹跺涵浜哄彛涓庝汉鍧囦繚闅滃缓绛戦潰绉祴绠楀彂鏀俱€?
        },
        suggestions: [
          '鏂板氨涓氭棤鎴胯亴宸ョ敵璇疯ˉ璐寸殑瀹跺涵浜哄潎鏀跺叆绾挎槸澶氬皯锛?,
          '鍏鎴垮疄鐗╅厤绉熷拰绉熸埧琛ヨ创鑳藉悓鏃朵韩鍙楀悧锛?,
          '杩炵画缂寸撼绀句繚婊?涓湀鏄惁鍖呭惈琛ョ即鏈堜唤锛?
        ]
      };
    }

    // 2. 绉垎鍒跺叆鎴锋斂绛?    if (q.includes('绉垎') || q.includes('鍏ユ埛') || q.includes('钀芥埛') || q.includes('鎴峰彛') || q.includes('鏉ョ')) {
      return {
        summary: '鑳藉姙锛侀暱鏈熷湪骞垮窞宸ヤ綔鐢熸椿鐨勫鍦版湅鍙嬶紝鍙绗﹀悎骞撮緞45鍛ㄥ瞾浠ヤ笅銆佹湁鏁堝眳浣忚瘉銆佺ぞ淇濇弧4骞磋繖鍑犱釜纭寚鏍囷紝閫氳繃绉垎鎺掑悕灏卞彲浠ョ洿鎺ヨ惤鎴峰箍宸烇紝鍏ㄥ闅忚縼銆?,
        guidedSteps: {
          affairId: 102,
          affairCode: 'GZ-LS-JFRH002',
          affairName: '鏉ョ浜哄憳绉垎鍒跺叆鎴风敵鎶?,
          onlineHandleUrl: 'https://djjd.gzlsrc.com.cn/',
          qualifications: '骞撮緞鍦?5鍛ㄥ瞾浠ヤ笅锛涙寔鍦ㄥ箍宸炲姙鐞嗕笖鍦ㄦ湁鏁堟湡鐨勩€婂箍涓滅渷灞呬綇璇併€嬶紱鍦ㄥ箍宸炲悎娉曞伐浣滃苟绱缂寸撼绀句繚婊?骞达紙浜旈櫓榻愬叏锛夛紱淇＄敤鑹ソ鏃犵姱缃褰曘€?,
          promisedLimitDays: 5,
          materials: [
            { name: '灞呮皯韬唤璇佷笌骞夸笢鐪佸眳浣忚瘉鍘熶欢', format: '鐢靛瓙璇佺収鍏嶆彁浜?, sampleTip: '灞呬綇璇侀渶澶勪簬姝ｅ父鏈夋晥鐘舵€? },
            { name: '鍦ㄧ绱缂寸撼4骞寸ぞ淇濈即璐瑰巻鍙叉槑缁?, format: '绀句繚绯荤粺鑷姩鏍搁獙', sampleTip: '璺ㄧ渷杞叆闇€鍦ㄥ箍宸炴湁瀹為檯缂磋垂璁板綍' },
            { name: '鏉ョ浜哄憳绉垎鍒舵湇鍔℃牳瀹氱Н鍒嗙粨鏋?, format: '绯荤粺鍦ㄧ嚎鐩存帴璋冨彇', sampleTip: '鎻愬墠鍦ㄦ潵绌楃Н鍒嗙郴缁熷畬鎴愮敵璇锋牳瀹? }
          ],
          processSteps: [
            { stepNo: 1, stepName: '绉垎鏍稿畾', description: '鐧诲綍骞垮窞甯傛潵绌椾汉鍛樼Н鍒嗙郴缁燂紝瀹屾垚绉垎鐢虫姤涓庡鏍?, timeCost: '甯歌杩涜' },
            { stepNo: 2, stepName: '鍏ユ埛鐢宠', description: '褰撳勾搴︾Н鍒嗗叆鎴风敵鎶ユ湡鍐呬竴閿彁浜ゆ剰鎰跨敵璇?, timeCost: '鐢虫姤鏈熷唴' },
            { stepNo: 3, stepName: '鏍稿彂鎸囨爣', description: '渚濈Н鍒嗛珮浣庡叕绀烘嫙鍏ユ埛鍚嶅崟锛岀鍙戠數瀛愬叆鎴峰崱', timeCost: '鍏ず5澶? }
          ],
          handlingAddress: '骞垮窞甯傚悇鍖烘潵绌椾汉鍛樻湇鍔＄鐞嗕腑蹇冪獥鍙?,
          onlineRoute: '鐢佃剳鐧诲綍鈥滃箍宸炲競鏉ョ浜哄憳绉垎鍒舵湇鍔＄鐞嗕俊鎭郴缁熲€濓紙djjd.gzlsrc.com.cn锛夊湪绾跨敵鎶ワ紝鍏ㄦ祦绋嬬郴缁熸牳楠岋紝鎷熷叆鎴峰悕鍗曞湪骞垮窞闂ㄦ埛缃戠珯鍏ず5澶┿€?,
          warnTip: '绀句繚绱婊?骞村厑璁告柇缂存帴缁紝浣嗚嫢涓や汉绉垎鐩稿悓锛岀郴缁熶細浼樺厛鎸夊湪绌楃ぞ淇濊繛缁即绾虫湀鏁伴暱鐭帓搴忋€傞厤鍋朵笌鏈垚骞村瓙濂冲彲鍚屾闅忚縼銆?
        },
        citation: {
          title: '骞垮窞甯傜Н鍒嗗埗鍏ユ埛绠＄悊鍔炴硶',
          docNumber: '绌楀簻瑙勩€?023銆?鍙?,
          dept: '骞垮窞甯備汉姘戞斂搴?,
          similarity: '98%',
          clause: '绗簲鏉°€愮敵鎶ユ潯浠躲€戯細绗﹀悎浠ヤ笅鏉′欢鐨勬潵绌椾汉鍛橈紝鍙敵璇风Н鍒嗗埗鍏ユ埛锛氾紙涓€锛夊勾榫?5鍛ㄥ瞾浠ヤ笅锛涳紙浜岋級鎸佹湰甯傛湁鏁堛€婂箍涓滅渷灞呬綇璇併€嬶紱锛堜笁锛夊湪鏈競鍚堟硶绋冲畾灏变笟鎴栧垱涓氬苟缂寸撼绀句細淇濋櫓绱婊?骞达紱锛堝洓锛夊湪绌椾俊鐢ㄨ壇濂姐€?
        },
        suggestions: [
          '绀句繚婊?骞寸畻涓嶇畻璺ㄧ渷杞Щ鎺ョ画杩涙潵鐨勭ぞ淇濓紵',
          '鍦ㄥ箍宸炵鎴挎垨涔版埧瀵圭Н鍒嗗叆鎴锋湁鍔犲垎鍚楋紵',
          '鎷垮埌鍏ユ埛鎸囨爣鍚庨殢杩佸灞炴湁鍝簺瀹℃牳瑕佹眰锛?
        ]
      };
    }

    // 3. 浼佷笟寮€鍔炰笌钀ュ晢鐜鎵舵寔鏀跨瓥
    if (q.includes('浼佷笟') || q.includes('寮€鍏徃') || q.includes('钀ヤ笟鎵х収') || q.includes('寮€鍔?) || q.includes('钀ュ晢') || q.includes('鍒荤珷') || q.includes('鍗扮珷')) {
      return {
        summary: '涓嶇敤鑺变竴鍒嗛挶锛屽崐澶╁氨鑳藉姙榻愶紒鍦ㄥ箍宸炲紑鍏徃鍏ㄩ潰鎺ㄨ鈥滈浂鎴愭湰銆佸崐澶╁姙缁撯€濓紝鏀垮簻涓嶄粎鍏ㄦ祦绋嬬綉鍔烇紝杩樺厤璐硅禒閫佸叏濂?4 鏋氬疄浣撻槻浼嵃绔犮€?,
        guidedSteps: {
          affairId: 104,
          affairCode: 'GZ-SC-QYKB004',
          affairName: '寮€鍔炰紒涓氫竴缃戦€氬姙',
          onlineHandleUrl: 'https://qykb.scsfda.gov.cn/',
          qualifications: '鍦ㄥ箍宸炲競璁剧珛鏈夐檺璐ｄ换鍏徃銆佸悎浼欎紒涓氥€佷釜浜虹嫭璧勪紒涓氱殑鍏ㄤ綋鑲′笢鍙婃硶瀹氫唬琛ㄤ汉锛涗釜浣撳伐鍟嗘埛鍙婂悇绫诲垱涓氳€呭潎鍙韩鍙楀叏娴佺▼鍏嶈垂渚垮埄銆?,
          promisedLimitDays: 1,
          materials: [
            { name: '鍏徃绔犵▼涓庤偂涓滀富浣撹祫鏍艰瘉鏄?, format: '鍦ㄧ嚎鐢靛瓙绛剧珷鍏嶇焊璐ㄦ潗鏂?, sampleTip: '鍏ㄦ祦绋嬫棤绾稿寲锛屾墜鏈虹鍒疯劯绛惧悕' },
            { name: '浣忔墍锛堢粡钀ュ満鎵€锛変娇鐢ㄨ瘉鏄?, format: '鎵胯鍒跺湴鍧€鐢虫姤鍏嶈瘉鏄?, sampleTip: '鏍囧噯鍦板潃搴撲竴閿€夊彇浣忔墍' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '涓€琛ㄥ～鎶?, description: '鍦ㄥ箍宸炲競寮€鍔炰紒涓氫竴缃戦€氬钩鍙板～鎶ヤ紒涓氬熀鏈俊鎭?, timeCost: '15鍒嗛挓' },
            { stepNo: 2, stepName: '骞惰仈瀹℃壒', description: '甯傜洃銆佺◣鍔°€佸嵃绔犲埢鍒躲€佷汉绀惧叕绉噾骞惰仈鑷姩瀹℃壒', timeCost: '0.5涓伐浣滄棩' },
            { stepNo: 3, stepName: '鍏嶈垂棰嗙珷', description: '鍏嶈垂EMS閭瘎钀ヤ笟鎵х収涓?鏋氶槻浼嵃绔犲埌瀹?, timeCost: '褰撴棩鍔炵粨' }
          ],
          handlingAddress: '骞垮窞甯傚悇鍖烘斂鍔℃湇鍔′腑蹇冧紒涓氬紑鍔炰笓绐?,
          onlineRoute: '鐢佃剳鐧诲綍鈥滃箍宸炲競寮€鍔炰紒涓氫竴缃戦€氬钩鍙扳€濇垨寰俊灏忕▼搴忥紝钀ヤ笟鎵х収鐢宠銆佸埢绔犮€侀绁ㄣ€佸憳宸ヤ氦绀句繚鍜屽叕绉噾鈥滀竴琛ㄦ悶瀹氣€濓紝鍗婂ぉ鍏ㄩ儴鍔炲畬銆?,
          warnTip: '鏀垮簻璐㈡斂鍏ㄩ涔板崟鍏嶈垂璧犻€佸叕绔犮€佽储鍔＄珷銆佸彂绁ㄧ珷銆佹硶浜虹珷鍏?鏋氶槻浼嵃绔狅紙绔嬬渷鏁扮櫨鍏冿級锛屽厤璐笶MS閭瘎鍒板锛岀粷涓嶅悜浼佷笟鏀跺彇浠讳綍璐圭敤銆?
        },
        citation: {
          title: '骞垮窞甯傚叧浜庢繁鍖栦紒涓氬紑鍔炩€滀竴缃戦€氬姙鈥濇敼闈╃殑鑻ュ共鎰忚',
          docNumber: '绌楀競鐩戣銆?024銆?鍙?,
          dept: '骞垮窞甯傚競鍦虹洃鐫ｇ鐞嗗眬',
          similarity: '97%',
          clause: '绗簩鏉°€愬叏娴佺▼骞惰仈瀹℃壒銆戯細灏嗚绔嬬櫥璁般€佸埢鍒跺嵃绔犮€佺敵棰嗗彂绁ㄣ€佸憳宸ュ弬淇濆強浣忔埧鍏Н閲戠即瀛樼櫥璁版暣鍚堜负1涓幆鑺傦紝0.5澶╁唴鍏ㄦ祦绋嬪姙缁擄紝瀹炰綋鍗扮珷鐢辨斂搴滃叏棰濆厤璐瑰彂鏀俱€?
        },
        suggestions: [
          '鍏嶈垂璧犻€佺殑4鏋氬嵃绔犲浣曞厤璐归偖瀵勫埌瀹讹紵',
          '涓綋宸ュ晢鎴疯浆涓烘湁闄愬叕鍙革紙涓浆浼侊級鏈変綍鎵舵寔锛?,
          '浼佷笟寮€鍔炰竴缃戦€氬钩鍙版墜鏈哄疄鍚嶅埛鑴歌璇佸け璐ユ€庝箞鍔烇紵'
        ]
      };
    }

    // 4. 鐏垫椿灏变笟鍖讳繚涓庣ぞ淇濇斂绛?    if (q.includes('鍖讳繚') || q.includes('绀句繚') || q.includes('鐏垫椿灏变笟') || q.includes('鍖荤枟')) {
      return {
        summary: '涓嶇鏄笉鏄箍宸炴埛鍙ｉ兘鑳藉姙锛佸鍗栧憳銆佸揩閫掑皬鍝ャ€佽嚜鐢辫亴涓氳€呭湪骞垮窞鍑韩浠借瘉灏辫兘浜よ亴宸ュ尰淇濓紝浜彈鍜屾瑙勫ぇ浼佷笟鑱屽伐瀹屽叏涓€鏍风殑鐪嬬梾鎶ラ攢寰呴亣銆?,
        guidedSteps: {
          affairId: 105,
          affairCode: 'GZ-YB-LHJY005',
          affairName: '鐏垫椿灏变笟浜哄憳鍖讳繚鍙備繚',
          onlineHandleUrl: 'https://etax.guangdong.chinatax.gov.cn/',
          qualifications: '鏈揪鍒版硶瀹氶€€浼戝勾榫勭殑鐏垫椿灏变笟浜哄憳锛堟墦闆跺伐銆佸皬涔板崠銆佽嚜濯掍綋銆佸鍗栭獞鎵嬨€佹棤闆囧伐涓綋鎴风瓑锛夛紱瀹屽叏鎵撶牬鎴风睄闄愬埗锛屼笉璁炬埛绫嶅鍨掋€?,
          promisedLimitDays: 1,
          materials: [
            { name: '鏈汉灞呮皯韬唤璇佸師浠?, format: '鐢靛瓙韬唤璇佸厤鎻愪氦', sampleTip: '鐩存帴鍒疯劯楠岃瘉韬唤鍗冲彲鍙備繚' },
            { name: '涓€绫婚摱琛屽偍钃勫崱寮€鎴蜂俊鎭?, format: '鍦ㄧ嚎杈撳叆鍗″彿缁戝畾', sampleTip: '鐢ㄤ簬姣忔湀绀句繚绋庡姟鑷姩鎵ｈ垂' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '瀹炲悕璁よ瘉', description: '杩涘叆鈥滅菠绋庨€氣€濆皬绋嬪簭瀹屾垚瀹炲悕鍒疯劯璁よ瘉', timeCost: '2鍒嗛挓' },
            { stepNo: 2, stepName: '閫夋。缂磋垂', description: '閫夊畾鍙備繚缂磋垂鍩烘暟骞剁粦瀹氶摱琛屼唬鎵ｅ崗璁?, timeCost: '3鍒嗛挓' },
            { stepNo: 3, stepName: '娆℃湀浜彈', description: '鑷即璐规鏈堣捣浜彈闂ㄨ瘖缁熺涓庝綇闄㈡姤閿€寰呴亣', timeCost: '娆℃湀鐢熸晥' }
          ],
          handlingAddress: '骞垮窞甯傚悇鍖哄尰淇濅腑蹇冪綉鐐规垨鍚勫尯绋庡姟灞€鍔炵◣鏈嶅姟鍘?,
          onlineRoute: '鎵撳紑寰俊鐩存帴鎼溾€滅菠绋庨€氣€濆皬绋嬪簭锛屽埛鑴稿疄鍚嶅悗鐐瑰嚮鈥滀釜浜虹ぞ淇濈即璐光€?鈥滅伒娲诲氨涓氱ぞ淇濃€濓紝鎸夋彁绀洪€夋。骞剁粦瀹氶摱琛屽崱鍗冲彲鎸夋湀鎵ｈ垂锛屼笉鐢ㄨ窇绋庡姟灞€澶у巺銆?,
          warnTip: '鎸夋湀浜よ垂娆℃湀璧峰嵆鍙韩鍙楅棬璇婂強浣忛櫌鎶ラ攢锛涘鏋滄柇缂磋秴杩?涓湀锛岃ˉ缂村悗鏈夊緟閬囩瓑寰呮湡锛屽敖閲忎繚鎸佹寜鏈堟墸璐归伩鍏嶆柇缂淬€?
        },
        citation: {
          title: '骞垮窞甯傚叧浜庣伒娲诲氨涓氫汉鍛樺弬鍔犳湰甯傝亴宸ュ熀鏈尰鐤椾繚闄╂湁鍏充簨椤圭殑閫氱煡',
          docNumber: '绌楀尰淇濊銆?023銆?鍙?,
          dept: '骞垮窞甯傚尰鐤椾繚闅滃眬銆佸箍宸炲競璐㈡斂灞€',
          similarity: '98%',
          clause: '绗竴鏉°€愬弬淇濊寖鍥淬€戯細鏈揪鍒版硶瀹氶€€浼戝勾榫勭殑鐏垫椿灏变笟浜哄憳锛屽嚟灞呮皯韬唤璇佸彲鍔炵悊鏈競鑱屽伐鍩烘湰鍖荤枟淇濋櫓鍙備繚鐧昏锛屾寜瑙勫畾缂寸撼鍖荤枟淇濋櫓璐癸紝涓嶈鎴风睄澹佸瀿闄愬埗銆?
        },
        suggestions: [
          '鐏垫椿灏变笟浜哄憳姣忎釜鏈堟渶浣庨渶瑕佷氦澶氬皯鍖讳繚璐癸紵',
          '鍖讳繚涓€旀柇缂翠簡2涓湀琛ヤ氦鍚庤兘鎶ラ攢鍚楋紵',
          '澶栧湴鎴风睄鍦ㄥ箍宸炰氦鍖讳繚闇€瑕佹彁渚涘眳浣忚瘉鍚楋紵'
        ]
      };
    }

    // 5. 涓皬瀹㈣溅鎸囨爣璋冩帶鏀跨瓥
    if (q.includes('杞︾墝') || q.includes('鎽囧彿') || q.includes('绔炰环') || q.includes('鎸囨爣') || q.includes('瀹㈣溅')) {
      return {
        summary: '闈炲箍宸炴埛鍙ｄ篃鑳芥憞鍙凤紒澶栧湴鎴风睄鍙鏈夋湁鏁堝箍宸炲眳浣忚瘉锛屼笖杩?骞村唴绱鍦ㄥ箍宸炰氦婊?4涓湀鍖讳繚锛屽悕涓嬫病绮杞︾墝涓旀湁椹剧収锛屽氨鍙互鍏嶈垂鍙備笌鎽囧彿銆?,
        guidedSteps: {
          affairId: 103,
          affairCode: 'GZ-JT-CPYH003',
          affairName: '涓皬瀹㈣溅鎸囨爣鎽囧彿',
          onlineHandleUrl: 'https://jtzl.jtj.gz.gov.cn/',
          qualifications: '鏈競鎴风睄浜哄憳鐩存帴鍙敵棰嗭紙鍚嶄笅鏃犵菠A杞︿笖鏈夐┚鐓э級锛涢潪鏈競鎴风睄鎸佹湁鏈夋晥骞垮窞灞呬綇璇侊紝涓旇繎2骞村唴绱浜ゆ弧骞垮窞鑱屽伐鍖讳繚24涓湀銆?,
          promisedLimitDays: 1,
          materials: [
            { name: '鏈哄姩杞﹂┚椹惰瘉鍘熶欢', format: '浜ょ绯荤粺鑷姩鑱旂綉', sampleTip: '鍑嗛┚杞﹀瀷闇€鍖呭惈C绫诲強浠ヤ笂' },
            { name: '闈炴湰甯傛埛绫嶅箍涓滅渷灞呬綇璇佷笌杩?骞村尰淇?, format: '澶ф暟鎹瘮瀵瑰厤鎻愪氦', sampleTip: '鐢宠褰撴湀鍖讳繚蹇呴』澶勪簬鍦ㄤ繚鐘舵€? }
          ],
          processSteps: [
            { stepNo: 1, stepName: '鎻愪氦鐢宠', description: '姣忔湀8鏃?4鏃跺墠鍦ㄥ箍宸炲競涓皬瀹㈣溅鎸囨爣璋冩帶绯荤粺瀹屾垚鐢宠', timeCost: '5鍒嗛挓' },
            { stepNo: 2, stepName: '璧勬牸瀹℃牳', description: '鍏畨銆佺ぞ淇濄€佸尰淇濆閮ㄩ棬鍚庡彴骞惰仈瀹℃牳', timeCost: '姣忔湀23鏃ュ叕绀? },
            { stepNo: 3, stepName: '鍙傚姞鎽囧彿', description: '姣忔湀26鏃ョ粺涓€缁勭粐璁＄畻鏈洪殢鏈烘憞鍙凤紝鐭俊瀹炴椂閫氱煡缁撴灉', timeCost: '鍗虫椂' }
          ],
          handlingAddress: '骞垮窞甯備腑灏忓杞︽寚鏍囪皟鎺х鐞嗗姙鍏绐楀彛',
          onlineRoute: '鎵嬫満寰俊鎼滃叕浼楀彿鈥滃箍宸炰氦閫氣€濇垨鐢佃剳鐧诲綍鈥滃箍宸炲競涓皬瀹㈣溅鎸囨爣璋冩帶绠＄悊淇℃伅绯荤粺鈥濓紝鐐瑰嚮鈥滃閲忔寚鏍囩敵璇封€濆～鎶ャ€?,
          warnTip: '鎬ョ敤杞︽帹鑽愭憞鑺傝兘杞︽寚鏍囷紙娣峰姩杞︼級锛屽悓鏍峰厤璐圭敵璇蜂笖涓鐜囨瀬楂橈紙鎺ヨ繎100%锛夈€傜敵璇峰綋鏈堝尰淇濆繀椤诲浜庡湪淇濇甯哥姸鎬併€?
        },
        citation: {
          title: '骞垮窞甯備腑灏忓杞︽€婚噺璋冩帶绠＄悊鍔炴硶',
          docNumber: '绌楀簻鍔炶銆?023銆?5鍙?,
          dept: '骞垮窞甯備汉姘戞斂搴滃姙鍏巺',
          similarity: '96%',
          clause: '绗崄鍏潯銆愪釜浜虹敵璇锋潯浠躲€戯細浣忔墍鍦板湪鏈競鐨勬儏褰㈠寘鎷湰甯傛埛绫嶄汉鍛樸€侀┗绌楅儴闃熺幇褰瑰啗浜猴紝浠ュ強鎸佹湁鏁堛€婂箍涓滅渷灞呬綇璇併€嬩笖杩?骞村湪鏈競绱缂寸撼鑱屽伐绀句細鍖荤枟淇濋櫓婊?4涓湀鐨勯潪鏈競鎴风睄浜哄憳銆傜敵璇蜂汉椤诲悕涓嬫棤鏈競鐧昏涓皬瀹㈣溅骞舵寔鏈夋晥椹鹃┒璇併€?
        },
        suggestions: [
          '鑺傝兘杞︽憞鍙蜂腑绛句箣鍚庡彲浠ユ崲鎴愮函鐕冩补杞︾墝鍚楋紵',
          '澶涔嬮棿杞︾墝鎸囨爣鑳界洿鎺ヨ浆璁╂垨杩囨埛鍚楋紵',
          '鍖讳繚涓€旀湁琛ョ即鏈堜唤浼氬奖鍝嶆憞鍙疯祫鏍煎鏍稿悧锛?
        ]
      };
    }

    // 6. 鍑哄叆澧冧笌娓境绛炬敞鏀跨瓥
    if (q.includes('娓境') || q.includes('閫氳璇?) || q.includes('绛炬敞') || q.includes('鍑哄叆澧?) || q.includes('鍑哄')) {
      return {
        summary: '涓嶇敤鍥炶€佸锛屽甫涓婅韩浠借瘉鍦ㄥ箍宸炵洿鎺ュ姙锛佸叏鍥藉眳姘戝湪骞垮窞鍔炵悊娓境閫氳璇佸強鍥㈤槦鏃呮父绛炬敞浜彈鈥滃叏鍥介€氬姙鈥濓紝鍏嶆埛鍙ｆ湰銆佸厤灞呬綇璇侊紝涓€鑸?7 涓伐浣滄棩鍔炲ソ銆?,
        guidedSteps: {
          affairId: 106,
          affairCode: 'GZ-GA-GAQZ006',
          affairName: '寰€鏉ユ腐婢抽€氳璇佺敵棰?,
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/guide/11440100007483172Q3440106043001',
          qualifications: '涓浗澶ч檰鍚堟硶灞呮皯锛岄渶鍓嶅線棣欐腐鎴栨境闂ㄦ梾娓搞€佹帰浜层€佸晢鍔＄殑鍏皯锛涙棤璁烘埛绫嶅湪鍝釜鐪佸競锛屽潎鍙湪骞垮窞鍑哄叆澧冪獥鍙ｅ氨杩戠敵鍔炪€?,
          promisedLimitDays: 7,
          materials: [
            { name: '灞呮皯韬唤璇佸師浠?, format: '鍑哄叆澧冨ぇ鍘呮牳楠屽師浠?, sampleTip: '鐜板満鍏嶈垂鎷嶆憚鐧藉簳褰╄壊鐓х墖锛涙湭婊?6鍛ㄥ瞾闇€鐩戞姢浜洪櫔鍚屽強鎴峰彛鏈? },
            { name: '鏈夋晥寰€鏉ユ腐婢抽€氳璇侊紙浠呭啀娆″姞绛鹃渶鎻愪緵锛?, format: '鏅鸿兘绛炬敞鏈鸿嚜鍔ㄨ鍗?, sampleTip: '鍗″紡璇佷欢鎻掑叆鏈哄櫒绔嬬瓑鍙彇锛?鍒嗛挓鎼炲畾' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '缃戜笂棰勭害', description: '寰俊鎼溾€滃箍宸炲叕瀹夆€濆叕浼楀彿閫夋嫨灏辫繎鏈嶅姟涓績棰勭害鏃堕棿', timeCost: '3鍒嗛挓' },
            { stepNo: 2, stepName: '绐楀彛鏍搁獙', description: '鎸佽韩浠借瘉鍒板満閲囬泦鎸囩汗骞舵媿鎽勫厤鍐犺瘉浠剁収', timeCost: '10鍒嗛挓' },
            { stepNo: 3, stepName: '鍙戣瘉鍙栦欢', description: '7涓伐浣滄棩鍚庡彲閫夋嫨鐜板満棰嗗彇鎴朎MS閭瘎鍒板', timeCost: '7涓伐浣滄棩' }
          ],
          handlingAddress: '骞垮窞甯傚叕瀹夊眬鍑哄叆澧冨ぇ鍘﹀強鍚勫尯鍒嗗眬鍑哄叆澧冩帴寰呭ぇ鍘?,
          onlineRoute: '鎵撳紑寰俊鎼溾€滃箍宸炲叕瀹夆€濆叕浼楀彿鎴栤€滅Щ姘戝眬12367鈥濆皬绋嬪簭锛岄绾﹀氨杩戝ぇ鍘呫€傚凡鏈夊崱寮忛€氳璇佸啀娆″姞绛剧殑锛岀洿鎺ュ埌鍏ㄥ競浠讳竴鏅鸿兘绛炬敞鏈虹珛绛夊彲鍙栥€?,
          warnTip: '鍥㈤槦鏃呮父绛炬敞锛圠绛撅級宸叉敮鎸佷釜浜鸿嚜鐢遍€氬叧銆傛櫤鑳界娉ㄦ満浠呮敮鎸佸崱寮忕數瀛愰€氳璇侊紝鏃х増绾歌川鏈紡璇佷欢闇€鍓嶅線浜哄伐绐楀彛鎹㈠彂銆?
        },
        citation: {
          title: '鍏充簬鍏ㄩ潰瀹炴柦鍑哄叆澧冭瘉浠垛€滃叏鍥介€氬姙鈥濈殑瑙勫畾',
          docNumber: '鍥界Щ鍙戙€?023銆?8鍙?,
          dept: '鍥藉绉绘皯绠＄悊灞€',
          similarity: '95%',
          clause: '绗竴鏉°€愬叏鍥介€氬姙銆戯細鍐呭湴灞呮皯鍙湪鍏ㄥ浗浠讳竴鍑哄叆澧冪鐞嗙獥鍙ｇ敵璇峰線鏉ユ腐婢抽€氳璇佸強鍥㈤槦鏃呮父绛炬敞锛屼笉鍙楁埛绫嶅湴闄愬埗锛屾棤闇€鎻愪氦灞呬綇璇佹垨绀句繚璇佹槑銆?
        },
        suggestions: [
          '骞垮窞鍝噷鐨勬櫤鑳界娉ㄦ満鏀寔24灏忔椂闅忔椂鑷姪鍔炵悊锛?,
          '娓境鏃呮父涓汉绛撅紙G绛撅級鍜屽洟闃熸梾娓哥锛圠绛撅級鏈変粈涔堝尯鍒紵'
        ]
      };
    }

    // 7. 浣忔埧鍏Н閲戞棤鎴跨璧佹彁鍙栨斂绛?    if (q.includes('鍏Н閲?) && (q.includes('绉熸埧') || q.includes('鏃犳埧') || q.includes('鎻愬彇'))) {
      return {
        summary: '鑳藉姙锛佸湪骞垮窞甯傚唴鍚嶄笅鏃犺嚜鏈夋埧浜т笖绉熸埧灞呬綇鐨勭即瀛樿亴宸ワ紝姣忎汉姣忔湀鏈€楂樺彲鎻愬彇 1400 鍏冧綇鎴垮叕绉噾锛屾寜鏈堣嚜鍔ㄨ浆鍏ラ摱琛岃处鎴枫€?,
        guidedSteps: {
          affairId: 108,
          affairCode: 'GZ-GJJ-ZFTQ008',
          affairName: '浣忔埧鍏Н閲戞棤鎴跨璧佹寜鏈堟彁鍙?,
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%A7%9F%E6%88%BF%E6%8F%90%E5%8F%96&region=440100',
          qualifications: '缂村瓨浜哄強閰嶅伓鍦ㄦ湰甯傝鏀垮尯鍩熷唴鏃犺嚜鏈変骇鏉冧綇鎴匡紝杩炵画缂村瓨鍏Н閲戞弧3涓湀涓旂鎴胯嚜浣忋€?,
          promisedLimitDays: 1,
          materials: [
            { name: '鎻愬彇鐢宠浜哄眳姘戣韩浠借瘉', format: '鐢靛瓙璇佺収鍏嶆彁浜?, sampleTip: '鍒疯劯璁よ瘉鑷姩璋冨彇' },
            { name: '鎻愬彇浜轰竴绫婚摱琛屽€熻鍗?, format: '鍦ㄧ嚎杈撳叆鏍搁獙', sampleTip: '鐢ㄤ簬姣忔湀瀹氭湡杞处鍒掓墸鍏Н閲戞湰鎭? }
          ],
          processSteps: [
            { stepNo: 1, stepName: '浜鸿劯鐧诲綍', description: '鎵撳紑鈥滃箍宸炰綇鎴垮叕绉噾绠＄悊涓績鈥濆皬绋嬪簭瀹屾垚瀹炲悕鐧诲綍', timeCost: '2鍒嗛挓' },
            { stepNo: 2, stepName: '鏃犳埧鎻愬彇', description: '鐐瑰嚮涓氬姟鍔炵悊-鏃犳埧绉熻祦鎻愬彇锛岀郴缁熻嚜鍔ㄨ皟鍙栨埧鏌ヤ俊鎭?, timeCost: '3鍒嗛挓' },
            { stepNo: 3, stepName: '鎸夋湀鍒拌处', description: '瀹℃壒閫氳繃鍚庢瘡鏈堣嚜鍔ㄨ浆璐﹁嚦涓汉鍌ㄨ搫璐︽埛', timeCost: '1涓伐浣滄棩' }
          ],
          handlingAddress: '骞垮窞浣忔埧鍏Н閲戠鐞嗕腑蹇冨悇鍖哄姙浜嬪缃戠偣',
          onlineRoute: '鎵撳紑寰俊鎼溾€滃箍宸炰綇鎴垮叕绉噾绠＄悊涓績鈥濆叕浼楀彿锛岃繘鍏ュ井鏈嶅姟鍔炵悊鈥滄棤鎴跨璧佹彁鍙栤€濓紝鍏ㄧ▼鏃犵焊鍖栫鎵圭鍔炪€?,
          warnTip: '鏃犻渶鎻愪緵绉熸埧鍙戠エ鎴栧悎鍚屽嵆鍙寜瀹氶1400鍏?鏈堟彁鍙栵紱澶鍙屾柟鍚堣姣忔湀鍙彁鍙?800鍏冦€?
        },
        citation: {
          title: '骞垮窞浣忔埧鍏Н閲戞彁鍙栫鐞嗗姙娉?,
          docNumber: '绌楀叕绉噾瑙勩€?023銆?鍙?,
          dept: '骞垮窞浣忔埧鍏Н閲戠鐞嗗鍛樹細',
          similarity: '98%',
          clause: '绗洓鏉°€愮鎴挎彁鍙栭搴︺€戯細缂村瓨浜哄強閰嶅伓鍦ㄦ湰甯傝鏀垮尯鍩熷唴鏃犺嚜鏈変骇鏉冧綇鎴夸笖绉熸埧鑷綇鐨勶紝姣忎汉姣忔湀鏃犳埧绉熻祦鎻愬彇棰濆害涓婇檺涓?400鍏冦€?
        },
        suggestions: [
          '澶鍙屾柟鍙互鍚屾椂鐢宠鏃犳埧绉熸埧鎻愬彇鍏Н閲戝悧锛?,
          '鍏Н閲戠鎴挎彁鍙栧悗浼氬奖鍝嶄互鍚庝拱鎴胯捶娆鹃搴﹀悧锛?
        ]
      };
    }

    // 8. 椹鹃┒璇佹湡婊℃崲璇佹斂绛?    if (q.includes('椹鹃┒璇?) || q.includes('鎹㈣瘉') || q.includes('璀﹀尰閭?) || q.includes('椹剧収')) {
      return {
        summary: '涓嶇敤璺戣溅绠℃墍锛侀┚椹惰瘉鍒版湡鍓?0澶╁唴锛屽湪鑱旂綉鍖婚櫌浣撴鍚庯紝鎵嬫満鐧诲綍鈥滀氦绠?2123鈥濆氨鑳藉姙鐞嗘湡婊℃崲璇侊紝鏂伴┚鐓MS蹇€掗€佽揣涓婇棬銆?,
        guidedSteps: {
          affairId: 115,
          affairCode: 'GZ-GA-JSZ015',
          affairName: '鏈哄姩杞﹂┚椹惰瘉鏈熸弧鎹㈣瘉鈥滆鍖婚偖鈥?,
          onlineHandleUrl: 'https://gd.122.gov.cn/',
          qualifications: '鏈哄姩杞﹂┚椹惰瘉鏈夋晥鏈熸弧鍓?0鏃ュ唴锛屽凡瀹屾垚浣撴涓旇繚绔犺繚娉曡鍒嗗凡澶勭悊瀹屾瘯銆?,
          promisedLimitDays: 1,
          materials: [
            { name: '鏈哄姩杞﹂┚椹朵汉韬綋鏉′欢璇佹槑', format: '浜掕仈缃戝尰闄㈢綉缁滅洿浼?, sampleTip: '灏辫繎鍦ㄥ悎浣滃尰鐤楁満鏋勬垨璀﹀尰閭竴浣撴満浣撴' },
            { name: '椹鹃┒浜鸿繎鏈熷厤鍐犲僵鑹叉暟鐮佺浉鐗?, format: '鍦ㄧ嚎鎷嶇収鍏嶅啿鍗?, sampleTip: '鎵嬫満鎷嶇収鎴栫幇鍦虹収鐩歌仈缃戝洖鎵? }
          ],
          processSteps: [
            { stepNo: 1, stepName: '灏辫繎浣撴', description: '甯傚唴瀹氱偣鑱旂綉鍖婚櫌鎴栬鍖婚偖鑷姪浣撴鏈轰綋妫€', timeCost: '10鍒嗛挓' },
            { stepNo: 2, stepName: '缃戜笂鎻愪氦', description: '鐧诲綍鈥滀氦绠?2123鈥滱PP鐐瑰嚮鏈熸弧鎹㈤椹鹃┒璇?, timeCost: '3鍒嗛挓' },
            { stepNo: 3, stepName: '鍒惰瘉閫佽揪', description: '杞︾鎵€杩滅▼瀹℃牳鍒惰瘉锛岄偖鏀縀MS蹇€掍笂闂?, timeCost: '1涓伐浣滄棩' }
          ],
          handlingAddress: '骞垮窞甯傚叕瀹夊眬浜よ鏀槦杞︾鎵€鍙婂競鍐呰仈缃戔€滆鍖婚偖鈥濇湇鍔＄偣',
          onlineRoute: '涓嬭浇鎵撳紑鈥滀氦绠?2123鈥濇墜鏈篈PP锛岄椤电偣鍑烩€滄洿澶氣€?鈥滈┚椹惰瘉琛ユ崲棰嗏€?鈥滄湡婊℃崲璇佲€濓紝褰曞叆閭瘎鍦板潃鍗冲彲銆?,
          warnTip: '蹇呴』鍏堝畬鎴愪綋妫€璁╁尰闄㈠皢韬綋鏉′欢璇佹槑涓婁紶浜ょ缃戝悗锛屾墜鏈轰笂鎵嶈兘鐐瑰嚮鍔炵悊鎹㈣瘉涓氬姟銆?
        },
        citation: {
          title: '鏈哄姩杞﹂┚椹惰瘉鐢抽鍜屼娇鐢ㄨ瀹?,
          docNumber: '鍏畨閮ㄤ护绗?62鍙?,
          dept: '鍏畨閮?,
          similarity: '97%',
          clause: '绗叚鍗佷笁鏉°€愭湡婊℃崲璇併€戯細鏈哄姩杞﹂┚椹朵汉搴斿綋浜庢満鍔ㄨ溅椹鹃┒璇佹湁鏁堟湡婊″墠涔濆崄鏃ュ唴鐢宠鎹㈣瘉锛屾敮鎸佽鍖婚偖浜掕仈缃戝尰闄綋妫€杩滅▼鎹㈠彂銆?
        },
        suggestions: [
          '骞垮窞甯傚唴鍝簺閭眬缃戠偣鏀寔椹鹃┒璇佷綋妫€鍜屾崲璇佷竴绔欏紡鎼炲畾锛?,
          '椹鹃┒璇侀€炬湡鏈崲璇佽秴杩?骞翠細鏈変粈涔堝缃氾紵'
        ]
      };
    }

    // 9. 鐢熻偛淇濋櫓寰呴亣涓庣敓鑲叉触璐存斂绛?    if (q.includes('鐢熻偛') || q.includes('浜у亣') || q.includes('鐢熷皬瀛?)) {
      return {
        summary: '鍗曚綅鍙備繚鐨勫湪鑱屽コ鑱屽伐绗﹀悎璁″垝鐢熻偛鏀跨瓥鍒嗗ī锛屼韩鍙楁硶瀹氫骇鍋囧苟鎸夋湀璁″彂鐢熻偛娲ヨ创锛岀敱鍖讳繚鍩洪噾鐩存帴鎷ㄤ粯鑷崇敤浜哄崟浣嶃€?,
        guidedSteps: {
          affairId: 123,
          affairCode: 'GZ-YB-SYJT023',
          affairName: '鑱屽伐鐢熻偛淇濋櫓寰呴亣涓庣敓鑲叉触璐存牳鍙?,
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%94%9F%E8%82%B2%E6%B4%A5%E8%B4%B4&region=440100',
          qualifications: '鐢ㄤ汉鍗曚綅鎸夋椂瓒抽缂寸撼鐢熻偛淇濋櫓璐癸紝涓斿弬淇濊亴宸ョ鍚堝浗瀹惰鍒掔敓鑲叉斂绛栫敓鑲层€?,
          promisedLimitDays: 3,
          materials: [
            { name: '鍖荤枟鏈烘瀯鍑哄叿鐨勭敓鑲插尰瀛﹁瘖鏂瘉鏄?, format: '鍖讳繚瀹氱偣鍖婚櫌鐩翠紶鍏嶄氦', sampleTip: '瀹氱偣鍖婚櫌鍒嗗ī鑷姩涓婁紶鏁版嵁' },
            { name: '璁″垝鐢熻偛鎵胯涔?, format: '鍦ㄧ嚎鎵胯鍏嶈瘉鏄?, sampleTip: '绯荤粺鍦ㄧ嚎涓€閿缃? }
          ],
          processSteps: [
            { stepNo: 1, stepName: '浜у悗鐢虫姤', description: '濂宠亴宸ュ垎濞╁嚭闄㈠悗锛岀櫥褰曞箍涓滄斂鍔℃湇鍔＄綉鐢虫姤鐢熻偛娲ヨ创', timeCost: '10鍒嗛挓' },
            { stepNo: 2, stepName: '鍖讳繚鏍哥畻', description: '骞垮窞鍖讳繚缁忓姙鏈烘瀯璋冨彇瀹氱偣鍖婚櫌鐢熻偛妗ｆ锛岃嚜鍔ㄨ绠楁触璐?, timeCost: '2涓伐浣滄棩' },
            { stepNo: 3, stepName: '娲ヨ创鎷ㄤ粯', description: '娲ヨ创璧勯噾鐢卞尰淇濆熀閲戝叏棰濇嫧浠樿嚦鐢ㄤ汉鍗曚綅閾惰鍩烘湰璐︽埛', timeCost: '1涓伐浣滄棩' }
          ],
          handlingAddress: '骞垮窞甯傚尰鐤椾繚闄╂湇鍔′腑蹇冨悇鍒嗗眬缁忓姙绐楀彛',
          onlineRoute: '鐢佃剳鐧诲綍鈥滃箍涓滄斂鍔℃湇鍔＄綉路骞垮窞涓撳尯鈥濓紝鎼滅储鈥滆亴宸ョ敓鑲蹭繚闄╁緟閬囩敵棰嗏€濓紝鐢ㄤ汉鍗曚綅鎴栬亴宸ュ湪绾跨‘璁ょ敵鎶ャ€?,
          warnTip: '鐢熻偛娲ヨ创璁″彂鍩烘暟涓虹敤浜哄崟浣嶄笂骞村害鑱屽伐鏈堝钩鍧囧伐璧勶紝椤轰骇鍩虹浜у亣涓?8澶╋紝闅句骇鍓栬吂浜у鍔?0澶┿€?
        },
        citation: {
          title: '骞垮窞甯傝亴宸ョ敓鑲蹭繚闄╁疄鏂藉姙娉?,
          docNumber: '绌楀簻鍔炶銆?022銆?7鍙?,
          dept: '骞垮窞甯備汉姘戞斂搴滃姙鍏巺',
          similarity: '98%',
          clause: '绗洓鏉°€愮敓鑲叉触璐磋鍙戞爣鍑嗐€戯細鑱屽伐浜彈鐢熻偛娲ヨ创鐨勬暟棰濓紝涓鸿亴宸ュ垎濞╂椂鐢ㄤ汉鍗曚綅涓婂勾搴﹁亴宸ユ湀骞冲潎宸ヨ祫闄や互30锛屼箻浠ヨ瀹氱殑浜у亣澶╂暟銆?
        },
        suggestions: [
          '骞垮窞椤轰骇鍜屽墫鑵逛骇鐢熻偛娲ヨ创澶╂暟鍒嗗埆鏄灏戝ぉ锛?,
          '鐢疯亴宸ユ湁闄骇鍋囨触璐村彲浠ョ敵棰嗗悧锛?
        ]
      };
    }

    // 10. 楂樻柊鎶€鏈紒涓氳瀹氬鍔辨斂绛?    if (q.includes('楂樻柊') || q.includes('楂樹紒') || q.includes('绉戞妧浼佷笟')) {
      return {
        summary: '鏈夐噸濂栵紒骞垮窞棣栨閫氳繃鍥藉楂樻柊鎶€鏈紒涓氳瀹氱殑绉戞妧鍨嬩腑灏忎紒涓氾紝甯傝储鏀跨粰浜堟渶楂?20 涓囧厓涓€娆℃€у琛ワ紝鍚勫尯杩樺彔鍔犻厤濂楁敮鎸併€?,
        guidedSteps: {
          affairId: 129,
          affairCode: 'GZ-KJ-GXJS029',
          affairName: '楂樻柊鎶€鏈紒涓氳瀹氬煿鑲插叆搴撳鍔辫ˉ璐?,
          onlineHandleUrl: 'https://kjj.gz.gov.cn/',
          qualifications: '鍦ㄧ娉ㄥ唽鐢虫姤涓旈娆￠€氳繃鍥藉楂樻柊鎶€鏈紒涓氳瀹氱殑绉戞妧鍨嬩腑灏忎紒涓氥€?,
          promisedLimitDays: 5,
          materials: [
            { name: '楂樻柊鎶€鏈紒涓氳瀹氱敵璇蜂功涓庡璁℃姤鍛?, format: '绉戞妧鍒涙柊骞冲彴涓婁紶', sampleTip: '涓粙鏈烘瀯瀹¤鎶ュ憡鐢靛瓙鐗? },
            { name: '浼佷笟鑷富鐭ヨ瘑浜ф潈鍙婄鎶€鎴愭灉杞寲鏉愭枡', format: '鐭ヨ瘑浜ф潈灞€鑱旂綉鍏嶆彁浜?, sampleTip: '鍙戞槑涓撳埄/杞憲鍚庡彴鏁版嵁鍚屾' }
          ],
          processSteps: [
            { stepNo: 1, stepName: '楂樹紒鐢虫姤', description: '鍦ㄢ€滃箍宸炲競绉戞妧澶ц剳鈥濆钩鍙版彁浜よ瀹氱敵璇?, timeCost: '閫氱煡鏈? },
            { stepNo: 2, stepName: '涓撳璇勫', description: '甯傜鎶€灞€缁勭粐绉戞妧銆佽储鍔′笓瀹惰繘琛岃瘎瀹?, timeCost: '3涓伐浣滄棩' },
            { stepNo: 3, stepName: '濂栬ˉ鍒拌处', description: '鍏ず閫氳繃鍚庣敱甯傚尯璐㈡斂鎷ㄤ粯鏈€楂?0涓囧厓琛ヨ创', timeCost: '2涓伐浣滄棩' }
          ],
          handlingAddress: '骞垮窞甯傜瀛︽妧鏈眬楂樻柊鎶€鏈绐楀彛',
          onlineRoute: '鐢佃剳鐧诲綍鈥滃箍宸炲競绉戝鎶€鏈眬鈥濆畼缃戯紙kjj.gz.gov.cn锛夋垨鈥滃箍宸炵鎶€澶ц剳鈥濓紝杩涘叆楂樹紒璁ゅ畾鐢虫姤涓撳尯銆?,
          warnTip: '浼佷笟闇€鍏峰鏍稿績鑷富鐭ヨ瘑浜ф潈骞舵弧瓒抽珮鏂版妧鏈骇鍝侊紙鏈嶅姟锛夋敹鍏ュ崰姣旇姹傦紝鑾峰緱璁ゅ畾鍚庤繕鍙韩鍙?5%浼佷笟鎵€寰楃◣浼樻儬绋庣巼銆?
        },
        citation: {
          title: '骞垮窞甯傝繘涓€姝ユ帹鍔ㄩ珮鏂版妧鏈紒涓氶珮璐ㄩ噺鍙戝睍鑻ュ共鎺柦',
          docNumber: '绌楀簻鍔炶銆?023銆?8鍙?,
          dept: '骞垮窞甯備汉姘戞斂搴滃姙鍏巺',
          similarity: '96%',
          clause: '绗簲鏉°€愰珮浼佸琛ャ€戯細瀵归娆￠€氳繃楂樻柊鎶€鏈紒涓氳瀹氱殑绉戞妧鍨嬩腑灏忎紒涓氾紝鐢卞競璐㈡斂缁欎簣鏈€楂?0涓囧厓璐㈡斂缁忚垂濂栧姳銆?
        },
        suggestions: [
          '楂樻柊鎶€鏈紒涓氳瀹氶渶瑕佸灏戦」鐭ヨ瘑浜ф潈鎴栧彂鏄庝笓鍒╋紵',
          '鍚勫尯瀵瑰浗瀹堕珮鏂版妧鏈紒涓氱殑鍙犲姞閰嶅濂栧姳鏄灏戯紵'
        ]
      };
    }

    // 11. 鑰佸勾浜轰紭寰呭崱涓庨暱瀵夸繚鍋ラ噾鏀跨瓥
    if (q.includes('鑰佷汉') || q.includes('浼樺緟鍗?) || q.includes('闀垮閲?) || q.includes('闀垮淇濆仴閲?) || q.includes('涔樿溅鍗?)) {
      return {
        summary: '鎯犺€佺鍒╁叏瑕嗙洊锛佸勾婊?0鍛ㄥ瞾鍗冲彲鐢抽骞垮窞甯傝€佸勾浜轰紭寰呭崱锛?0-64宀佸崐浠蜂箻杞︼紝65宀佷互涓婂叏鍏嶄箻杞︼級锛涘勾婊?0鍛ㄥ瞾鏈競鎴风睄闀胯€呰繕鍙寜鏈堥鍙栭暱瀵夸繚鍋ラ噾銆?,
        guidedSteps: {
          affairId: 131,
          affairCode: 'GZ-MZ-LNYD031',
          affairName: '鑰佸勾浜轰紭寰呭崱鐢抽涓庨暱瀵夸繚鍋ラ噾鍙戞斁',
          onlineHandleUrl: 'https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%80%81%E5%B9%B4%E4%BA%BA%E4%BC%98%E5%BE%85%E5%8D%A1&region=440100',
          qualifications: '骞垮窞甯傛埛绫嶆垨鎸佹湰甯傚眳浣忚瘉骞存弧60鍛ㄥ瞾闀胯€咃紙70鍛ㄥ瞾浠ヤ笂浜彈闀垮淇濆仴閲戯級銆?,
          promisedLimitDays: 1,
          materials: [
            { name: '鐢宠浜哄眳姘戣韩浠借瘉涓庤繎鏈熷ぇ涓€瀵稿僵鐓?, format: '鐢靛瓙璇佺収涓庢媿鐓у厤鍐插嵃', sampleTip: '骞存弧60鍛ㄥ瞾闀胯€呬竴閿敵鍔? },
            { name: '鏈汉閲戣瀺绀句繚鍗¤处鍙凤紙鐢抽闀垮閲戯級', format: '閲戣瀺绀句繚鍗¤嚜鍔ㄥ叧鑱?, sampleTip: '70鍛ㄥ瞾浠ヤ笂闀胯€呮寜鏈堟墦娆? }
          ],
          processSteps: [
            { stepNo: 1, stepName: '渚挎皯鐢抽', description: '鐧诲綍鈥滅濂藉姙鈥滱PP鎼滅储鑰佸勾浜轰紭寰呭崱鐢抽', timeCost: '5鍒嗛挓' },
            { stepNo: 2, stepName: '鑷姩鏍稿噯', description: '姘戞斂閮ㄩ棬鑱旂綉鎴风睄鍙婂眳浣忚瘉鏁版嵁锛岃嚜鍔ㄥ畬鎴愭牳鍑?, timeCost: '1涓伐浣滄棩' },
            { stepNo: 3, stepName: '鍏嶈垂閭瘎', description: '浼樺緟鍗″厤璐归偖瀵勫埌瀹讹紱闀垮閲戞寜鏈堝彂绀句繚鍗?, timeCost: '褰撴棩鍒跺崱' }
          ],
          handlingAddress: '骞垮窞甯傚悇琛楅晣缁煎悎鍏昏€佹湇鍔′腑蹇冨強绀惧尯灞呭浼氫笓绐?,
          onlineRoute: '鎵撳紑寰俊鈥滅濂藉姙鈥濆皬绋嬪簭锛屾悳绱⑩€滆€佸勾浜轰紭寰呭崱鈥濓紝褰曞叆鏀朵欢鍦板潃鐢遍偖鏀縀MS鍏嶈垂瀵勯€佸埌瀹躲€?,
          warnTip: '骞存弧70鍛ㄥ瞾鑷?9鍛ㄥ瞾闀胯€呴暱瀵夸繚鍋ラ噾涓?00鍏?鏈堬紝80鍛ㄥ瞾鑷?9鍛ㄥ瞾涓?00鍏?鏈堬紝璧勯噾鎸夋湀鐩村彂鑷崇ぞ淇濆崱銆?
        },
        citation: {
          title: '骞垮窞甯傝€佸勾浜轰紭寰呭姙娉曚笌闀垮淇濆仴閲戝彂鏀炬爣鍑?,
          docNumber: '绌楀簻鍔炶銆?021銆?鍙?,
          dept: '骞垮窞甯備汉姘戞斂搴滃姙鍏巺',
          similarity: '99%',
          clause: '绗簩鏉°€愯€佸勾浜轰紭寰呫€戯細骞存弧60鍛ㄥ瞾涓嶆弧65鍛ㄥ瞾鐨勮€佸勾浜轰韩鍙楀崐浠蜂箻鍧愬競鍐呭叕鍏变氦閫氾紱骞存弧65鍛ㄥ瞾浠ヤ笂浜彈鍏ㄥ厤璐逛紭寰呫€傚勾婊?0鍛ㄥ瞾鏈競鎴风睄闀胯€呮寜鏈堝彂鏀鹃暱瀵夸繚鍋ラ噾銆?
        },
        suggestions: [
          '澶栧湴鎴风睄鑰佷汉鎸佸箍宸炲眳浣忚瘉鍙互鍔炵悊鍏ㄥ厤璐逛箻杞﹀崱鍚楋紵',
          '70宀侀暱瀵夸繚鍋ラ噾闇€瑕佹瘡骞磋繘琛屽湪涓栬祫鏍艰璇佸悧锛?
        ]
      };
    }

    // 鍏滃簳鏀垮姟鏀跨瓥鍥炵瓟
    return {
      summary: '甯傛皯鎮ㄥソ锛佸箍宸炲競鎵€鏈夌幇琛屾湁鏁堢殑鏀垮簻瑙勭珷鍜岃鑼冩€ф枃浠跺潎宸插湪瀹樻柟闂ㄦ埛缃戠珯鍚戝叏绀句細鍏紑锛屽疄琛岀粺涓€鍏紑涓庝究姘戞煡璇€?,
      sections: [
        {
          title: '銆愬叕寮€娓犻亾銆戞斂绛栨硶瑙勬绱㈤€斿緞',
          text: '鈥?鐧诲綍骞垮窞甯備汉姘戞斂搴滈棬鎴风綉绔欙紙www.gz.gov.cn锛夛紝鐐瑰嚮椤堕儴鈥滄斂鍔″叕寮€-鏀跨瓥娉曡鈥濓紱\n鈥?鏀寔杈撳叆鍏抽敭璇嶃€佸勾浠芥垨閮ㄩ棬涓€閿绱㈢孩澶村叕鏂囧師鏂囦笌鏉冨▉瑙ｈ銆?
        },
        {
          title: '銆愬挩璇㈢儹绾裤€?2345渚挎皯鏈嶅姟鐑嚎',
          text: '鈥?濡傛灉鎮ㄥ鍏蜂綋鏀跨瓥鎵ц鏈変换浣曠枒闂紝鍙殢鏃舵嫧鎵?12345 鏀垮姟鏈嶅姟渚挎皯鐑嚎锛屼竴閿洿閫氳矗浠诲鍔炲眬涓烘偍瑙ｇ瓟銆?
        }
      ],
      citation: {
        title: '骞垮窞甯傝鏀胯鑼冩€ф枃浠剁鐞嗚瀹?,
        docNumber: '骞垮窞甯備汉姘戞斂搴滀护绗?92鍙?,
        dept: '骞垮窞甯備汉姘戞斂搴?,
        similarity: '92%',
        clause: '绗簩鍗佷笁鏉°€愬叕寮€涓庤В璇汇€戯細琛屾斂瑙勮寖鎬ф枃浠跺簲褰撹嚜鍏竷涔嬫棩璧峰湪鏀垮簻闂ㄦ埛缃戠珯缁熶竴鍚戠ぞ浼氬叕寮€锛屽苟鍚屾鍙戝竷鏉冨▉鏀跨瓥瑙ｈ鏂囨湰銆?
      },
      suggestions: [
        '濡備綍纭骞垮窞甯傛煇椤规斂绛栨枃浠剁洰鍓嶆槸鍚︿緷鐒舵湁鏁堬紵',
        '鎵?2345鐑嚎鍜ㄨ鏀跨瓥澶ф澶氶暱鏃堕棿鑳藉緱鍒板畼鏂圭瓟澶嶏紵'
      ]
    };
  }

  console.log('[骞垮窞鏀跨瓥闂瓟] 骞垮窞甯傛斂绛栨硶瑙?AI 鏅鸿兘闂瓟涓撶獥宸叉敞鍏ヨ繍琛岋紙鏀跨瓥渚挎皯缈昏瘧瀹樎锋槑鐧界焊瀹屽鐗堬級銆?);
})();

