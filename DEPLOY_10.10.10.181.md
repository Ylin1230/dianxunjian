# 10.10.10.181 部署说明

## 先说结论

`10.10.10.181` 是内网 IP。

- 如果手机和服务器在同一个局域网/Wi-Fi，下发二维码地址为 `http://10.10.10.181/...`，通常可以访问。
- 如果相关方用自己的微信在外网扫码，`10.10.10.181` 这个地址访问不到，必须再做公网发布：
  - 公网 IP + 端口映射
  - 或公司域名 + Nginx + HTTPS
  - 或临时内网穿透

当前项目已经支持：

- 管理页：`/h5/partner-training-admin`
- 微信填写页：`/h5/partner-training`
- API：`/api/*`

## 一、把项目传到服务器

假设服务器可 SSH 登录，用户名是 `root`，项目准备放到 `/opt/inspection`。

在你本机执行：

```bash
scp -r "/Users/yg/Desktop/项目文件/点巡检" root@10.10.10.181:/opt/inspection
```

如果服务器用户名不是 `root`，把上面的用户名换掉即可。

上传后登录服务器：

```bash
ssh root@10.10.10.181
```

## 二、服务器安装 Node.js

项目要求 Node `>=18`。

如果服务器是 Ubuntu / Debian，可执行：

```bash
apt update
apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

确认 `node -v` 至少是 `18`。

## 三、配置后端环境变量

进入后端目录：

```bash
cd /opt/inspection/backend
```

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env`，至少确认这些值：

```env
HOST=0.0.0.0
PORT=3001
BES_BASE_URL=https://ahyg.online-office.net/openapi/v1
BES_APP_ID=5a94c4d1642bd8a84c772356
BES_ENTRY_ID=38104b6c9d74ce86a7c395b6
BES_API_KEY=你的百数云Key
CORS_ORIGIN=*
DEBUG_PROXY=0
FRONTEND_ROOT=/opt/inspection
```

说明：

- `BES_API_KEY` 必须换成你线上可用的真实 Key。
- `FRONTEND_ROOT=/opt/inspection` 是为了让后端直接托管项目根目录里的 HTML 页面。
- `HOST=0.0.0.0` 是为了让局域网内其他设备也能访问，不只服务器本机可访问。

## 四、安装依赖并启动

在 `/opt/inspection/backend` 目录执行：

```bash
npm install
npm start
```

启动成功后，理论上会监听：

```text
http://0.0.0.0:3001
```

你可以本机自检：

```bash
curl http://127.0.0.1:3001/api/health
```

还可以检查页面：

```bash
curl http://127.0.0.1:3001/h5/partner-training
curl http://127.0.0.1:3001/h5/partner-training-admin
```

再检查监听地址：

```bash
ss -lntp | grep 3001
```

理想结果里应看到类似：

```text
0.0.0.0:3001
```

## 五、先按“内网可访问”方式用起来

如果你的手机和服务器在同一内网，可以先直接测试：

- 微信填写页：
  - `http://10.10.10.181:3001/h5/partner-training`
- 管理页：
  - `http://10.10.10.181:3001/h5/partner-training-admin`

如果你要生成二维码，先用这个地址验证：

```text
http://10.10.10.181:3001/h5/partner-training?from=qr&new=1&source=wechat&mode=static
```

注意：

- 这种方式通常只适合同一局域网内测试。
- 不建议长期把 `3001` 端口直接暴露给用户。

## 六、推荐正式方式：Nginx 反向代理

### 1) 安装 Nginx

Ubuntu / Debian：

```bash
apt install -y nginx
```

### 2) 写配置

创建配置文件：

```bash
nano /etc/nginx/sites-available/inspection
```

填入：

```nginx
server {
    listen 80;
    server_name 10.10.10.181;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

启用配置：

```bash
ln -sf /etc/nginx/sites-available/inspection /etc/nginx/sites-enabled/inspection
nginx -t
systemctl restart nginx
systemctl enable nginx
```

然后访问：

- `http://10.10.10.181/h5/partner-training`
- `http://10.10.10.181/h5/partner-training-admin`

这样比直接暴露 `3001` 更稳。

### 3) 如果 Mac 仍然访问不到

先在服务器上检查防火墙：

```bash
ufw status
```

如果启用了 `ufw`，放行端口：

```bash
ufw allow 3001/tcp
ufw allow 80/tcp
```

然后再从你 Mac 测：

```bash
curl http://10.10.10.181:3001/api/health
curl http://10.10.10.181/h5/partner-training
```

如果还是不通，就要检查虚拟机网络模式。常见问题是虚拟机用了 `NAT`，导致宿主机和局域网设备访问不到来宾机的 `10.10.10.181`。这时要改成：

- `桥接网卡`
- 或 `Host-Only + 端口映射`

## 七、后台常驻运行

推荐用 `systemd`，避免 SSH 退出后服务停止。

创建服务文件：

```bash
nano /etc/systemd/system/inspection-backend.service
```

写入：

```ini
[Unit]
Description=Inspection Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/inspection/backend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=FRONTEND_ROOT=/opt/inspection

[Install]
WantedBy=multi-user.target
```

启动并设为开机自启：

```bash
systemctl daemon-reload
systemctl enable inspection-backend
systemctl restart inspection-backend
systemctl status inspection-backend
```

查看日志：

```bash
journalctl -u inspection-backend -f
```

## 八、如果要“外部微信扫码”真正可用

这里是关键：`10.10.10.181` 本身不是公网地址。

所以要让外部相关方扫码可访问，必须再做下面其中一种：

### 方案 A：公司有公网域名

比如：

```text
https://ehs.your-company.com/h5/partner-training
```

做法：

1. 域名解析到公司公网出口
2. 路由器 / 防火墙把 `80/443` 转发到 `10.10.10.181`
3. Nginx 配 HTTPS 证书

### 方案 B：临时测试，内网穿透

如果只是临时测试，可以在服务器上跑：

```bash
cloudflared tunnel --url http://127.0.0.1:3001
```

然后它会给你一个公网 `https://xxxxx.trycloudflare.com`

这时二维码链接就换成：

```text
https://xxxxx.trycloudflare.com/h5/partner-training?from=qr&new=1&source=wechat&mode=static
```

## 九、最终二维码地址怎么写

### 内网测试二维码

```text
http://10.10.10.181/h5/partner-training?from=qr&new=1&source=wechat&mode=static
```

### 外网正式二维码

```text
https://你的域名/h5/partner-training?from=qr&new=1&source=wechat&mode=static
```

### 动态预填单位二维码

```text
https://你的域名/h5/partner-training?from=qr&new=1&source=wechat&mode=prefill&unit_id=单位ID&unit_name=单位名称
```

## 十、上线后按这个顺序排查

1. 服务器本机能否 `curl http://127.0.0.1:3001/api/health`
2. 局域网电脑能否打开 `http://10.10.10.181/h5/partner-training`
3. 手机连同一 Wi-Fi 能否打开 `http://10.10.10.181/h5/partner-training`
4. 页面里“施工单位”下拉是否能加载
5. 提交后百数云培训底表是否新增数据
6. 如果外网扫码失败，优先检查是不是还在用内网地址
