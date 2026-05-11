# Day 4: BookNest 上线部署 — CI/CD + 阿里云 + Nginx + HTTPS

> **已弃用**：本文档基于 GitHub-hosted runner + SSH 部署方案。由于 GitHub Actions 计费限制，项目已切换为 **ECS Self-hosted Runner** 方案。请使用新版文档：[`day4-deploy-v2-self-hosted-runner.md`](./day4-deploy-v2-self-hosted-runner.md)。
>
> 本文档保留供参考学习，其中的阿里云 ECS 购买、域名 DNS、Nginx 配置、HTTPS 证书等基础步骤在 v2 中仍然适用。

## 项目简介

今天是 BookNest 进阶阶段的第一天。前三天你在本地完成了一个全栈应用，但只有部署到服务器上，别人才能真正访问。今天你将完成代码从本地到线上的最后一公里：购买云服务器、配置域名、搭建 CI/CD 流水线、部署应用并开启 HTTPS。

**今天的目标**: 让你的 BookNest 应用通过域名 `https://booknest.yourdomain.com` 在公网可访问，且推送代码后自动部署。

---

## 学习目标

完成今天的工作后，你将掌握：

1. **阿里云 ECS** 云服务器购买、安全组、SSH 连接
2. **域名注册** + DNS 解析 + ICP 备案流程
3. **Linux 服务器运维** — 用户管理、防火墙、Docker 安装
4. **Nginx** 反向代理、负载分发、静态资源服务
5. **HTTPS / SSL** — Let's Encrypt 免费证书 + 自动续期
6. **GitHub Actions** CI/CD 流水线 — 自动测试、构建、部署
7. **环境变量管理** — 开发/测试/生产环境分离

---

## 采购清单与预算

### 必须购买的资源

| 资源 | 推荐配置 | 预估费用 | 购买链接/说明 |
|------|----------|----------|-------------|
| 阿里云 ECS | 2核2G，Ubuntu 22.04，40G ESSD | ¥50-100/月 (新用户首年约 ¥99) | [阿里云 ECS](https://www.aliyun.com/product/ecs) |
| 域名 (.com) | 任意可用的 .com 域名 | ¥55-70/年 | [阿里云域名](https://wanwang.aliyun.com/domain/) |
| 域名 (.cn) 替代方案 | 如果 .com 太贵或已被注册 | ¥29-50/年 | 价格更低，同样可用 |

### 免费资源

| 资源 | 说明 | 费用 |
|------|------|------|
| SSL 证书 | Let's Encrypt 免费，Certbot 自动续期 | ¥0 |
| GitHub Actions | 公开仓库无限分钟，私有仓库 2000 分钟/月 | ¥0 |
| Docker CE | 容器运行时 | ¥0 |
| Nginx | 开源 Web 服务器 | ¥0 |

### 总预算

- **首年总成本**: 约 ¥150-200 (服务器首年优惠 + 域名)
- **后续年成本**: 约 ¥600-1200/年

### 重要提示：ICP 备案

中国大陆服务器的域名必须完成 ICP 备案才能对外提供 Web 服务。

| 方案 | 备案周期 | 适合场景 |
|------|----------|----------|
| **方案 A: 正常备案** | 7-20 个工作日 | 有充足时间，提前操作 |
| **方案 B: 香港节点** | 无需备案 | 急着上线，延迟略高 |
| **方案 C: 先用 IP** | 无需备案 | 学习阶段临时用 |

> **推荐**: Day 4 开始前一周就提交 ICP 备案（阿里云控制台有引导流程），不耽误进度。备案期间先用 IP 地址访问。

---

## 技术栈

| 技术 | 用途 |
|------|------|
| 阿里云 ECS | 云服务器 (Ubuntu 22.04 LTS) |
| Docker CE + Docker Compose | 容器化部署 |
| Nginx | 反向代理 + 静态资源 + SSL 终止 |
| Certbot (Let's Encrypt) | 免费 SSL 证书 |
| GitHub Actions | CI/CD 自动化 |
| SSH | 远程服务器管理 |

---

## 前置条件

确保以下内容已就绪：

- [ ] Day 3 的 BookNest 全栈应用可正常运行
- [ ] 代码已推送到 GitHub 仓库
- [ ] 拥有一个阿里云账号 (实名认证已完成)
- [ ] 有一张银行卡/支付宝用于支付

---

## 功能清单

### Must-Have (必做)

| # | 功能 | 说明 |
|---|------|------|
| 1 | ECS 购买与初始化 | 安全组、SSH 密钥、Docker 安装 |
| 2 | 域名注册 + DNS 解析 | A 记录指向 ECS 公网 IP |
| 3 | 服务器环境搭建 | Docker Compose + Nginx + Certbot |
| 4 | Nginx 反向代理 | 前端 → Nginx 静态资源，后端 → 代理到 Express |
| 5 | HTTPS 配置 | Let's Encrypt SSL 证书 + 自动续期 |
| 6 | GitHub Actions CI/CD | 推送 main 分支自动部署 |
| 7 | 环境变量管理 | .env.production 区分生产配置 |
| 8 | 健康检查 & 部署验证 | 部署后自动验证服务可用 |

### Nice-to-Have (加量)

| # | 功能 | 说明 |
|---|------|------|
| 9 | Preview 部署 | PR 自动创建预览环境 |
| 10 | 多环境配置 | dev / staging / production |
| 11 | 服务器监控脚本 | CPU/内存/磁盘告警 |
| 12 | 日志轮转 | 避免日志文件占满磁盘 |

---

## 分步实施指南

### Step 0: 提前准备 — ICP 备案 (开始前 1-2 周)

> 如果选择香港节点或暂时用 IP 访问，可跳过此步。

1. 登录阿里云控制台 → ICP 备案
2. 按引导填写信息：
   - 主体信息：个人/公司信息
   - 网站信息：BookNest 个人藏书管理
   - 上传材料：身份证正反面、人脸核验
3. 提交后等待管局审核 (7-20 个工作日)
4. 备案通过后会收到短信和邮件通知

---

### Step 1: 购买阿里云 ECS (45 分钟)

1. 登录阿里云控制台 → 云服务器 ECS → 创建实例

2. **选择配置**：
   ```
   地域:        华东1 (杭州) 或 华北2 (北京)
   实例规格:    ecs.t6-c1m2.large (2核2G) 或更高
   镜像:        Ubuntu 22.04 LTS 64位
   存储:        40G ESSD Entry (足够学习用)
   网络和安全组: 自动分配公网 IP，带宽选按量付费或 1-5Mbps 固定带宽
   付费模式:    按量付费 (灵活) 或 包年包月 (更便宜)
   ```

3. **安全组配置**（创建时或之后添加规则）：

   | 协议 | 端口范围 | 授权对象 | 说明 |
   |------|----------|----------|------|
   | TCP | 22 | 0.0.0.0/0 | SSH 登录 |
   | TCP | 80 | 0.0.0.0/0 | HTTP |
   | TCP | 443 | 0.0.0.0/0 | HTTPS |
   | TCP | 4000 | 你的IP | 后端 API (调试用，上线后关闭) |

4. **SSH 密钥对**：
   - 创建新密钥对 → 下载 `.pem` 文件 → 保存到 `~/.ssh/booknest-ecs.pem`
   ```bash
   chmod 400 ~/.ssh/booknest-ecs.pem
   ```

5. **连接服务器**：
   ```bash
   ssh -i ~/.ssh/booknest-ecs.pem root@<你的ECS公网IP>
   ```

**正反馈时刻**: SSH 连上服务器，看到 `Welcome to Ubuntu 22.04 LTS` 的欢迎信息。

---

### Step 2: 服务器初始化 (45 分钟)

**在 ECS 上执行以下操作**：

1. **创建部署用户** (不用 root 操作)：
   ```bash
   # 创建用户
   adduser deploy
   usermod -aG sudo deploy

   # 允许 SSH 密钥登录
   mkdir -p /home/deploy/.ssh
   cp ~/.ssh/authorized_keys /home/deploy/.ssh/
   chown -R deploy:deploy /home/deploy/.ssh
   chmod 700 /home/deploy/.ssh
   chmod 600 /home/deploy/.ssh/authorized_keys
   ```

2. **系统更新 + 基础工具**：
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git vim ufw htop
   ```

3. **防火墙配置**：
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw --force enable
   sudo ufw status
   ```

4. **安装 Docker CE**：
   ```bash
   # 官方脚本安装
   curl -fsSL https://get.docker.com | sh

   # 让 deploy 用户可以使用 docker
   sudo usermod -aG docker deploy

   # 安装 Docker Compose
   sudo apt install -y docker-compose-plugin

   # 验证
   docker --version
   docker compose version
   ```

5. **安装 Nginx**：
   ```bash
   sudo apt install -y nginx
   sudo systemctl enable nginx
   sudo systemctl start nginx

   # 验证: 浏览器访问 http://<你的IP> 看到 Nginx 欢迎页
   ```

6. **安装 Certbot**：
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

**正反馈时刻**: 浏览器输入 ECS 公网 IP，看到 Nginx 默认欢迎页。

---

### Step 3: 域名注册 + DNS 解析 (30 分钟)

1. **购买域名**：
   - 阿里云控制台 → 域名注册 → 搜索你想要的域名
   - 推荐格式: `booknest-xxx.com` 或你的名字
   - 完成购买后进入域名管理

2. **DNS 解析配置**：
   - 进入域名管理 → DNS 修改 → 添加记录

   | 记录类型 | 主机记录 | 记录值 | TTL |
   |----------|----------|--------|-----|
   | A | @ | `<ECS公网IP>` | 10分钟 |
   | A | www | `<ECS公网IP>` | 10分钟 |
   | A | booknest | `<ECS公网IP>` | 10分钟 |

   > 这样 `booknest.yourdomain.com` 就会指向你的 ECS。

3. **等待 DNS 生效** (通常 1-10 分钟)：
   ```bash
   # 本地验证 DNS 是否生效
   ping booknest.yourdomain.com
   nslookup booknest.yourdomain.com
   ```

**正反馈时刻**: `ping booknest.yourdomain.com` 返回你 ECS 的公网 IP。

---

### Step 4: Docker Compose 生产配置 (45 分钟)

在项目根目录创建生产环境的 Docker Compose 配置：

1. **`docker-compose.prod.yml`** — 生产环境配置：
   ```yaml
   services:
     postgres:
       image: postgres:16-alpine
       restart: always
       environment:
         POSTGRES_USER: ${DB_USER}
         POSTGRES_PASSWORD: ${DB_PASSWORD}
         POSTGRES_DB: ${DB_NAME}
       volumes:
         - pgdata:/var/lib/postgresql/data
       networks:
         - booknest-internal
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
         interval: 10s
         timeout: 5s
         retries: 5

     backend:
       build:
         context: ./backend
         dockerfile: Dockerfile
       restart: always
       environment:
         DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
         JWT_SECRET: ${JWT_SECRET}
         PORT: 4000
         NODE_ENV: production
       depends_on:
         postgres:
           condition: service_healthy
       networks:
         - booknest-internal
         - booknest-proxy

     frontend:
       build:
         context: ./frontend
         dockerfile: Dockerfile
         args:
           VITE_API_URL: /api/v1
       restart: always
       networks:
         - booknest-proxy

   volumes:
     pgdata:

   networks:
     booknest-internal:
     booknest-proxy:
   ```

2. **`backend/Dockerfile`**:
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npx prisma generate
   RUN npm run build

   FROM node:20-alpine
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/prisma ./prisma
   COPY --from=builder /app/package.json ./
   RUN npx prisma generate

   EXPOSE 4000
   CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
   ```

3. **`frontend/Dockerfile`** — 多阶段构建，输出静态文件：
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   ARG VITE_API_URL=/api/v1
   ENV VITE_API_URL=$VITE_API_URL
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

4. **`frontend/nginx.conf`** — 前端容器内的 Nginx 配置 (SPA 路由)：
   ```nginx
   server {
       listen 80;
       server_name localhost;
       root /usr/share/nginx/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

5. **`.env.production`** — 生产环境变量 (服务器上)：
   ```bash
   DB_USER=booknest
   DB_PASSWORD=<生成一个强密码>
   DB_NAME=booknest
   JWT_SECRET=<生成一个随机字符串>
   DOMAIN=booknest.yourdomain.com
   ```
   生成强密码和密钥：
   ```bash
   openssl rand -base64 32
   ```

**正反馈时刻**: 在服务器上运行 `docker compose -f docker-compose.prod.yml up -d`，所有服务启动成功。

---

### Step 5: Nginx 反向代理 + HTTPS (1 小时)

1. **创建 Nginx 站点配置** — 在 ECS 上 `/etc/nginx/sites-available/booknest`：
   ```nginx
   # HTTP → HTTPS 重定向
   server {
       listen 80;
       server_name booknest.yourdomain.com www.yourdomain.com;
       return 301 https://$host$request_uri;
   }

   # HTTPS 主配置
   server {
       listen 443 ssl http2;
       server_name booknest.yourdomain.com www.yourdomain.com;

       # SSL 证书 (Certbot 会自动填充)
       ssl_certificate /etc/letsencrypt/live/booknest.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/booknest.yourdomain.com/privkey.pem;

       # SSL 安全配置
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_prefer_server_ciphers on;

       # 安全头
       add_header X-Frame-Options DENY;
       add_header X-Content-Type-Options nosniff;
       add_header X-XSS-Protection "1; mode=block";
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

       # Gzip 压缩
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml;
       gzip_min_length 1000;

       # 前端静态资源
       location / {
           proxy_pass http://frontend:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # 后端 API 代理
       location /api/ {
           proxy_pass http://backend:4000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # 超时设置
           proxy_connect_timeout 60s;
           proxy_read_timeout 60s;
       }

       # 健康检查
       location /health {
           proxy_pass http://backend:4000;
       }

       # 上传文件大小限制
       client_max_body_size 10m;
   }
   ```

2. **启用站点配置**：
   ```bash
   sudo ln -s /etc/nginx/sites-available/booknest /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default  # 移除默认站点
   sudo nginx -t  # 检查配置语法
   sudo systemctl reload nginx
   ```

3. **申请 SSL 证书** (需要 DNS 已生效)：
   ```bash
   sudo certbot --nginx -d booknest.yourdomain.com -d www.yourdomain.com
   ```
   按提示操作：
   - 输入邮箱 (用于证书到期提醒)
   - 同意服务条款
   - 选择是否重定向 HTTP → HTTPS (选是)

4. **验证自动续期**：
   ```bash
   sudo certbot renew --dry-run
   ```

**正反馈时刻**: 浏览器访问 `https://booknest.yourdomain.com`，看到小锁图标，应用正常运行。

---

### Step 6: GitHub Actions CI/CD (1.5 小时)

**目标**: 推送代码到 main 分支 → 自动测试 → 自动构建 → 自动部署到 ECS

1. **配置 SSH 密钥** — 用于 GitHub Actions 连接 ECS：
   ```bash
   # 在本地生成部署密钥对
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/booknest-deploy

   # 把公钥添加到 ECS
   ssh-copy-id -i ~/.ssh/booknest-deploy.pub deploy@<ECS_IP>

   # 把私钥添加到 GitHub Secrets
   # GitHub 仓库 → Settings → Secrets and variables → Actions → New secret
   # Name: ECS_SSH_KEY
   # Value: ~/.ssh/booknest-deploy 的内容
   ```

2. **添加更多 GitHub Secrets**：
   | Secret 名称 | 值 | 说明 |
   |-------------|-----|------|
   | `ECS_HOST` | `<ECS公网IP>` | 服务器地址 |
   | `ECS_USER` | `deploy` | SSH 用户 |
   | `ECS_SSH_KEY` | 私钥内容 | SSH 密钥 |
   | `DB_PASSWORD` | 生成的密码 | 数据库密码 |
   | `JWT_SECRET` | 生成的密钥 | JWT 密钥 |

3. **创建 CI/CD 工作流** — `.github/workflows/deploy.yml`：
   ```yaml
   name: Deploy to Production

   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]

   env:
     NODE_VERSION: '20'

   jobs:
     # Job 1: 测试
     test:
       runs-on: ubuntu-latest
       services:
         postgres:
           image: postgres:16-alpine
           env:
             POSTGRES_USER: test
             POSTGRES_PASSWORD: test
             POSTGRES_DB: booknest_test
           ports:
             - 5432:5432
           options: >-
             --health-cmd pg_isready
             --health-interval 10s
             --health-timeout 5s
             --health-retries 5

       steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: ${{ env.NODE_VERSION }}
             cache: 'npm'
             cache-dependency-path: |
               frontend/package-lock.json
               backend/package-lock.json

         - name: Test Backend
           run: |
             cd backend
             npm ci
             npx prisma generate
             npm test
           env:
             DATABASE_URL: postgresql://test:test@localhost:5432/booknest_test
             JWT_SECRET: test-secret

         - name: Test Frontend
           run: |
             cd frontend
             npm ci
             npm run build
             npx vitest run

     # Job 2: 部署 (仅 main 分支)
     deploy:
       needs: test
       if: github.ref == 'refs/heads/main' && github.event_name == 'push'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Deploy to ECS
           uses: appleboy/ssh-action@v1
           with:
             host: ${{ secrets.ECS_HOST }}
             username: ${{ secrets.ECS_USER }}
             key: ${{ secrets.ECS_SSH_KEY }}
             script: |
               cd /home/deploy/booknest

               # 拉取最新代码
               git pull origin main

               # 写入生产环境变量
               cat > .env <<EOF
               DB_USER=booknest
               DB_PASSWORD=${{ secrets.DB_PASSWORD }}
               DB_NAME=booknest
               JWT_SECRET=${{ secrets.JWT_SECRET }}
               DOMAIN=booknest.yourdomain.com
               EOF

               # 重新构建并启动
               docker compose -f docker-compose.prod.yml down
               docker compose -f docker-compose.prod.yml up -d --build

               # 等待服务启动
               sleep 10

               # 健康检查
               curl -f http://localhost:4000/health || exit 1

               # 清理旧镜像
               docker image prune -f

         - name: Verify Deployment
           run: |
             curl -f https://booknest.yourdomain.com/health || exit 1
             echo "Deployment successful!"
   ```

4. **在 ECS 上准备部署目录**：
   ```bash
   ssh deploy@<ECS_IP>
   git clone <你的GitHub仓库地址> ~/booknest
   ```

**正反馈时刻**: 本地修改一行代码 → `git push origin main` → 打开 GitHub Actions 页面看到流水线跑起来 → 2-3 分钟后线上更新了。

---

### Step 7: 生产环境优化 (30 分钟)

1. **Nginx 优化** — 添加到 `/etc/nginx/nginx.conf`：
   ```nginx
   # 开启 gzip
   gzip on;
   gzip_vary on;
   gzip_proxied any;
   gzip_types text/plain text/css application/json application/javascript text/xml;
   gzip_min_length 1000;

   # 连接优化
   client_body_buffer_size 16K;
   client_header_buffer_size 1k;
   client_max_body_size 10m;
   keepalive_timeout 65;
   ```

2. **Docker 日志限制** — `/etc/docker/daemon.json`：
   ```json
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "10m",
       "max-file": "3"
     }
   }
   ```

3. **前端 `.env.production`**:
   ```
   VITE_API_URL=/api/v1
   ```

4. **后端生产环境安全**:
   - 确保 `JWT_SECRET` 足够长 (32+ 字符)
   - 确保 `DATABASE_URL` 使用强密码
   - CORS 配置只允许你的域名

**正反馈时刻**: Lighthouse 评分中 Security 部分全部通过。

---

## 验收标准 Checklist

- [ ] `ssh deploy@<ECS_IP>` 可正常连接
- [ ] `ping booknest.yourdomain.com` 解析到 ECS 公网 IP
- [ ] `http://booknest.yourdomain.com` 自动跳转到 HTTPS
- [ ] `https://booknest.yourdomain.com` 浏览器显示小锁图标
- [ ] 注册新用户、登录、CRUD 书籍全流程正常
- [ ] GitHub 推送 main 分支后，Actions 流水线自动运行
- [ ] Actions 流水线包含测试 + 部署两个阶段
- [ ] 部署完成后 `https://booknest.yourdomain.com/health` 返回 `{"status":"ok"}`
- [ ] 服务器重启后 Docker 容器自动恢复 (`restart: always`)
- [ ] SSL 证书自动续期已配置 (`certbot renew --dry-run` 成功)

---

## 项目目录结构 (新增文件)

```
booknest/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD 流水线
├── frontend/
│   ├── Dockerfile              ← 前端容器构建
│   ├── nginx.conf              ← 前端 Nginx SPA 路由
│   └── .env.production         ← 前端生产变量
├── backend/
│   ├── Dockerfile              ← 后端容器构建
│   └── .env.production         ← 后端生产变量
├── docker-compose.prod.yml     ← 生产环境 Compose
├── docker-compose.yml          ← 开发环境 Compose (Day 3)
├── CLAUDE.md
└── .gitignore
```

---

## Git 工作规范

### 分支策略

```bash
git checkout -b feat/day4-deploy
```

### Commit 示例

```bash
git commit -m "feat: add production Docker Compose configuration"
git commit -m "feat: add Dockerfile for frontend with Nginx"
git commit -m "feat: add Dockerfile for backend with Prisma migrate"
git commit -m "ci: add GitHub Actions deploy workflow"
git commit -m "feat: add Nginx reverse proxy configuration"
git commit -m "docs: add Day 4 deployment guide to CLAUDE.md"
```

### 注意事项

- `.env.production` 绝不能提交到 Git (加入 .gitignore)
- SSH 私钥绝不能提交到 Git
- GitHub Secrets 中存储所有敏感信息

---

## Prompt 模板

### Docker 配置

```
帮我创建后端的 Dockerfile (backend/Dockerfile)，要求:
1. 多阶段构建: node:20-alpine
2. 第一阶段: 安装依赖 + TypeScript 编译 + Prisma generate
3. 第二阶段: 只复制编译产物和必要文件，减小镜像体积
4. 启动命令: 先执行 prisma migrate deploy，再启动 node dist/index.js
5. EXPOSE 4000
```

### Nginx 配置

```
帮我写一个 Nginx 配置文件，作为 BookNest 应用的反向代理:

1. HTTP (80) 自动重定向到 HTTPS (443)
2. 前端静态文件由 frontend 容器提供 (proxy_pass http://frontend:80)
3. 后端 API 由 backend 容器提供 (proxy_pass http://backend:4000)
4. /api/ 路径代理到后端，其他路径代理到前端
5. 添加安全头: X-Frame-Options, X-Content-Type-Options, HSTS
6. 开启 gzip 压缩
7. SSL 使用 Let's Encrypt 证书路径
8. 域名: booknest.yourdomain.com
```

### GitHub Actions

```
帮我创建 GitHub Actions 工作流 (.github/workflows/deploy.yml):

触发条件: push 到 main 分支

Job 1 - test:
- 使用 PostgreSQL 16 service container
- 安装后端依赖，运行后端测试
- 安装前端依赖，运行前端构建和测试

Job 2 - deploy (仅 main 分支触发):
- 使用 appleboy/ssh-action 通过 SSH 连接服务器
- 拉取最新代码
- 使用 docker compose 重新构建和启动服务
- 健康检查验证部署成功

需要的 Secrets: ECS_HOST, ECS_USER, ECS_SSH_KEY, DB_PASSWORD, JWT_SECRET
```

### 调试

```
我的 GitHub Actions 部署步骤失败了，SSH 连接超时。

错误信息:
Error: dial tcp <IP>:22: i/o timeout

可能的原因:
1. ECS 安全组没有开放 22 端口给 GitHub Actions 的 IP
2. SSH 密钥配置不正确

帮我排查，并告诉我如何检查安全组规则和 SSH 密钥配置。
```

---

## Claude Code 使用指南

### 更新 CLAUDE.md

在 repo 根目录的 `CLAUDE.md` 中追加：

```markdown
## Day 4: 部署

### 生产环境
- 阿里云 ECS (Ubuntu 22.04, 2核2G)
- Docker Compose 容器化部署
- Nginx 反向代理 + SSL 终止
- GitHub Actions CI/CD

### 部署命令
- git push origin main — 触发自动部署
- docker compose -f docker-compose.prod.yml up -d — 手动部署
- docker compose -f docker-compose.prod.yml logs -f — 查看日志

### 域名 & HTTPS
- 域名: booknest.yourdomain.com (阿里云 DNS 解析)
- SSL: Let's Encrypt + Certbot 自动续期
- Nginx 配置: /etc/nginx/sites-available/booknest

### 关键文件
- .github/workflows/deploy.yml — CI/CD 流水线
- docker-compose.prod.yml — 生产环境配置
- frontend/Dockerfile — 前端容器
- backend/Dockerfile — 后端容器
- frontend/nginx.conf — SPA 路由配置
```

---

## 每日回顾

Day 4 结束前，回答以下问题：

1. **CI/CD 解决了什么问题？如果没有 CI/CD，每次部署你需要手动做哪些事？**
2. **Nginx 反向代理和直接暴露 Node.js 端口有什么区别？为什么生产环境需要 Nginx？**
3. **HTTPS 证书是怎么工作的？Let's Encrypt 的证书和付费证书有什么区别？**
4. **Docker 多阶段构建的好处是什么？为什么不直接用一个 node 镜像？**
5. **如果线上突然挂了，你会按什么顺序排查？** (提示: Docker → Nginx → DNS → 应用日志)
