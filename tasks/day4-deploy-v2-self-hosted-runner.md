# Day 4 v2：BookNest 上线部署方案（备选）
## 基于 ECS Self-hosted Runner 的 CI/CD + Docker Compose + Nginx

> **说明**：本项目仓库已设为 public，GitHub Actions 对公开仓库免费且不限时长。
> 推荐使用主文档 [`day4-deploy.md`](./day4-deploy.md)（GitHub-hosted runner + SSH 部署方案）。
> 本文档作为备选方案，适用于**私有仓库**遇到 GitHub Actions 计费问题时的替代方案。

> 适用项目：`synaptra-ai/zyf_learn` / `booknest`
> 适用阶段：Vibe Coding 学习项目 Day 4 部署阶段
> 版本：v2 — ECS self-hosted runner 本机部署（备选方案）

---

## 0. 什么情况下使用本方案？

主文档 [`day4-deploy.md`](./day4-deploy.md) 采用的是：

```text
GitHub-hosted runner
    ↓
GitHub 虚拟机执行测试
    ↓
appleboy/ssh-action 远程 SSH 到 ECS
    ↓
ECS 拉代码、写 .env、docker compose up
```

这是推荐方案，因为 GitHub Actions 对公开仓库完全免费。但如果遇到以下情况，可以使用本备选方案：

1. **仓库为私有**且不想处理 GitHub Actions 计费问题  
   私有仓库使用 GitHub-hosted runner 会消耗 Actions minutes。如果账户付款失败、额度不足或 spending limit 过低，job 可能根本无法启动。

2. **部署链路有额外 SSH 环节需要简化**  
   GitHub-hosted runner 部署 ECS 时，需要配置 `ECS_HOST`、`ECS_USER`、`ECS_SSH_KEY`等 Secrets。本方案在 ECS 本机运行 runner，省去 SSH 配置。

因此 v2 改为：

```text
GitHub Actions 触发
    ↓
ECS 上的 self-hosted runner 接收 job
    ↓
在 ECS 本机执行测试、构建、部署
    ↓
docker compose 重启生产服务
    ↓
本机和公网健康检查
```

### 这个切换不会降低自动化程度

ECS self-hosted runner 仍然是 GitHub Actions 的一部分。它同样支持：

- push / pull_request 自动触发；
- 自动 checkout 代码；
- 自动安装依赖；
- 自动运行后端测试；
- 自动运行前端构建和测试；
- main 分支 push 后自动部署；
- 部署后自动健康检查。

区别只在于：

```text
GitHub-hosted runner：GitHub 提供执行机器。
ECS self-hosted runner：你自己的 ECS 提供执行机器。
```

### 本项目为什么适合 self-hosted runner？

当前 BookNest 是学习型全栈项目，部署目标本来就是这台阿里云 ECS。把 runner 放在 ECS 上有几个好处：

1. **绕开 GitHub-hosted runner 的 Actions minutes 限制**  
   self-hosted runner 本身不消耗 GitHub-hosted runner 分钟数，成本主要变成你自己的 ECS 成本。

2. **部署链路更短**  
   不再需要 GitHub 虚拟机 SSH 到 ECS。job 已经在 ECS 上，直接执行 `git reset`、`docker compose up` 即可。

3. **更利于理解真实部署环境**  
   你能直接学习 Linux 用户、Docker 权限、Nginx、systemd、日志、端口、健康检查等部署核心知识。

4. **更容易继续排查问题**  
   CI 日志、Docker 日志、Nginx 日志、系统日志都在同一台 ECS 上，定位链路更直接。

---

## 1. v2 总体部署架构

### 1.1 架构图

```text
开发 PC
  │
  │ git push / pull request
  ▼
GitHub Repository
  │
  │ 触发 GitHub Actions workflow
  ▼
ECS Self-hosted Runner
  │
  ├── Test Job
  │     ├── 后端 npm ci
  │     ├── Prisma generate
  │     ├── Prisma migrate deploy 到 CI 测试库
  │     ├── seed 测试数据
  │     └── Jest / Supertest 测试
  │
  ├── Frontend Job
  │     ├── 前端 npm ci
  │     ├── npm run build
  │     └── Vitest 测试
  │
  └── Deploy Job，仅 main 分支 push 执行
        ├── /home/deploy/booknest 拉取 main 最新代码
        ├── 写入生产 .env
        ├── docker compose -f docker-compose.prod.yml up -d --build
        ├── curl localhost:4000/health
        └── curl http://139.224.246.39/health

公网用户
  │
  ▼
ECS Nginx :80/:443
  │
  ├── /          → 127.0.0.1:8080 → frontend container
  ├── /api/      → 127.0.0.1:4000 → backend container
  └── /health    → 127.0.0.1:4000/health
```

### 1.2 本版采用的关键决策

| 决策 | v2 方案 |
|---|---|
| Runner | ECS self-hosted runner |
| 生产服务 | Docker Compose |
| Nginx | 宿主机 Nginx |
| 前端容器暴露端口 | `8080:80` |
| 后端容器暴露端口 | `4000:4000` |
| 生产数据库 | Compose 内部 PostgreSQL |
| CI 测试数据库 | GitHub Actions service container，映射到宿主机 `55432` |
| 部署触发 | push 到 main |
| PR 行为 | 只跑测试，不部署 |
| Secrets | 只保留生产敏感变量，如 `DB_PASSWORD`、`JWT_SECRET` |

---

## 2. 安全注意事项：使用 Self-hosted Runner 必须知道的边界

Self-hosted runner 的能力很强，但安全边界也要更清晰。因为 workflow 的命令是在你自己的 ECS 上执行的，不是在 GitHub 的临时虚拟机上执行的。

### 2.1 不要让不可信代码在生产 ECS 上执行

风险最大的场景是：

```text
陌生人提交 Pull Request
    ↓
PR 中修改 workflow 或测试脚本
    ↓
self-hosted runner 在你的 ECS 上执行恶意命令
```

可能造成：

- 读取服务器上的 `.env`；
- 访问 Docker socket；
- 删除部署目录；
- 读取数据库网络；
- 扫描内网；
- 写入恶意定时任务；
- 破坏 Nginx / Docker / 系统配置。

### 2.2 本项目推荐的安全策略

本项目是学习项目，但仍建议采用以下约束：

1. **仓库保持 private，成员只限可信人员。**
2. **不要开放外部贡献者 PR 自动跑 self-hosted runner。**
3. **deploy job 只允许 main 分支 push 触发。**
4. **PR 只跑 test，不执行生产部署。**
5. **runner 使用 deploy 用户运行，不使用 root。**
6. **deploy 用户只授予必要权限。**
7. **生产 `.env` 由 workflow 写入，绝不提交到 Git。**
8. **GitHub Secrets 只保存必要变量，不保存无关敏感信息。**
9. **不要把数据库、SSH 私钥、云账号密钥写进仓库。**
10. **定期清理 Docker 镜像、构建缓存和日志，防止磁盘被打满。**

### 2.3 生产项目更推荐的升级架构

当前 v2 为学习项目优化。若未来变成正式业务项目，建议升级为：

```text
独立 CI 机器 / GitHub-hosted runner / 云效 Flow
    ↓
构建 Docker 镜像
    ↓
推送到镜像仓库
    ↓
生产 ECS 拉取镜像部署
```

也就是让 CI 机器和生产机器分离。这样更安全，但学习阶段复杂度更高。

---

## 3. 前置条件

确保已经完成：

- [ ] 已有阿里云 ECS，系统建议 Ubuntu 22.04；
- [ ] 可以通过 SSH 登录 ECS；
- [ ] GitHub 仓库中已有 BookNest 项目代码；
- [ ] 项目目录结构大致为：

```text
repo-root/
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       └── e2e.yml
└── booknest/
    ├── backend/
    ├── frontend/
    ├── docker-compose.prod.yml
    ├── docker-compose.yml
    └── ...
```

- [ ] 后端有 Prisma schema；
- [ ] 后端有 Prisma migrations；
- [ ] 后端有 `/health` 接口；
- [ ] 前端可以 `npm run build`；
- [ ] 生产环境准备使用 IP 访问或域名访问。

---

## 4. Step 1：ECS 基础初始化

以下命令在 ECS 上执行。

### 4.1 创建 deploy 用户

如果已经有 deploy 用户，可以跳过创建部分，但仍建议检查权限。

```bash
# 使用 root 登录后执行
adduser deploy
usermod -aG sudo deploy
```

配置 SSH 公钥：

```bash
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chmod 755 /home/deploy
```

验证：

```bash
ssh deploy@139.224.246.39
```

### 4.2 安装基础工具

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git vim ufw htop ca-certificates gnupg lsb-release unzip
```

### 4.3 配置系统防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

阿里云安全组入方向至少开放：

| 端口 | 协议 | 来源 | 用途 |
|---|---|---|---|
| 22 | TCP | 你的固定 IP，学习阶段可临时 0.0.0.0/0 | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 4000 | TCP | 仅你的 IP，调试后关闭 | 后端调试，可选 |

### 4.4 安装 Docker 和 Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
sudo apt install -y docker-compose-plugin
```

重新登录 deploy 用户，让 docker 组权限生效：

```bash
exit
ssh deploy@139.224.246.39
```

验证：

```bash
docker --version
docker compose version
docker ps
```

如果 `docker ps` 提示 permission denied，说明 docker 组权限还没生效，重新登录或重启会话。

### 4.5 安装 Node.js 20

Self-hosted runner 的测试步骤需要 Node 环境。可以依赖 `actions/setup-node@v4`，但在 ECS 上也建议装好 Node 20，便于手动排查。

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node --version
npm --version
```

### 4.6 安装 Nginx 和 Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo nginx -t
```

浏览器访问：

```text
http://139.224.246.39
```

如果能看到 Nginx 默认页，说明 Nginx 工作正常。

---

## 5. Step 2：安装 GitHub Self-hosted Runner

### 5.1 在 GitHub 获取 runner 安装命令

进入 GitHub 仓库：

```text
Settings → Actions → Runners → New self-hosted runner → Linux
```

GitHub 页面会给出类似命令：

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-xxx.tar.gz -L https://github.com/actions/runner/releases/download/...
tar xzf ./actions-runner-linux-x64-xxx.tar.gz
./config.sh --url https://github.com/<owner>/<repo> --token <token>
```

注意：

- token 有时效；
- 不要把 token 发给别人；
- 不要写进仓库；
- 按 GitHub 页面给出的最新命令执行。

### 5.2 在 ECS deploy 用户下安装 runner

```bash
ssh deploy@139.224.246.39
cd /home/deploy
mkdir -p actions-runner
cd actions-runner
```

然后复制 GitHub 页面给出的下载、解压、配置命令。

配置过程中可参考：

```text
Enter the name of the runner group to add this runner to: [press Enter]
Enter the name of runner: ecs-booknest-runner
Enter any additional labels: booknest,ecs,production
Enter name of work folder: [press Enter]
```

建议 runner labels 至少包含：

```text
self-hosted
linux
x64
booknest
production
```

配置成功后，GitHub 页面应显示 runner 为：

```text
Idle
```

### 5.3 安装为 systemd 服务

在 `/home/deploy/actions-runner` 目录下执行：

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

如果状态正常，你会看到 runner 服务处于 running。

### 5.4 验证 runner 权限

```bash
whoami
docker ps
git --version
node --version
npm --version
```

如果 runner 是 deploy 用户安装的，它后续执行 workflow 时也会以 deploy 用户运行。务必确认 deploy 可以执行 Docker。

---

## 6. Step 3：准备服务器项目目录

### 6.1 克隆仓库

在 ECS 上执行：

```bash
cd /home/deploy
git clone git@github.com:synaptra-ai/zyf_learn.git booknest
```

如果你使用 HTTPS：

```bash
git clone https://github.com/synaptra-ai/zyf_learn.git booknest
```

根据你的实际目录，项目路径可能是：

```text
/home/deploy/booknest/booknest
```

检查：

```bash
find /home/deploy/booknest -maxdepth 3 -name "docker-compose.prod.yml" -print
find /home/deploy/booknest -maxdepth 4 -name "package.json" -print
```

如果输出为：

```text
/home/deploy/booknest/booknest/docker-compose.prod.yml
```

说明生产项目根目录是：

```bash
/home/deploy/booknest/booknest
```

后续部署脚本也要使用这个目录。

### 6.2 检查当前 Git 状态

```bash
cd /home/deploy/booknest
git remote -v
git branch
git status
git log --oneline -5
```

确保是正确仓库和正确分支。

---

## 7. Step 4：生产 Docker Compose 配置

建议采用：

```text
宿主机 Nginx
    ↓
前端容器：127.0.0.1:8080
后端容器：127.0.0.1:4000
数据库容器：仅 Docker 内部网络访问
```

### 7.1 docker-compose.prod.yml 推荐版本

在 `booknest/docker-compose.prod.yml`：

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
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
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
    ports:
      - "4000:4000"
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
    ports:
      - "8080:80"
    networks:
      - booknest-proxy

volumes:
  pgdata:

networks:
  booknest-internal:
  booknest-proxy:
```

### 7.2 后端 Dockerfile

在 `booknest/backend/Dockerfile`：

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

### 7.3 前端 Dockerfile

在 `booknest/frontend/Dockerfile`：

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

### 7.4 前端容器内 Nginx 配置

在 `booknest/frontend/nginx.conf`：

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

---

## 8. Step 5：宿主机 Nginx 反向代理

### 8.1 IP 访问版本

如果暂时没有域名，先用 IP 部署。在 ECS 上创建：

```bash
sudo vim /etc/nginx/sites-available/booknest
```

写入：

```nginx
server {
    listen 80;
    server_name 139.224.246.39;

    client_max_body_size 10m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用：

```bash
sudo ln -sf /etc/nginx/sites-available/booknest /etc/nginx/sites-enabled/booknest
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

测试：

```bash
curl -v http://localhost
curl -v http://localhost/health
curl -v http://139.224.246.39/health
```

### 8.2 域名 + HTTPS 版本

域名备案和解析完成后，将 Nginx 的 `server_name` 改成：

```nginx
server_name booknest.yourdomain.com www.yourdomain.com;
```

申请证书：

```bash
sudo certbot --nginx -d booknest.yourdomain.com -d www.yourdomain.com
```

验证续期：

```bash
sudo certbot renew --dry-run
```

---

## 9. Step 6：GitHub Secrets 配置

因为部署 job 已经在 ECS 上执行，不再需要 SSH 到 ECS，所以这些可以不再需要：

```text
ECS_HOST
ECS_USER
ECS_SSH_KEY
```

保留并配置：

| Secret | 用途 |
|---|---|
| `DB_PASSWORD` | 生产 PostgreSQL 密码 |
| `JWT_SECRET` | 生产 JWT 签名密钥 |

进入：

```text
GitHub Repo → Settings → Secrets and variables → Actions → New repository secret
```

建议：

```bash
openssl rand -base64 32
```

分别生成 `DB_PASSWORD` 和 `JWT_SECRET`。

---

## 10. Step 7：Self-hosted Runner 版 deploy.yml

在仓库创建或替换：

```text
.github/workflows/deploy.yml
```

推荐版本：

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
  test:
    runs-on: [self-hosted, linux, x64]

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: booknest_test
        ports:
          - 55432:5432
        options: >-
          --health-cmd "pg_isready -U test -d booknest_test"
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
            booknest/frontend/package-lock.json
            booknest/backend/package-lock.json

      - name: Test Backend
        run: |
          cd booknest/backend
          npm ci
          npx prisma generate
          npx prisma migrate deploy
          npm run prisma:seed
          npm test -- --runInBand
        env:
          DATABASE_URL: postgresql://test:test@localhost:55432/booknest_test
          JWT_SECRET: test-secret
          PORT: 4000
          NODE_ENV: test

      - name: Test Frontend
        run: |
          cd booknest/frontend
          npm ci
          npm run build
          npx vitest run --passWithNoTests
        env:
          VITE_API_URL: http://localhost:4000/api/v1

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: [self-hosted, linux, x64]

    concurrency:
      group: production-deploy
      cancel-in-progress: false

    steps:
      - name: Deploy on ECS
        run: |
          set -e

          echo "=== Deploy started ==="
          whoami
          pwd
          docker --version
          docker compose version

          cd /home/deploy/booknest
          git fetch origin main
          git reset --hard origin/main
          git clean -fd

          cd booknest

          cat > .env <<'ENVEOF'
          DB_USER=booknest
          DB_PASSWORD=${{ secrets.DB_PASSWORD }}
          DB_NAME=booknest
          JWT_SECRET=${{ secrets.JWT_SECRET }}
          DOMAIN=139.224.246.39
          ENVEOF

          docker compose -f docker-compose.prod.yml down
          docker compose -f docker-compose.prod.yml up -d --build

          echo "=== Container status ==="
          docker compose -f docker-compose.prod.yml ps

          echo "=== Backend logs ==="
          docker compose -f docker-compose.prod.yml logs --tail=100 backend

          echo "=== Waiting for backend health ==="
          for i in {1..30}; do
            if curl -f http://localhost:4000/health; then
              echo "Backend healthy"
              break
            fi
            echo "Waiting for backend... $i"
            sleep 2
          done

          curl -f http://localhost:4000/health
          curl -f http://localhost/health

          docker image prune -f

          echo "=== Deploy successful ==="
```

### 10.1 为什么 test job 使用 55432？

生产 Postgres 可能占用宿主机 5432。为了避免 CI 测试数据库与生产服务冲突，CI service container 映射为：

```yaml
ports:
  - 55432:5432
```

所以测试环境变量使用：

```text
DATABASE_URL=postgresql://test:test@localhost:55432/booknest_test
```

### 10.2 为什么后端测试要执行 migrate 和 seed？

`npx prisma generate` 只生成 Prisma Client，不创建数据库表。GitHub Actions 的 PostgreSQL 测试库每次都是空库，所以必须：

```bash
npx prisma migrate deploy
```

如果测试依赖 `test@booknest.com / password123` 等种子数据，还需要：

```bash
npm run prisma:seed
```

否则会出现：

```text
The table public.users does not exist in the current database.
```

或登录测试拿不到 token 的连锁错误。

---

## 11. Step 8：E2E workflow 策略

Self-hosted runner 上运行 E2E 需要特别注意：E2E 会启动后端、前端、PostgreSQL、Redis 等服务，这些服务与生产服务共用同一台 ECS，可能产生端口冲突。

### 11.1 推荐策略：workflow_dispatch 手动触发

初期建议把 `.github/workflows/e2e.yml` 设为手动触发：

```yaml
name: E2E Tests

on:
  workflow_dispatch:
```

这样可以：
- 先把主部署链路跑通
- 避免每次 PR/push 都争抢 ECS 资源
- 在需要时手动触发 E2E 回归

### 11.2 E2E 端口隔离原则

E2E 服务必须使用与生产不同的端口，避免冲突：

| 服务 | 生产端口 | E2E 端口 |
|---|---|---|
| PostgreSQL (CI test) | Docker 内网 5432 | 宿主机 55432 |
| PostgreSQL (E2E) | Docker 内网 5432 | 宿主机 55433 |
| Redis (E2E) | Docker 内网 6379 | 宿主机 6380 |
| Backend (E2E) | 4000 | 4010 |
| Frontend (E2E) | 8080 | 4011 |

### 11.3 后续恢复自动触发

当 ECS 资源充裕或升级配置后，可以把 e2e.yml 改为 PR 自动触发：

```yaml
on:
  pull_request:
    branches: [main]
```

### 11.4 E2E 必须启动的依赖

E2E workflow 必须启动以下服务，否则 Playwright 测试会失败或卡住：

- PostgreSQL service container（端口 55433）
- Redis service container（端口 6380）
- 后端开发服务器（端口 4010）
- 前端开发服务器（端口 4011）
- Playwright Chromium 浏览器

详细的 E2E workflow 配置参见 `tasks/day9-playwright-e2e-ci.md` Step 13。

---

## 12. Step 9：第一次手动部署验证

在 ECS 上先手动部署一次，确保生产服务本身可用。

```bash
cd /home/deploy/booknest/booknest

cat > .env <<'ENVEOF'
DB_USER=booknest
DB_PASSWORD=你的生产数据库密码
DB_NAME=booknest
JWT_SECRET=你的生产JWT密钥
DOMAIN=139.224.246.39
ENVEOF

docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

查看日志：

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 backend
docker compose -f docker-compose.prod.yml logs --tail=100 frontend
docker compose -f docker-compose.prod.yml logs --tail=100 postgres
```

健康检查：

```bash
curl -v http://localhost:4000/health
curl -v http://localhost/health
curl -v http://139.224.246.39/health
```

三条都成功后，再依赖 GitHub Actions 自动部署。

---

## 13. Step 10：触发 CI/CD

在开发 PC 上：

```bash
git status
git add .
git commit -m "ci: switch deployment to ECS self-hosted runner"
git push origin main
```

然后打开：

```text
GitHub Repo → Actions → Deploy to Production
```

你应该看到：

```text
test job → self-hosted runner 上执行
deploy job → push main 时执行
```

如果是 Pull Request：

```text
test job 执行
deploy job skipped
```

这是正确的。

---

## 14. 排查手册

### 14.1 Runner 没有接 job

检查 GitHub 页面：

```text
Settings → Actions → Runners
```

如果 runner 显示 Offline，在 ECS 上执行：

```bash
cd /home/deploy/actions-runner
sudo ./svc.sh status
sudo ./svc.sh start
```

看日志：

```bash
journalctl -u actions.runner* -n 100 --no-pager
```

### 14.2 test job 卡在 PostgreSQL

检查是否端口冲突：

```bash
sudo ss -lntp | grep 55432
docker ps
```

如果 55432 被占用，换一个端口，如 55433，并同步修改 `DATABASE_URL`。

### 14.3 后端测试报 users 表不存在

说明测试库没有执行迁移。确认 workflow 里有：

```bash
npx prisma migrate deploy
```

并确认仓库里提交了：

```text
booknest/backend/prisma/migrations/
```

### 14.4 seed 脚本失败

常见原因：

- `ts-node` 没安装；
- seed 脚本引用路径错误；
- 测试用户重复；
- seed 清表顺序不对。

检查：

```bash
cd booknest/backend
npm run prisma:seed
```

### 14.5 deploy job 没执行

检查 deploy job 条件：

```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

如果是 PR，它被 skipped 是正确的。

### 14.6 deploy job 里 docker 权限错误

报错类似：

```text
permission denied while trying to connect to the Docker daemon socket
```

修复：

```bash
sudo usermod -aG docker deploy
```

然后重启 runner 服务：

```bash
cd /home/deploy/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start
```

### 14.7 curl localhost:4000/health 失败

检查容器：

```bash
cd /home/deploy/booknest/booknest
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend
sudo ss -lntp | grep 4000
```

如果 backend 容器没暴露端口，确认 compose 中有：

```yaml
ports:
  - "4000:4000"
```

### 14.8 curl localhost/health 失败，但 localhost:4000 成功

说明 Nginx 代理有问题：

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo cat /etc/nginx/sites-enabled/booknest
```

重点检查：

```nginx
location /health {
    proxy_pass http://127.0.0.1:4000/health;
}
```

### 14.9 公网访问失败，但 ECS 本机 localhost 成功

检查：

```bash
sudo ufw status
sudo ss -lntp | grep :80
```

再检查阿里云安全组：

```text
80 是否开放给 0.0.0.0/0
443 是否开放给 0.0.0.0/0
```

---

## 15. 验收标准 Checklist

### 基础服务器

- [ ] `ssh deploy@139.224.246.39` 可正常登录；
- [ ] `docker ps` deploy 用户可执行；
- [ ] `docker compose version` 正常；
- [ ] `node --version` 为 20.x；
- [ ] `sudo nginx -t` 正常；
- [ ] 阿里云安全组开放 22、80、443。

### Runner

- [ ] GitHub Settings → Actions → Runners 显示 ECS runner 为 Idle；
- [ ] runner 安装为 systemd 服务；
- [ ] runner 重启后自动在线；
- [ ] runner 用户不是 root；
- [ ] runner 用户可以执行 Docker。

### CI

- [ ] PR 触发 test job；
- [ ] test job 使用 `[self-hosted, linux, x64]`；
- [ ] 后端测试前执行 `npx prisma migrate deploy`；
- [ ] 后端测试前执行必要 seed；
- [ ] 前端 `npm run build` 成功；
- [ ] Vitest 成功或允许 `--passWithNoTests`。

### CD

- [ ] push main 后 deploy job 执行；
- [ ] PR 中 deploy job skipped；
- [ ] deploy job 写入生产 `.env`；
- [ ] `docker compose -f docker-compose.prod.yml up -d --build` 成功；
- [ ] `curl http://localhost:4000/health` 成功；
- [ ] `curl http://localhost/health` 成功；
- [ ] `curl http://139.224.246.39/health` 成功；
- [ ] 浏览器访问 `http://139.224.246.39` 可打开前端页面；
- [ ] 登录、注册、书籍 CRUD 主流程正常。

### 安全

- [ ] `.env` 未提交到 Git；
- [ ] 私钥未提交到 Git；
- [ ] GitHub Secrets 只保存必要变量；
- [ ] 不允许不可信 PR 在 self-hosted runner 上执行；
- [ ] 生产 deploy 只在 main push 触发；
- [ ] 定期清理 Docker 镜像和日志。

---

## 16. 推荐 Git Commit 计划

```bash
git checkout -b ci/self-hosted-runner-deploy

git add .github/workflows/deploy.yml
git commit -m "ci: switch deploy workflow to ECS self-hosted runner"

git add booknest/docker-compose.prod.yml
git commit -m "fix: expose frontend and backend ports for host nginx"

git add docs/day4-deploy-v2-self-hosted-runner.md
git commit -m "docs: add ECS self-hosted runner deployment guide"

git push origin ci/self-hosted-runner-deploy
```

创建 PR 后确认：

```text
test job 运行
deploy job skipped
```

合并到 main 后确认：

```text
test job 运行
deploy job 运行
```

---

## 17. 附录 A：GitHub-hosted runner + SSH 部署与本方案的区别

| 项目 | GitHub-hosted runner + SSH | ECS self-hosted runner |
|---|---|---|
| 执行机器 | GitHub 临时虚拟机 | 你的 ECS |
| 是否消耗 GitHub-hosted minutes | 私有仓库会消耗 | 不消耗 GitHub-hosted minutes |
| 部署方式 | SSH 到 ECS | ECS 本机执行 |
| Secrets | 需要 ECS_HOST、ECS_USER、ECS_SSH_KEY | 通常不需要 SSH secrets |
| 环境干净程度 | 每次新虚拟机 | 长期机器，需要清理 |
| 安全风险 | 相对隔离 | 要防止不可信代码在 ECS 上运行 |
| 学习价值 | 理解远程部署 | 理解 runner、Linux、Docker、本机部署 |
| 本项目推荐度 | 可选 | 推荐 |

---

## 18. 附录 B：官方参考资料

- GitHub Docs：GitHub Actions billing and usage  
  https://docs.github.com/en/actions/concepts/billing-and-usage

- GitHub Docs：About billing for GitHub Actions  
  https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions

- GitHub Docs：Self-hosted runners  
  https://docs.github.com/actions/hosting-your-own-runners

- GitHub Docs：Choosing the runner for a job  
  https://docs.github.com/actions/using-jobs/choosing-the-runner-for-a-job

- GitHub Docs：GitHub-hosted runners  
  https://docs.github.com/actions/using-github-hosted-runners/about-github-hosted-runners

---

## 19. 学习回顾问题

Day 4 v2 完成后，建议回答：

1. GitHub-hosted runner 和 self-hosted runner 的核心差异是什么？
2. 为什么 self-hosted runner 不等于手动部署？
3. 为什么生产部署不应该在 PR 里执行？
4. 为什么 CI 测试数据库要执行 `prisma migrate deploy`？
5. 为什么 `npx prisma generate` 不能替代数据库迁移？
6. 宿主机 Nginx 为什么要代理到 `127.0.0.1:8080` 和 `127.0.0.1:4000`？
7. 如果线上挂了，你会按什么顺序排查：GitHub Actions、runner、Docker、backend logs、Nginx、阿里云安全组？
8. 如果未来把这个项目做成正式业务系统，你会如何把 CI 机器和生产机器拆开？

