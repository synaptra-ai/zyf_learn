# Day 5: BookNest 云服务器安全 — 网络防护 + 系统加固 + 备份恢复

## 项目简介

昨天你把应用部署到了阿里云 ECS，但一台裸奔的云服务器就像一扇没锁的门 — 互联网上每分钟都有自动化扫描器在探测漏洞。今天你将系统性地学习云服务器安全：从网络层防护到系统加固，从入侵检测到灾难恢复，让服务器从"能用"变成"安全可靠"。

**今天的目标**: 建立完整的安全防线，即使遭到攻击也能快速恢复。

---

## 学习目标

完成今天的工作后，你将掌握：

1. **阿里云安全组** — 最小权限原则、分层隔离
2. **VPC 专有网络** — 私有子网、公网隔离、网络 ACL
3. **SSH 安全加固** — 禁用密码、限制 root、fail2ban 防暴力破解
4. **Linux 系统加固** — 自动更新、文件权限、审计日志
5. **Nginx 安全** — 隐藏版本号、安全头、防恶意爬虫
6. **应用层安全** — SQL 注入防护、XSS 防护、CORS 策略
7. **备份与恢复** — 数据库自动备份、快照策略、灾难恢复演练
8. **安全审计** — 入侵检测、日志分析、漏洞扫描

---

## 安全体系全景图

```
互联网
  │
  ├── 第 1 层: DDoS 防护 (阿里云免费基础防护)
  │
  ├── 第 2 层: 安全组 (只开放必要端口)
  │
  ├── 第 3 层: VPC 网络 (数据库不暴露公网)
  │
  ├── 第 4 层: Nginx (WAF 规则、安全头、限流)
  │
  ├── 第 5 层: 应用层 (输入验证、CORS、JWT 安全)
  │
  ├── 第 6 层: 系统层 (SSH 加固、fail2ban、文件权限)
  │
  └── 第 7 层: 数据层 (备份、加密、审计)
```

---

## 技术栈

| 技术 | 用途 |
|------|------|
| 阿里云安全组 | 网络层端口访问控制 |
| 阿里云 VPC | 专有网络隔离 |
| fail2ban | SSH 暴力破解防护 |
| UFW | 本地防火墙 |
| Nginx 安全配置 | Web 层防护 |
| Let's Encrypt | HTTPS 加密 (Day 4 已完成) |
| pg_dump / 阿里云快照 | 数据备份 |
| Lynis | 系统安全审计 |

---

## 前置条件

确保以下内容已就绪：

- [ ] Day 4 的部署已完成，应用通过 HTTPS 可访问
- [ ] SSH 可连接到 ECS 服务器
- [ ] Docker + Nginx + PostgreSQL 运行正常

---

## 功能清单

### Must-Have (必做)

| # | 功能 | 说明 |
|---|------|------|
| 1 | 安全组加固 | 最小权限原则，只开放必要端口和 IP |
| 2 | SSH 加固 | 禁用密码登录、禁用 root SSH、改端口 |
| 3 | fail2ban | 自动封禁暴力破解 IP |
| 4 | 系统自动更新 | unattended-upgrades 自动安装安全补丁 |
| 5 | Nginx 安全头 | 隐藏版本号、添加安全响应头 |
| 6 | 数据库备份 | 每日自动备份 PostgreSQL + 保留 7 天 |
| 7 | 服务器快照 | 阿里云自动快照策略 |
| 8 | 安全审计 | Lynis 扫描 + 修复高风险项 |

### Nice-to-Have (加量)

| # | 功能 | 说明 |
|---|------|------|
| 9 | VPC 网络隔离 | 数据库放私有子网，只通过内网访问 |
| 10 | WAF 规则 | Nginx 层面防 SQL 注入、XSS |
| 11 | 端口敲门 | SSH 端口不暴露，需先"敲门"才开放 |
| 12 | 入侵检测 | 文件完整性监控 (AIDE) |
| 13 | 日志审计 | auditd 记录关键系统操作 |
| 14 | 灾难恢复演练 | 模拟服务器挂掉，从备份恢复 |

---

## 分步实施指南

### Step 1: 安全组加固 (45 分钟)

**目标**: 收紧安全组规则，只开放绝对必要的访问

1. **审查现有规则** — 登录阿里云控制台 → ECS → 安全组:

   先查看当前规则，找出过宽的配置。常见问题：

   | 问题 | 风险 |
   |------|------|
   | 所有端口对 0.0.0.0/0 开放 | 任何人可尝试连接任意服务 |
   | 数据库端口 (5432/6379) 对公网开放 | 数据库可直接被扫描攻击 |
   | SSH (22) 对全网开放 | 暴力破解的主要目标 |

2. **重建安全组规则** — 按最小权限原则：

   | 协议 | 端口 | 来源 | 用途 | 说明 |
   |------|------|------|------|------|
   | TCP | 22 | 你的办公 IP/32 | SSH | 只允许你的 IP 连接 |
   | TCP | 80 | 0.0.0.0/0 | HTTP | 用于 Let's Encrypt 验证和重定向 |
   | TCP | 443 | 0.0.0.0/0 | HTTPS | 网站访问 |
   | ICMP | -1 | 0.0.0.0/0 | Ping | 可选，调试用 |
   | **全部** | **-1** | **安全组内网** | **内网互通** | Docker 容器间通信 |

   **删除以下规则** (如果存在):
   - ❌ 4000 端口对外 (后端 API 只通过 Nginx 代理)
   - ❌ 5432/5433 端口对外 (PostgreSQL 只本机访问)
   - ❌ 6379 端口对外 (Redis 只本机访问)

3. **获取你的公网 IP**:
   ```bash
   # 在本地执行
   curl ifconfig.me
   # 输出如: 123.45.67.89
   ```
   将这个 IP 填入 SSH 规则的来源。

   > 如果你的 IP 经常变化 (如在家办公)，可以放宽为你的运营商 IP 段，如 `123.45.67.0/24`。

4. **出方向规则** — 保持默认 (允许所有出站):
   | 协议 | 端口 | 目的地 | 用途 |
   |------|------|--------|------|
   | 全部 | -1 | 0.0.0.0/0 | 系统更新、API 调用、Docker 拉镜像 |

**正反馈时刻**: 安全组规则收紧后，从其他网络 SSH 连接被拒绝 (超时)，只有你的 IP 能连上。

---

### Step 2: SSH 安全加固 (45 分钟)

**目标**: 让 SSH 成为铜墙铁壁

1. **创建 SSH 配置文件** — 在本地 `~/.ssh/config`:
   ```
   Host booknest
       HostName <ECS公网IP>
       User deploy
       Port 22
       IdentityFile ~/.ssh/booknest-ecs.pem
       ServerAliveInterval 60
       ServerAliveCountMax 3
   ```
   之后只需 `ssh booknest` 即可连接。

2. **修改 SSH 服务配置** — 在 ECS 上编辑 `/etc/ssh/sshd_config`:
   ```bash
   sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
   sudo vim /etc/ssh/sshd_config
   ```

   修改以下配置项:
   ```bash
   # 禁止 root 直接 SSH 登录
   PermitRootLogin no

   # 禁止密码登录 (只能用密钥)
   PasswordAuthentication no
   ChallengeResponseAuthentication no
   PubkeyAuthentication yes

   # 限制可登录的用户
   AllowUsers deploy

   # 空闲超时断开 (5 分钟无操作)
   ClientAliveInterval 300
   ClientAliveCountMax 2

   # 限制认证尝试次数
   MaxAuthTries 3

   # 禁用不需要的认证方式
   UsePAM yes
   X11Forwarding no
   PrintMotd no

   # 日志级别
   LogLevel VERBOSE
   ```

3. **重启 SSH 服务**:
   ```bash
   sudo systemctl restart sshd
   ```

   > **重要**: 改完后不要关闭当前 SSH 窗口！先开一个新终端测试能否连接。如果连不上，还有旧窗口可以回滚。

4. **验证**:
   ```bash
   # 在本地新终端测试密钥登录
   ssh booknest

   # 验证密码登录已被禁止 (应该被拒绝)
   ssh deploy@<ECS_IP> -o PubkeyAuthentication=no
   # 应该显示: Permission denied (publickey)
   ```

**正反馈时刻**: 密码登录方式被完全拒绝，只有你的密钥能连上。

---

### Step 3: fail2ban 防暴力破解 (30 分钟)

**目标**: 自动封禁连续登录失败的 IP

1. **安装 fail2ban**:
   ```bash
   sudo apt install -y fail2ban
   ```

2. **配置 fail2ban** — `/etc/fail2ban/jail.local`:
   ```ini
   [DEFAULT]
   # 封禁时间: 1 小时
   bantime = 3600
   # 检测时间窗口: 10 分钟
   findtime = 600
   # 最大失败次数
   maxretry = 3
   # 封禁动作: iptables
   banaction = iptables-multiport
   # 通知邮箱 (可选)
   # destemail = your@email.com
   # sendername = Fail2Ban BookNest

   [sshd]
   enabled = true
   port = ssh
   filter = sshd
   logpath = /var/log/auth.log
   maxretry = 3
   bantime = 7200

   [nginx-http-auth]
   enabled = true
   filter = nginx-http-auth
   port = http,https
   logpath = /var/log/nginx/error.log

   [nginx-botsearch]
   enabled = true
   port = http,https
   filter = nginx-botsearch
   logpath = /var/log/nginx/access.log
   maxretry = 5
   ```

3. **启动 fail2ban**:
   ```bash
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

4. **查看状态**:
   ```bash
   # 查看被封禁的 IP
   sudo fail2ban-client status sshd

   # 手动解封 IP
   sudo fail2ban-client set sshd unbanip 1.2.3.4

   # 查看日志
   sudo tail -f /var/log/fail2ban.log
   ```

**正反馈时刻**: 故意输错 3 次密码后，IP 被自动封禁 2 小时，`fail2ban-client status sshd` 显示你的 IP 在封禁列表中。

---

### Step 4: 系统自动更新 + 文件权限 (30 分钟)

**目标**: 系统安全补丁自动安装，关键文件权限正确

1. **配置自动安全更新**:
   ```bash
   sudo apt install -y unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

   编辑 `/etc/apt/apt.conf.d/50unattended-upgrades`:
   ```
   Unattended-Upgrade::Allowed-Origins {
       "${distro_id}:${distro_codename}-security";
       "${distro_id}ESMApps:${distro_codename}-apps-security";
       "${distro_id}ESM:${distro_codename}-infra-security";
   };

   // 自动清理下载缓存
   Unattended-Upgrade::Remove-Unused-Dependencies "true";

   // 需要重启时自动重启 (可选)
   Unattended-Upgrade::Automatic-Reboot "true";
   Unattended-Upgrade::Automatic-Reboot-Time "03:00";
   ```

2. **关键文件权限检查**:
   ```bash
   # SSH 相关
   sudo chmod 700 ~/.ssh
   sudo chmod 600 ~/.ssh/authorized_keys

   # 应用配置 (含密码)
   chmod 600 /home/deploy/booknest/.env
   chmod 600 /home/deploy/booknest/.env.production

   # Docker 相关
   # Docker socket 不应对非 root 开放 (检查)
   ls -la /var/run/docker.sock
   # 应该是: srw-rw---- root docker
   ```

3. **设置登录欢迎信息 + 安全提示** — `/etc/motd`:
   ```
   ==========================================
   BookNest Production Server
   ==========================================
   - 仅授权人员可访问此服务器
   - 所有操作将被记录和审计
   - 如有疑问请联系管理员
   ==========================================
   ```

**正反馈时刻**: `sudo unattended-upgrades --dry-run` 显示系统将自动安装安全更新。

---

### Step 5: Nginx 安全加固 (45 分钟)

**目标**: Web 层面的安全防护

1. **隐藏版本号 + 安全头** — 在 `/etc/nginx/nginx.conf` 的 `http` 块中:
   ```nginx
   http {
       # 隐藏 Nginx 版本号
       server_tokens off;

       # 全局安全头
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;
       add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.aliyuncs.com; connect-src 'self' wss: https:;" always;
       add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

       # ... 其他配置
   }
   ```

2. **防恶意请求** — 在站点配置 `/etc/nginx/sites-available/booknest`:
   ```nginx
   server {
       # ... 已有配置

       # 封禁常见攻击路径
       location ~ /\.(git|svn|env) {
           deny all;
           return 404;
       }

       # 封禁可疑 User-Agent
       if ($http_user_agent ~* (sqlmap|nikto|nmap|masscan|dirbuster)) {
           return 403;
       }

       # 封禁常见恶意路径
       location ~* ^/(wp-admin|wp-login|phpmyadmin|admin|xmlrpc) {
           return 444;  # Nginx 特殊状态码: 直接断开连接
       }

       # 限制请求方法 (只允许 GET/POST/PUT/DELETE/HEAD)
       if ($request_method !~ ^(GET|POST|PUT|DELETE|HEAD|OPTIONS)$ ) {
           return 405;
       }

       # 限制大请求体 (已在 Day 4 配置，确认一下)
       client_max_body_size 10m;

       # 超时设置
       client_body_timeout 12;
       client_header_timeout 12;
       send_timeout 10;
   }
   ```

3. **日志格式增强** — 记录更多信息用于安全分析:
   ```nginx
   log_format security '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent" '
                        'rt=$request_time';

   access_log /var/log/nginx/booknest.access.log security;
   error_log /var/log/nginx/booknest.error.log warn;
   ```

4. **测试并重载**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **验证安全头**:
   ```bash
   curl -I https://booknest.yourdomain.com

   # 应该看到:
   # server: nginx                    ← 没有版本号
   # x-frame-options: SAMEORIGIN
   # x-content-type-options: nosniff
   # strict-transport-security: max-age=31536000
   ```

**正反馈时刻**: `curl -I` 响应头中看不到 Nginx 版本号，所有安全头正确返回。访问 `/wp-admin` 被直接断开连接。

---

### Step 6: 应用层安全检查 (30 分钟)

**目标**: 确保 Express 应用本身没有安全漏洞

1. **输入验证审计** — 确认所有用户输入都经过验证:
   ```typescript
   // 已有的 express-validator 规则审查
   // 确保:
   // - 所有写接口 (POST/PUT/DELETE) 都有 validate 中间件
   // - 字符串输入有长度限制
   // - 数字输入有范围限制
   ```

2. **CORS 策略收紧** — `src/server.ts`:
   ```typescript
   import cors from 'cors'

   const corsOptions = {
     origin: (origin, callback) => {
       const allowed = [
         'https://booknest.yourdomain.com',
         'https://www.yourdomain.com',
         // 开发环境
         ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:4001'] : []),
       ]
       if (!origin || allowed.includes(origin)) {
         callback(null, true)
       } else {
         callback(new Error('Not allowed by CORS'))
       }
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization'],
   }

   app.use(cors(corsOptions))
   ```

3. **Helmet 安全头** — 确认 helmet 配置:
   ```typescript
   import helmet from 'helmet'

   app.use(helmet({
     contentSecurityPolicy: false,  // 由 Nginx 管理
     crossOriginEmbedderPolicy: false,
   }))
   ```

4. **JWT 安全检查**:
   ```typescript
   // 确认 JWT 配置:
   // - secret 足够长 (32+ 字符)
   // - 有过期时间
   // - 不在 JWT 中存储敏感信息

   const token = jwt.sign(
     { userId: user.id, email: user.email },  // 只存必要的
     process.env.JWT_SECRET!,
     { expiresIn: '7d' }                       // 设置过期
   )
   ```

5. **依赖安全审计**:
   ```bash
   cd backend
   npm audit
   npm audit fix     # 自动修复可修复的漏洞

   cd ../frontend
   npm audit
   npm audit fix
   ```

**正反馈时刻**: `npm audit` 显示 0 个漏洞 (或只有低风险项)。

---

### Step 7: 数据库自动备份 (45 分钟)

**目标**: 数据永不丢失，7 天内可恢复任意时间点

1. **创建备份脚本** — `/home/deploy/scripts/backup-db.sh`:
   ```bash
   #!/bin/bash
   set -euo pipefail

   # 配置
   BACKUP_DIR="/home/deploy/backups/postgres"
   DAYS_TO_KEEP=7
   DATE=$(date +%Y%m%d_%H%M%S)
   CONTAINER_NAME="booknest-postgres-1"  # Docker 容器名

   # 创建备份目录
   mkdir -p "$BACKUP_DIR"

   # 执行备份 (通过 Docker exec)
   docker exec "$CONTAINER_NAME" pg_dump \
     -U booknest \
     -F c \
     -f "/tmp/backup_${DATE}.dump" \
     booknest

   # 从容器中复制出来
   docker cp "$CONTAINER_NAME:/tmp/backup_${DATE}.dump" \
     "$BACKUP_DIR/backup_${DATE}.dump"

   # 清理容器内的临时文件
   docker exec "$CONTAINER_NAME" rm "/tmp/backup_${DATE}.dump"

   # 删除过期备份
   find "$BACKUP_DIR" -name "backup_*.dump" -mtime +$DAYS_TO_KEEP -delete

   # 记录日志
   echo "[$(date)] Backup completed: backup_${DATE}.dump (size: $(du -h "$BACKUP_DIR/backup_${DATE}.dump" | cut -f1))" \
     >> /home/deploy/backups/backup.log
   ```

   设置权限:
   ```bash
   chmod +x /home/deploy/scripts/backup-db.sh
   mkdir -p /home/deploy/backups/postgres
   ```

2. **测试备份**:
   ```bash
   /home/deploy/scripts/backup-db.sh
   ls -la /home/deploy/backups/postgres/
   # 应该看到一个新的 .dump 文件
   ```

3. **设置定时任务** — `crontab -e`:
   ```
   # 每天凌晨 3 点自动备份
   0 3 * * * /home/deploy/scripts/backup-db.sh >> /home/deploy/backups/backup.log 2>&1
   ```

4. **验证恢复流程** — 创建恢复脚本 `/home/deploy/scripts/restore-db.sh`:
   ```bash
   #!/bin/bash
   set -euo pipefail

   if [ -z "$1" ]; then
     echo "Usage: $0 <backup_file.dump>"
     echo "Available backups:"
     ls -la /home/deploy/backups/postgres/
     exit 1
   fi

   BACKUP_FILE="$1"
   CONTAINER_NAME="booknest-postgres-1"

   echo "WARNING: This will REPLACE the current database!"
   echo "Backup file: $BACKUP_FILE"
   read -p "Continue? (yes/no): " confirm

   if [ "$confirm" != "yes" ]; then
     echo "Aborted."
     exit 0
   fi

   # 复制备份文件到容器
   docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/tmp/restore.dump"

   # 恢复数据
   docker exec "$CONTAINER_NAME" pg_restore \
     -U booknest \
     -d booknest \
     --clean \
     --if-exists \
     "/tmp/restore.dump"

   # 清理
   docker exec "$CONTAINER_NAME" rm "/tmp/restore.dump"

   echo "Restore completed from: $BACKUP_FILE"
   ```

   ```bash
   chmod +x /home/deploy/scripts/restore-db.sh
   ```

**正反馈时刻**: 运行备份脚本后，`/home/deploy/backups/postgres/` 出现 dump 文件，大小和数据库匹配。

---

### Step 8: 阿里云快照策略 (20 分钟)

**目标**: 整机级别的备份，可一键恢复到任意时间点

1. **创建自动快照策略**:
   - 阿里云控制台 → ECS → 存储与快照 → 自动快照策略
   - 创建策略:
     - 名称: `booknest-daily`
     - 重复周期: 每天
     - 执行时间: 04:00 (数据库备份之后)
     - 保留时间: 7 天
     - 跨地域复制: 可选 (更安全)

2. **绑定到 ECS 磁盘**:
   - ECS → 实例 → 选择你的实例 → 磁盘
   - 选择系统盘 → 设置自动快照策略 → 选择 `booknest-daily`

3. **手动创建快照** (首次):
   - 磁盘 → 创建快照
   - 名称: `booknest-init-$(date +%Y%m%d)` (初始状态快照)
   - 描述: "部署完成后的初始状态"

**正反馈时刻**: 快照列表中看到自动创建的快照，随时可以回滚到这个时间点。

---

### Step 9: 安全审计 (30 分钟)

**目标**: 全面扫描系统安全状态，修复高风险项

1. **安装并运行 Lynis**:
   ```bash
   sudo apt install -y lynis
   sudo lynis audit system
   ```

2. **查看报告**:
   ```bash
   # 报告会给出分数和建议
   # 重点关注:
   # - [WARNING] 项 (需要修复)
   # - [SUGGESTION] 项 (建议优化)
   ```

3. **常见需修复的项**:

   | 项目 | 修复方法 |
   |------|----------|
   | Boot loader 不受保护 | `sudo chmod 600 /boot/grub/grub.cfg` |
   | 密码策略未配置 | 安装 libpam-pwquality |
   | 自动登出未设置 | 在 `/etc/profile.d/` 添加 `TMOUT=300` |
   | 内核参数需调优 | sysctl 配置 |

4. **密码策略加固**:
   ```bash
   sudo apt install -y libpam-pwquality

   # 编辑 /etc/security/pwquality.conf
   minlen = 12
   minclass = 3          # 至少包含 3 种字符类型
   dcredit = -1          # 至少 1 个数字
   ucredit = -1          # 至少 1 个大写
   lcredit = -1          # 至少 1 个小写
   ```

5. **内核参数加固** — `/etc/sysctl.d/60-security.conf`:
   ```
   # 禁止 IP 转发
   net.ipv4.ip_forward = 0

   # 禁止源路由
   net.ipv4.conf.all.accept_source_route = 0
   net.ipv4.conf.default.accept_source_route = 0

   # 防止 SYN 洪水攻击
   net.ipv4.tcp_syncookies = 1
   net.ipv4.tcp_max_syn_backlog = 2048

   # 禁止 ICMP 重定向
   net.ipv4.conf.all.accept_redirects = 0
   net.ipv4.conf.default.accept_redirects = 0

   # 防止 IP 欺骗
   net.ipv4.conf.all.rp_filter = 1
   net.ipv4.conf.default.rp_filter = 1

   # 禁止对外发送 ICMP 重定向
   net.ipv4.conf.all.send_redirects = 0
   net.ipv4.conf.default.send_redirects = 0

   # 限制 core dump
   fs.suid_dumpable = 0
   ```

   应用:
   ```bash
   sudo sysctl --system
   ```

**正反馈时刻**: 再次运行 `sudo lynis audit system`，安全分数从 70 提升到 85+。

---

### Step 10: 安全检查清单脚本 (20 分钟)

创建一个安全巡检脚本，定期运行或 CI/CD 中使用:

**`scripts/security-check.sh`**:
```bash
#!/bin/bash
echo "========== BookNest Security Check =========="
echo ""

# 1. 检查 SSH 配置
echo "[SSH]"
grep -q "PermitRootLogin no" /etc/ssh/sshd_config && echo "  ✓ Root login disabled" || echo "  ✗ Root login ENABLED"
grep -q "PasswordAuthentication no" /etc/ssh/sshd_config && echo "  ✓ Password auth disabled" || echo "  ✗ Password auth ENABLED"
echo ""

# 2. 检查 fail2ban
echo "[Fail2ban]"
systemctl is-active --quiet fail2ban && echo "  ✓ fail2ban running" || echo "  ✗ fail2ban NOT running"
echo ""

# 3. 检查防火墙
echo "[Firewall]"
ufw status | grep -q "Status: active" && echo "  ✓ UFW active" || echo "  ✗ UFW NOT active"
echo ""

# 4. 检查自动更新
echo "[Auto Updates]"
systemctl is-active --quiet unattended-upgrades && echo "  ✓ Auto updates running" || echo "  ✗ Auto updates NOT running"
echo ""

# 5. 检查 HTTPS
echo "[HTTPS]"
curl -s -o /dev/null -w "%{http_code}" https://booknest.yourdomain.com | grep -q "200\|301\|302" && \
  echo "  ✓ HTTPS accessible" || echo "  ✗ HTTPS NOT accessible"
echo ""

# 6. 检查备份
echo "[Backups]"
BACKUP_COUNT=$(find /home/deploy/backups/postgres -name "*.dump" -mtime -2 2>/dev/null | wc -l)
[ "$BACKUP_COUNT" -gt 0 ] && echo "  ✓ Recent backup exists ($BACKUP_COUNT files)" || echo "  ✗ No recent backups!"
echo ""

# 7. 检查磁盘空间
echo "[Disk Space]"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
[ "$DISK_USAGE" -lt 80 ] && echo "  ✓ Disk usage: ${DISK_USAGE}%" || echo "  ✗ Disk usage HIGH: ${DISK_USAGE}%"
echo ""

# 8. 检查 Docker 容器
echo "[Docker]"
docker ps --format "table {{.Names}}\t{{.Status}}" | head -5
echo ""

# 9. 检查开放端口
echo "[Open Ports]"
ss -tlnp | grep -E ':(80|443|22) '
echo ""

# 10. 检查安全头
echo "[Security Headers]"
curl -sI https://booknest.yourdomain.com | grep -i "x-frame-options" > /dev/null && \
  echo "  ✓ X-Frame-Options present" || echo "  ✗ X-Frame-Options MISSING"
curl -sI https://booknest.yourdomain.com | grep -i "strict-transport" > /dev/null && \
  echo "  ✓ HSTS present" || echo "  ✗ HSTS MISSING"
echo ""

echo "========== Check Complete =========="
```

```bash
chmod +x scripts/security-check.sh
./scripts/security-check.sh
```

---

## 验收标准 Checklist

### 网络层
- [ ] 安全组只开放 22/80/443 端口
- [ ] SSH 端口 (22) 只允许你的 IP 访问
- [ ] 数据库和 Redis 端口不对公网开放
- [ ] 出方向规则允许所有 (系统正常工作)

### 系统层
- [ ] `PermitRootLogin no` 已配置
- [ ] `PasswordAuthentication no` 已配置
- [ ] fail2ban 运行中，SSH 3 次失败自动封禁
- [ ] 自动安全更新已启用
- [ ] `/etc/motd` 有安全提示
- [ ] Lynis 安全分数 80+

### Web 层
- [ ] Nginx 版本号已隐藏 (`server_tokens off`)
- [ ] X-Frame-Options、X-Content-Type-Options、HSTS 安全头已设置
- [ ] Content-Security-Policy 已配置
- [ ] 恶意路径 (/wp-admin, /phpmyadmin) 返回 444
- [ ] `.git`、`.env` 文件不可访问

### 应用层
- [ ] CORS 只允许你的域名
- [ ] 所有写接口有输入验证
- [ ] `npm audit` 无高危漏洞
- [ ] JWT secret 足够长且有过期时间

### 数据层
- [ ] PostgreSQL 每日自动备份
- [ ] 备份文件保留 7 天
- [ ] 恢复脚本可用 (`restore-db.sh`)
- [ ] 阿里云自动快照已配置 (每日)
- [ ] 备份文件权限 600

---

## 安全事件响应手册

如果发现安全事件，按以下流程处理:

### 1. 服务器被入侵

```bash
# 立即断开可疑连接
sudo fail2ban-client status sshd        # 查看被封 IP
sudo fail2ban-client set sshd banip <可疑IP>

# 查看登录记录
last -20                                # 最近登录
lastb -20                               # 最近失败登录
grep "Accepted" /var/log/auth.log       # 成功登录记录

# 查看正在运行的异常进程
ps auxf                                 # 进程树
netstat -tlnp                           # 网络连接
```

### 2. 数据库被误删

```bash
# 从最近的备份恢复
ls -lt /home/deploy/backups/postgres/   # 找最新备份
/home/deploy/scripts/restore-db.sh /home/deploy/backups/postgres/backup_XXXXXX.dump
```

### 3. 服务器完全不可用

```bash
# 从阿里云快照恢复:
# 1. 阿里云控制台 → ECS → 快照
# 2. 选择最近的自动快照
# 3. 点击 "回滚磁盘"
# 4. 等待 5-10 分钟
```

---

## 项目目录结构 (新增文件)

```
服务器上 (/home/deploy/):
├── booknest/                      ← 应用代码
├── scripts/
│   ├── backup-db.sh               ← 数据库备份脚本
│   ├── restore-db.sh              ← 数据库恢复脚本
│   └── security-check.sh          ← 安全巡检脚本
├── backups/
│   ├── postgres/                  ← 数据库备份文件
│   └── backup.log                 ← 备份日志
└── logs/                          ← 应用日志 (Day 7 Winston)
```

---

## Git 工作规范

### 分支策略

```bash
git checkout -b feat/day5-security
```

### Commit 示例

```bash
git commit -m "security: tighten CORS policy for production"
git commit -m "security: add helmet and security headers"
git commit -m "security: add input validation audit for all endpoints"
git commit -m "chore: update npm dependencies to fix audit vulnerabilities"
git commit -m "feat: add database backup and restore scripts"
git commit -m "docs: add security checklist and incident response guide"
```

---

## Prompt 模板

### 安全组配置

```
帮我规划阿里云 ECS 安全组规则:

当前运行的服务:
- Nginx (80, 443) — Web 服务器
- SSH (22) — 远程管理
- Docker 容器: PostgreSQL (5432), Redis (6379), Node.js (4000)
- 前端静态资源通过 Nginx 代理

要求:
1. 最小权限原则
2. 数据库和 Redis 不暴露公网
3. SSH 只允许我的 IP (xxx.xxx.xxx.xxx)
4. Docker 容器之间可以互通
```

### SSH 加固

```
帮我加固 SSH 安全:

1. 禁用 root 登录
2. 禁用密码登录，只允许密钥
3. 限制允许登录的用户为 deploy
4. 设置空闲 5 分钟自动断开
5. 最大认证尝试 3 次
6. 安装 fail2ban，3 次失败封禁 2 小时
7. 记录详细日志 (VERBOSE)

当前系统: Ubuntu 22.04 LTS
当前用户: deploy (已在 sudo 组)
```

### 备份策略

```
帮我设计 PostgreSQL 自动备份方案:

环境: PostgreSQL 运行在 Docker 容器中
要求:
1. 每天凌晨 3 点自动备份
2. 使用 pg_dump 自定义格式 (.dump)
3. 备份文件保留 7 天
4. 记录备份日志 (时间、文件大小)
5. 提供一键恢复脚本
6. 备份文件权限 600
```

---

## 每日回顾

Day 5 结束前，回答以下问题：

1. **安全组和个人电脑上的防火墙有什么区别？为什么两者都需要？**
2. **为什么要禁用 SSH 密码登录？密钥登录比密码登录安全在哪里？**
3. **fail2ban 的原理是什么？如果攻击者用 1000 个不同 IP 来暴力破解，fail2ban 还有效吗？**
4. **数据库备份为什么用 pg_dump 而不是直接复制数据文件？**
5. **如果你的服务器明天被黑客入侵了，你能在多长时间内恢复？恢复步骤是什么？**
