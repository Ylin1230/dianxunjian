# 微信扫码发布（相关方入场培训）

## 目标
让相关方通过微信扫一扫直接打开“问卷式 H5 填报页”，无需登录系统。

- 管理页（电脑端）：`/h5/partner-training-admin`
- 外部填报页（微信端）：`/h5/partner-training`

## 已实现的同域结构
后端 `backend/src/server.js` 已支持：

1. 同时托管静态页面（项目根目录）
2. 同时提供 `/api/*` 代理接口
3. 生成微信二维码链接接口：
   - `GET /api/public/entry-links/partner-training`

这样微信访问页面时，页面调用的 `/api` 和页面本身同域，不会跨域。

---

## 方案 A（推荐）：Nginx + 域名（HTTPS）

### 1) 启动 Node 后端
在项目目录执行：

```bash
cd backend
npm i
npm run dev
```

默认监听：`http://127.0.0.1:3001`

### 2) Nginx 配置示例
将域名（例如 `ehs.example.com`）反代到 Node：

```nginx
server {
    listen 80;
    server_name ehs.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ehs.example.com;

    # 证书自行替换
    ssl_certificate     /etc/nginx/ssl/ehs.example.com.pem;
    ssl_certificate_key /etc/nginx/ssl/ehs.example.com.key;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

重载 Nginx：

```bash
sudo nginx -t && sudo nginx -s reload
```

### 3) 二维码链接
上线后直接用：

- 静态入口（推荐张贴）：
  - `https://ehs.example.com/h5/partner-training?from=qr&new=1&source=wechat&mode=static`
- 动态预填单位：
  - `https://ehs.example.com/h5/partner-training?from=qr&new=1&source=wechat&mode=prefill&unit_id=xxx&unit_name=yyy`

---

## 方案 B（临时测试）：内网穿透
如果暂时没有正式域名，可使用临时公网隧道映射到 `3001`，但仅适合测试。

示例（若机器已安装 cloudflared）：

```bash
cloudflared tunnel --url http://127.0.0.1:3001
```

拿到 `https://xxxxx.trycloudflare.com` 后，把二维码目标改为：

- `https://xxxxx.trycloudflare.com/h5/partner-training?...`

---

## 自检清单（微信扫不出内容时）

1. 扫码链接是否为 `https://` 公网地址（不能是 `file://` 或 `localhost`）
2. 手机浏览器能否直接打开该链接
3. 打开后是否能请求成功：`https://你的域名/api/health`
4. 页面下拉“施工单位”是否能加载
5. 提交后底表 `c40d44a99118a61bd17f9325` 是否新增记录

---

## 备注
管理页中“二维码类型=静态/动态”已经是按微信扫码场景设计：

- 静态码：门岗/培训室长期张贴
- 动态码：针对某施工单位预填，减少现场录入
