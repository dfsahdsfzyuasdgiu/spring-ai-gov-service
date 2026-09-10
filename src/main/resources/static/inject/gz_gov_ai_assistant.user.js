// ==UserScript==
// @name         广州市人民政府门户网站 · 右下角圆形政务AI问答小助手 (穗政通)
// @namespace    https://www.gz.gov.cn/
// @version      1.0.0
// @description  为广州市人民政府门户网站（www.gz.gov.cn）注入右下角现代化圆形AI问答悬浮小助手，支持广州本地政策法规检索、六级十二项标准办事指南导办，具备呼吸光晕、3D浮动与弹性开合动画效果。
// @author       穗政AI小助手团队
// @match        https://www.gz.gov.cn/*
// @match        http://www.gz.gov.cn/*
// @match        https://zwfw.gd.gov.cn/*
// @match        http://localhost:*/*
// @icon         https://www.gz.gov.cn/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    console.log('[穗政AI 油猴脚本] 正在注入广州市人民政府AI小助手...');

    // 检查页面是否已加载嵌入脚本
    if (document.getElementById('gz-gov-ai-root')) {
        return;
    }

    // 动态载入小助手核心逻辑
    const script = document.createElement('script');
    script.src = 'http://localhost:8080/inject/gz_assistant_embed.js';
    script.onerror = function() {
        console.warn('[穗政AI] 远程载入失败，降级采用内联注入模式。');
    };
    document.body.appendChild(script);
})();
