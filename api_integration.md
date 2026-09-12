# 🌐 政务双 Agent 协同系统 前端 API 对接文档

本文档面向前端研发工程师，详细说明如何调用政务政策法规与办事服务双 Agent 协同系统的公网 HTTP / SSE 流式接口。

---

## 一、 接口基础信息

| 配置项 | 规范说明 |
| :--- | :--- |
| **公网基础服务地址 (Base URL)** | `http://149.118.133.163:6001` |
| **内网/本地调试地址** | `http://127.0.0.1:6001` |
| **请求格式 (Content-Type)** | `application/json; charset=utf-8` |
| **流式响应格式** | `text/event-stream; charset=utf-8` (SSE) |
| **跨域支持 (CORS)** | 已全开 (`Access-Control-Allow-Origin: *`)，支持任意前端本地或线上域名直接请求 |
| **安全鉴权 (Authorization)** | 严格模式：需在 Header 中携带统一预设的 Bearer Token |
| **默认 Token** | `Bearer gov-rag-sec-2026-auth-token` |

> [!IMPORTANT]
> 请求除 `/api/health` 以外的所有接口时，必须在 HTTP Header 中附带：
> ```http
> Authorization: Bearer gov-rag-sec-2026-auth-token
> ```
> 若缺失或凭证错误，接口将返回 `401 Unauthorized`。

---

## 二、 接口列表与规范

### 1. 服务健康探针 (免鉴权)
用于前端存活探测、负载均衡心跳检测。

* **路径**：`GET /api/health`
* **鉴权**：无需鉴权
* **返回示例**：
```json
{
  "status": "ok",
  "service": "Dual-Agent Government RAG API",
  "version": "2.0.0",
  "timestamp": "2026-09-12T08:35:00.000Z"
}
```

---

### 2. SSE 实时流式问答（核心推荐）
支持大模型逐字流式打印（打字机效果）、执行阶段进度推送、业务元数据（事项链接/法条依据）挂载以及多情形歧义引导。

* **路径**：`POST /api/chat/stream`
* **鉴权**：`Authorization: Bearer <TOKEN>`
* **请求体参数 (JSON)**：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
| :--- | :--- | :---: | :---: | :--- |
| `query` | `string` | **是** | - | 用户咨询提问或情形选择输入（如 `"办税"`、`"怎么申请公租房"` 或选择情形 `"1"`） |
| `sessionId` | `string` | 否 | 自动生成 | 会话 ID。若需要多轮情形选择状态机保活，后续请求请传入上一轮返回的 `sessionId` |

#### SSE 事件生命周期规范

后端采用标准 Server-Sent Events 协议，单次请求会依次按需推送如下命名事件（`event: <eventName>`）：

```mermaid
sequenceDiagram
    participant FE as 前端 (Web/App)
    participant API as 后端 API (6001)

    FE->>API: POST /api/chat/stream { query, sessionId }
    API-->>FE: event: session (下发/确认 sessionId)
    API-->>FE: event: progress (COMPILING 意图转译中)
    API-->>FE: event: route (意图判定: SERVICE/POLICY/HYBRID)
    API-->>FE: event: progress (RETRIEVING 事项/法理检索中)
    
    alt 命中多情形歧义 (如提取公积金/办身份证)
        API-->>FE: event: ambiguity (下发可选情形列表)
        API-->>FE: event: done (等待用户选择)
        Note over FE,API: 用户点击选项 1，带上相同 sessionId 发送 "1"
        FE->>API: POST /api/chat/stream { query: "1", sessionId }
        API-->>FE: event: progress (SCENARIO_RESOLVED 情形确认)
    end

    API-->>FE: event: matched_item / references (业务元数据)
    API-->>FE: event: progress (GENERATING 模型生成中)
    loop 逐字流式打字
        API-->>FE: event: chunk { content: "增量字符..." }
    end
    API-->>FE: event: done { completed: true, totalTimeMs: 1200 }
```

#### 事件详细定义表：

| 事件名 (`event`) | 数据结构 (`data`) 示例 | 前端渲染建议 |
| :--- | :--- | :--- |
| `session` | `{"sessionId": "c1f7..."}` | 保存该 ID，供后续连续交互使用 |
| `progress` | `{"stage": "RETRIEVING", "message": "正在检索事项库并精排..."}` | 在气泡上方显示轻量级加载状态指示器 |
| `route` | `{"intent": "SERVICE", "region": "天河区", "source": "llm"}` | 可展示意图标签（📋 办事实操 / 🏛️ 政策法理 / 📋🏛️ 复合协同） |
| `ambiguity` | `{"isAmbiguous": true, "message": "...", "scenarios": [{"index": 1, "label": "租房提取", "officialName": "..."}]}` | **重要**：渲染为交互式选择按钮或下拉卡片，供用户一键点选 |
| `matched_item` | `{"itemId": "...", "itemName": "食品经营许可(核发)", "deptName": "天河区市监局", "applyUrl": "http://..."}` | 在答复卡片底部展示官方网办入口直达卡片 |
| `references` | `{"chunks": [{"title": "乡村医生从业管理条例", "articleLabel": "第五条", "level": "国家行政法规"}]}` | 在答复下方展示参考公文溯源标签 |
| `chunk` | `{"content": "根据规定..."}` | 追加到当前消息文本末尾，实现打字机效果 |
| `done` | `{"completed": true, "totalTimeMs": 1450, "waitingForScenario": false}` | 结束当前消息加载状态，展示总耗时 |
| `error` | `{"message": "服务处理异常说明"}` | 提示错误 Toast 或重试气泡 |

---

### 3. 标准同步 JSON 问答接口（非流式）
适合无流式打字机需求、传统脚本或后端服务调用。

* **路径**：`POST /api/chat`
* **鉴权**：`Authorization: Bearer <TOKEN>`
* **请求体**：
```json
{
  "query": "在广州补办身份证需要带什么材料？"
}
```
* **响应示例**：
```json
{
  "answer": "您好！在广州市补领居民身份证的指引如下：\n\n一、申请条件...",
  "meta": {
    "intent": "INTENT_SERVICE",
    "region": null,
    "matchedItem": {
      "name": "补领居民身份证",
      "dept": "广州市公安局"
    }
  },
  "totalTimeMs": 2310
}
```

---

## 三、 多情形歧义交互处理机制

以用户输入泛化短词 `"办税"` 为例：
1. 前端调用 `POST /api/chat/stream`，`query = "办税"`；
2. 后端返回 `ambiguity` 事件：
```json
event: ambiguity
data: {
  "isAmbiguous": true,
  "message": "检测到该业务包含多种不同办理情形，请选择对应编号继续获取精准指引：",
  "scenarios": [
    { "index": 1, "label": "社会公众涉税公开信息查询(（企业）)" },
    { "index": 2, "label": "社会公众涉税公开信息查询(（个人）)" },
    { "index": 3, "label": "纳税人涉税信息查询(（企业）)" },
    { "index": 4, "label": "纳税人涉税信息查询(（个人）)" }
  ],
  "sessionId": "416ef296-6e46-444c-bc69-1c9c43d81b33"
}
```
3. 前端界面检测到 `ambiguity` 事件后，将 `scenarios` 渲染为 4 个可选按钮；
4. 用户点击第 2 项，前端重新请求 `/api/chat/stream`：
```json
{
  "query": "2",
  "sessionId": "416ef296-6e46-444c-bc69-1c9c43d81b33"
}
```
5. 后端自动续接该会话上下文，立即输出针对个人涉税查询的标准化办事指南。

---

## 四、 前端接入代码示例

### 1. 原生 JavaScript / TypeScript (`fetch` 流式解析)

```javascript
async function askGovernmentAgent(query, sessionId = null, callbacks = {}) {
    const API_BASE = 'http://149.118.133.163:6001';
    const AUTH_TOKEN = 'gov-rag-sec-2026-auth-token';

    const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({ query, sessionId })
    });

    if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // 保留尚未结束的片段

        for (const block of lines) {
            if (!block.trim()) continue;
            let eventType = 'message';
            let dataStr = '';

            const subLines = block.split('\n');
            for (const line of subLines) {
                if (line.startsWith('event: ')) {
                    eventType = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                    dataStr = line.slice(6).trim();
                }
            }

            if (!dataStr) continue;
            try {
                const payload = JSON.parse(dataStr);
                // 触发对应回调
                if (callbacks[eventType]) {
                    callbacks[eventType](payload);
                }
            } catch (_) {}
        }
    }
}

// 模拟调用：
let currentSessionId = null;

askGovernmentAgent("在广州办身份证", currentSessionId, {
    session: ({ sessionId }) => {
        currentSessionId = sessionId;
    },
    progress: ({ message }) => {
        console.log("⏳ 进度更新:", message);
    },
    route: ({ intent, region }) => {
        console.log(`🧭 意图路由: ${intent}, 辖区: ${region || '全市'}`);
    },
    ambiguity: ({ scenarios, message }) => {
        console.log("⚠️ 遇到多情形:", message, scenarios);
        // 此处可让用户点击并再次调用 askGovernmentAgent("1", currentSessionId, ...)
    },
    chunk: ({ content }) => {
        process.stdout.write(content); // 打字机渲染
    },
    done: ({ totalTimeMs }) => {
        console.log(`\n✅ 生成完成，耗时: ${totalTimeMs}ms`);
    }
});
```

---

### 2. React Hooks 封装示例

```tsx
import React, { useState } from 'react';

export function GovernmentChat() {
    const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [scenarios, setScenarios] = useState<Array<{ index: number; label: string }>>([]);
    const [statusText, setStatusText] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);

    const handleSend = async (userInput: string) => {
        setStatusText('思考中...');
        setScenarios([]);
        setMessages(prev => [...prev, { role: 'user', content: userInput }, { role: 'assistant', content: '' }]);

        await askGovernmentAgent(userInput, sessionId, {
            session: (data) => setSessionId(data.sessionId),
            progress: (data) => setStatusText(data.message),
            ambiguity: (data) => {
                setScenarios(data.scenarios);
                setStatusText('请选择具体办理情形');
            },
            chunk: (data) => {
                setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1].content += data.content;
                    return next;
                });
            },
            done: () => setStatusText('')
        });
    };

    return (
        <div className="chat-container">
            {statusText && <div className="loading-badge">⏳ {statusText}</div>}
            
            {/* 消息列表 */}
            <div className="message-list">
                {messages.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>{m.content}</div>
                ))}
            </div>

            {/* 歧义情形快速选择卡片 */}
            {scenarios.length > 0 && (
                <div className="scenario-buttons">
                    <p>💡 请选择您需要办理的具体情形：</p>
                    {scenarios.map(sc => (
                        <button key={sc.index} onClick={() => handleSend(String(sc.index))}>
                            [{sc.index}] {sc.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
```

---

## 五、 cURL 快速联调命令

#### 1. 健康检查
```bash
curl -i http://149.118.133.163:6001/api/health
```

#### 2. 测试 401 拦截
```bash
curl -i -X POST http://149.118.133.163:6001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"query":"办税"}'
```

#### 3. 授权访问 SSE 流式接口 (查看事件推送)
```bash
curl -N -X POST http://149.118.133.163:6001/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gov-rag-sec-2026-auth-token" \
  -d '{"query":"在广州补办身份证需要带什么材料？"}'
```

#### 4. 复合意图协同提问 (实操部门 + 上位法靶向反查)
```bash
curl -N -X POST http://149.118.133.163:6001/api/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gov-rag-sec-2026-auth-token" \
  -d '{"query":"乡村医生执业证书由哪个部门发证？有上位法依据吗？"}'
```
