# 设备台账后端（前后端分离）

## 1) 安装依赖

```bash
cd backend
npm install
```

## 2) 配置环境变量

```bash
cp .env.example .env
```

然后按需修改 `.env`：

- `BES_API_KEY`：百数云 API Key（建议只放后端）
- `BES_BASE_URL`：百数云 OpenAPI 根地址
- `BES_APP_ID` / `BES_ENTRY_ID`：默认应用与表单
- `PORT`：后端端口（默认 `3001`）
- `DEBUG_PROXY`：是否打印代理请求/响应日志（排查新增字段落库问题时可设为 `1`）

## 3) 启动后端

```bash
npm run dev
```

启动后健康检查：

```bash
curl http://localhost:3001/api/health
```

## 4) 启动前端

前端文件在项目根目录 `index.html`。

可直接双击打开，也可用本地静态服务器（推荐）：

```bash
# 在项目根目录执行
python3 -m http.server 5173
```

然后访问：

- `http://localhost:5173/index.html`

页面默认会请求后端代理：`http://localhost:3001/api`。
