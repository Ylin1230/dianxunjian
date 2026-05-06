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

### 点检任务底表存储模式

点检任务底表支持通过环境变量切换数据源，连接信息不要写死到代码里：

- `TASK_STORE_MODE=bes`：默认模式，继续读写百数云点检任务底表。
- `TASK_STORE_MODE=dual`：任务生成/报工状态更新同时写入百数云和 MySQL，读取仍走百数云。建议先用此模式观察一段时间。
- `TASK_STORE_MODE=db`：点检任务生成、读取、状态更新全部走 MySQL。

MySQL 连接配置：

```env
DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=inspection
DB_USER=root
DB_PASSWORD=
DB_POOL_MAX=10
TASK_DB_TABLE=inspection_task_base
```

从本地数据库切换到服务器数据库时，只需要修改 `.env` 中的 `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` 并重启后端。

首次切换前建议先回填一次历史任务：

```bash
cd backend
npm run backfill:tasks -- --dry-run
npm run backfill:tasks
```

回填完成后先使用 `TASK_STORE_MODE=dual` 观察一段时间，确认 MySQL 与百数云任务数量一致，再切换到 `TASK_STORE_MODE=db`。

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
