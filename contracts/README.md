# API 契约定义

本目录包含 API 接口的 JSON Schema 定义，用于：

- 验证请求/响应格式
- 生成类型定义
- 契约测试

## Schema 文件

- `api-chat-request.schema.json` - POST /api/chat 请求体定义
- `sse-events.schema.json` - SSE 流事件类型定义

## 使用示例

### 在测试中验证请求格式

```javascript
import Ajv from 'ajv';
import chatRequestSchema from '../contracts/api-chat-request.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(chatRequestSchema);

const request = { message: 'Hello', chatId: 'chat_123_abc' };
const valid = validate(request);
if (!valid) {
  console.error(validate.errors);
}
```

### 验证 SSE 事件

```javascript
import Ajv from 'ajv';
import sseEventsSchema from '../contracts/sse-events.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(sseEventsSchema);

const event = { type: 'text', content: 'Hello' };
const valid = validate(event);
```
