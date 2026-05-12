# Day 18：小程序 CI/CD + 体验版 + 灰度发布 + 审核策略 + 最终验收


> BookNest Mini Pro 阶段：Web 功能迁移 + Taro 微信小程序 + 微信生态准生产能力训练。  
> 本阶段承接 Day 1-11：继续复用 Express + Prisma + PostgreSQL + Redis + OSS + JWT + OpenAPI + Workspace/RBAC + Order/Ticket/BullMQ，并把 Web 端能力迁移到 Taro 小程序端。  
> 本阶段已按你的要求去掉 `uni-app 对照实验`，保留 Taro 主线与微信小程序底层能力。

## 本阶段统一项目约定

| 项目 | 约定 |
|---|---|
| Repo 根目录 | `booknest/` |
| Web 前端 | `booknest/apps/web` 或原 `booknest/frontend` |
| Taro 小程序 | `booknest/apps/mini-taro` |
| 后端目录 | `booknest/backend` |
| 共享包目录 | `booknest/packages/*` |
| 后端端口 | `http://localhost:4000` |
| Web 前端端口 | `http://localhost:4001` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |
| API 前缀 | `/api/v1` |
| 小程序运行端 | 微信小程序 `weapp`，可选构建 H5 用于调试 |
| 线上后端 | 阿里云 ECS + Nginx + HTTPS 域名 |

## 本阶段开始前检查

- [ ] Day 1-11 的 BookNest 项目可以本地运行。
- [ ] 后端登录、Book CRUD、Category、Review、上传、Workspace/RBAC、Order/Ticket、BullMQ 可用。
- [ ] OpenAPI 文档可以访问，例如 `http://localhost:4000/api-docs`。
- [ ] GitHub Actions 基础测试与部署流程仍然可用。
- [ ] 已拥有微信小程序 AppID，并能打开微信开发者工具。
- [ ] 阿里云 ECS、域名、HTTPS 证书已经准备好。
- [ ] 当前分支干净：`git status` 没有未提交的重要改动。

建议阶段开始前新建分支：

```bash
git checkout -b feat/day12-18-mini-pro
```

## 本阶段统一学习产出

每天结束时至少产出 4 类内容：

1. 可运行代码：当天核心功能必须能在微信开发者工具中跑通。
2. 验收截图：关键页面、接口、数据库或 CI 结果截图。
3. 文档沉淀：当天对应的架构说明、排错记录或检查清单。
4. 反馈复盘：记录遇到的问题、vibe coding 提示词、人工修正点。


---

## 项目简介

今天是 BookNest Mini Pro 阶段的收官日。前面已经完成 Taro 迁移、微信登录、Workspace/RBAC、上传分享、微信支付、订阅消息、客服、内容安全、分包和性能优化。今天要把项目推进到“可以交付、可以体验、可以准备审核”的状态：CI/CD、体验版上传、环境隔离、灰度发布计划、审核资料、隐私合规和最终验收。

**今天的目标**：GitHub Actions 能构建并上传小程序体验版；小程序能访问线上 HTTPS 后端；完成审核检查清单、灰度发布计划、回滚计划和最终演示路径。

---

## 学习目标

完成今天后，你将掌握：

1. 小程序 CI/CD 的基本流程。
2. `miniprogram-ci` 或 Taro `@tarojs/plugin-mini-ci` 的使用方式。
3. 小程序上传密钥、GitHub Secrets 和安全管理。
4. dev / trial / release 环境隔离。
5. 体验版、审核版、正式版的发布流程差异。
6. 小程序审核策略：服务类目、隐私协议、测试账号、支付说明、客服入口、内容安全。
7. 灰度发布和回滚方案。
8. 如何做最终验收和阶段复盘。

---

## 技术栈

| 技术 | 用途 |
|---|---|
| GitHub Actions | 自动构建和上传 |
| miniprogram-ci | 小程序预览、上传、构建 npm |
| @tarojs/plugin-mini-ci | Taro 小程序 CI 插件，可二选一 |
| 微信开发者工具 | 本地预览和上传辅助 |
| GitHub Secrets | 保存 AppID、上传密钥、环境变量 |
| 阿里云 ECS + Nginx + HTTPS | 线上 API |
| Docker Compose | 后端生产部署 |
| Winston / AuditLog | 上线后排查问题 |
| Markdown Checklists | 审核、发布、回滚文档 |

---

## 技术路线

```txt
push / tag
  ↓
GitHub Actions
  ↓
安装依赖 + 类型检查 + 构建 Taro weapp
  ↓
miniprogram-ci / Taro mini-ci
  ↓
生成预览二维码 或 上传体验版
  ↓
人工验收体验版
  ↓
提交审核资料
  ↓
审核通过后灰度发布
  ↓
监控 + 回滚
```

今天的关键原则：

- 上传密钥绝不提交到 Git。
- 体验版必须访问 HTTPS 线上后端，不要依赖本地调试开关。
- 审核测试账号要稳定，不能让审核员卡在登录或支付流程。
- 支付、内容安全、客服、隐私协议都必须有清晰说明。
- 灰度发布必须有回滚预案。

---

## 功能清单

### Must-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 环境隔离 | dev / trial / release API baseURL |
| 2 | 小程序上传密钥 | 配置到 GitHub Secrets |
| 3 | CI 构建 | GitHub Actions 构建 `weapp` |
| 4 | CI 上传体验版 | 使用 miniprogram-ci 或 Taro mini-ci |
| 5 | 体验版验收 | 登录、CRUD、上传、支付、消息、客服、内容安全 |
| 6 | 审核检查清单 | `WECHAT_REVIEW_CHECKLIST.md` |
| 7 | 灰度发布计划 | `RELEASE_PLAN.md` |
| 8 | 回滚计划 | `ROLLBACK_PLAN.md` |
| 9 | 最终演示路径 | `FINAL_DEMO_SCRIPT.md` |

### Nice-to-Have

| # | 功能 | 说明 |
|---|---|---|
| 1 | 预览二维码 artifact | CI 上传二维码图片 |
| 2 | 自动版本号 | 使用 Git tag 或 package version |
| 3 | 构建体积报告 | CI 记录主包和分包体积 |
| 4 | 发布 changelog | 自动生成体验版描述 |

---

## Step 1：配置环境隔离

`apps/mini-taro/src/config/env.ts`：

```ts
import Taro from '@tarojs/taro'

const API_MAP = {
  develop: 'https://dev-api.yourdomain.com',
  trial: 'https://trial-api.yourdomain.com',
  release: 'https://api.yourdomain.com',
}

export function getEnvVersion() {
  const accountInfo = Taro.getAccountInfoSync?.()
  return accountInfo?.miniProgram?.envVersion || 'develop'
}

export const ENV_VERSION = getEnvVersion()
export const API_BASE_URL = API_MAP[ENV_VERSION as keyof typeof API_MAP] || API_MAP.develop
```

策略：

| 小程序环境 | API | 用途 |
|---|---|---|
| develop | `https://dev-api.yourdomain.com` | 开发版 |
| trial | `https://trial-api.yourdomain.com` | 体验版 / 审核前验收 |
| release | `https://api.yourdomain.com` | 正式版 |

如果你暂时只有一个后端域名，也要保留结构：

```ts
const API_MAP = {
  develop: 'https://api.yourdomain.com',
  trial: 'https://api.yourdomain.com',
  release: 'https://api.yourdomain.com',
}
```

---

## Step 2：准备上传密钥和 Secrets

在微信公众平台：

```txt
开发管理 → 开发设置 → 小程序代码上传 → 生成上传密钥
```

保存到本地临时文件：

```txt
private.key
```

GitHub Secrets 建议：

| Secret | 说明 |
|---|---|
| `WECHAT_MINI_APP_ID` | 小程序 AppID |
| `WECHAT_MINI_PRIVATE_KEY` | 上传密钥内容 |
| `WECHAT_MINI_PROJECT_PATH` | `apps/mini-taro` |
| `MINI_UPLOAD_VERSION` | 可选，版本号 |

`.gitignore`：

```gitignore
# WeChat mini program private keys
*.key
private.*.key
apps/mini-taro/private.key
```

---

## Step 3：使用 miniprogram-ci 上传体验版

安装：

```bash
cd apps/mini-taro
pnpm add -D miniprogram-ci
```

创建 `apps/mini-taro/scripts/upload.cjs`：

```js
const fs = require('node:fs')
const path = require('node:path')
const ci = require('miniprogram-ci')

const appid = process.env.WECHAT_MINI_APP_ID
const privateKey = process.env.WECHAT_MINI_PRIVATE_KEY
const version = process.env.MINI_UPLOAD_VERSION || require('../package.json').version || '0.0.1'
const desc = process.env.MINI_UPLOAD_DESC || `BookNest Mini Pro ${version}`

if (!appid || !privateKey) {
  throw new Error('Missing WECHAT_MINI_APP_ID or WECHAT_MINI_PRIVATE_KEY')
}

const keyPath = path.join(__dirname, '../private.key')
fs.writeFileSync(keyPath, privateKey)

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: path.join(__dirname, '../dist'),
  privateKeyPath: keyPath,
  ignores: ['node_modules/**/*'],
})

async function main() {
  await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      minify: true,
      autoPrefixWXSS: true,
    },
    onProgressUpdate: console.log,
  })
}

main().finally(() => {
  if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath)
})
```

`package.json` scripts：

```json
{
  "scripts": {
    "build:weapp": "taro build --type weapp",
    "typecheck": "tsc --noEmit",
    "mini:upload": "node scripts/upload.cjs"
  }
}
```

---

## Step 4：GitHub Actions Workflow

`.github/workflows/mini-program.yml`：

```yaml
name: Mini Program CI

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Mini program version'
        required: true
        default: '0.0.1'
      desc:
        description: 'Upload description'
        required: false
        default: 'BookNest Mini Pro trial build'
  push:
    branches:
      - main
    paths:
      - 'apps/mini-taro/**'
      - 'packages/**'
      - '.github/workflows/mini-program.yml'

jobs:
  build-and-upload:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck mini
        run: pnpm --filter mini-taro typecheck

      - name: Build weapp
        run: pnpm --filter mini-taro build:weapp

      - name: Upload mini program trial version
        env:
          WECHAT_MINI_APP_ID: ${{ secrets.WECHAT_MINI_APP_ID }}
          WECHAT_MINI_PRIVATE_KEY: ${{ secrets.WECHAT_MINI_PRIVATE_KEY }}
          MINI_UPLOAD_VERSION: ${{ github.event.inputs.version || github.sha }}
          MINI_UPLOAD_DESC: ${{ github.event.inputs.desc || 'BookNest Mini Pro CI upload' }}
        run: pnpm --filter mini-taro mini:upload
```

如果你的 package name 不是 `mini-taro`，需要改 `--filter`。

---

## Step 5：Taro plugin-mini-ci 可选方案

如果希望使用 Taro 插件：

```bash
cd apps/mini-taro
pnpm add -D @tarojs/plugin-mini-ci
```

`config/index.ts`：

```ts
const config = {
  plugins: [
    ['@tarojs/plugin-mini-ci', {
      weapp: {
        appid: process.env.WECHAT_MINI_APP_ID,
        privateKeyPath: 'private.key',
      },
      version: process.env.MINI_UPLOAD_VERSION || '0.0.1',
      desc: process.env.MINI_UPLOAD_DESC || 'BookNest Mini Pro',
    }],
  ],
}
```

二选一建议：

| 方案 | 适合场景 |
|---|---|
| miniprogram-ci | 更贴近微信工具链，控制力强 |
| Taro plugin-mini-ci | Taro 内集成，配置更集中 |

本阶段建议优先用 `miniprogram-ci`，因为你需要理解微信小程序自己的上传链路。

---

## Step 6：体验版验收清单

创建 `docs/TRIAL_ACCEPTANCE_CHECKLIST.md`：

```md
# Trial Acceptance Checklist

## 基础

- [ ] 体验版能打开。
- [ ] 能访问 HTTPS 后端。
- [ ] request 合法域名已配置。
- [ ] uploadFile 合法域名已配置。
- [ ] 图片能正常展示。

## 用户路径

- [ ] 微信登录。
- [ ] 选择 Workspace。
- [ ] 查看书籍列表。
- [ ] 搜索书籍。
- [ ] 创建书籍。
- [ ] 上传封面。
- [ ] 编辑书籍。
- [ ] 分享详情。
- [ ] 删除书籍。

## 高级能力

- [ ] 创建活动。
- [ ] 创建订单。
- [ ] mock/real 支付。
- [ ] 支付成功生成 Ticket。
- [ ] 订阅活动提醒。
- [ ] 客服入口可用。
- [ ] 内容安全拦截可用。
- [ ] 管理员复核可用。

## 权限

- [ ] VIEWER 不可创建。
- [ ] MEMBER 不可管理成员。
- [ ] ADMIN 可处理内容安全。
- [ ] 非成员访问返回 403。
```

---

## Step 7：审核策略文档

创建 `docs/WECHAT_REVIEW_CHECKLIST.md`：

```md
# WeChat Review Checklist

## 小程序基础资料

- [ ] 小程序名称与功能一致。
- [ ] 头像、简介、服务类目配置完成。
- [ ] 服务类目与实际功能匹配。
- [ ] 隐私协议配置完成。
- [ ] 用户协议配置完成。

## 登录与账号

- [ ] 审核员无需复杂操作即可体验核心功能。
- [ ] 提供审核测试账号或说明微信登录即可体验。
- [ ] 如果需要 Workspace 权限，提供测试 Workspace。
- [ ] 不强制收集非必要个人信息。

## 支付

- [ ] 支付功能说明清楚。
- [ ] 测试环境使用 mock pay 或明确金额极小的测试商品。
- [ ] 支付成功后权益发放逻辑清晰。
- [ ] 客服入口可用。
- [ ] 退款/售后说明可见。

## 内容安全

- [ ] 用户可发布内容前有内容安全检测。
- [ ] 风险内容不会直接展示。
- [ ] 有人工复核或申诉入口。
- [ ] 客服入口可用。

## 页面内容

- [ ] 无测试文案、无 lorem ipsum。
- [ ] 无调试按钮暴露给普通用户。
- [ ] 无未备案或不可访问外链。
- [ ] 无诱导分享、诱导关注等风险文案。

## 技术配置

- [ ] request 合法域名配置完成。
- [ ] uploadFile 合法域名配置完成。
- [ ] downloadFile 合法域名配置完成。
- [ ] HTTPS 证书有效。
- [ ] 生产环境关闭 mock callback。
```

---

## Step 8：灰度发布计划

创建 `docs/RELEASE_PLAN.md`：

```md
# Release Plan

## 版本信息

| 项目 | 内容 |
|---|---|
| 版本 | 0.1.0 |
| 类型 | BookNest Mini Pro 首个体验版 |
| 后端版本 |  |
| 小程序版本 |  |
| 发布时间 |  |

## 发布策略

1. CI 上传体验版。
2. 内部验收通过。
3. 提交审核。
4. 审核通过后先小比例灰度发布。
5. 观察登录、支付、上传、内容安全、错误日志。
6. 无严重问题后扩大比例。
7. 最终全量发布。

## 观察指标

| 指标 | 阈值 | 处理方式 |
|---|---:|---|
| 登录失败率 | > 5% | 暂停放量 |
| 支付失败率 | > 5% | 检查微信支付和回调 |
| API 5xx | > 1% | 回滚后端或小程序 |
| 上传失败率 | > 5% | 检查 OSS 和合法域名 |
| 内容安全误杀投诉 | 明显升高 | 调整 REVIEW 策略 |

## 发布前确认

- [ ] 后端生产数据库已备份。
- [ ] 后端日志可查看。
- [ ] 小程序体验版验收通过。
- [ ] 客服入口可用。
- [ ] 回滚方案已确认。
```

---

## Step 9：回滚计划

创建 `docs/ROLLBACK_PLAN.md`：

```md
# Rollback Plan

## 小程序回滚

1. 如果新版本审核通过但正式发布后出现严重问题，优先在小程序后台回退到上一个稳定版本。
2. 如果只是后端接口问题，先不要频繁提交小程序版本，优先回滚后端。
3. 保留上一版本小程序版本号和提交 commit。

## 后端回滚

1. GitHub Actions 回滚到上一个稳定 commit。
2. Docker 镜像保留最近 3 个版本。
3. 数据库迁移如不可逆，必须提前写 down/补偿脚本。
4. 支付相关数据禁止直接删除，只能修正状态并留审计日志。

## 紧急关闭开关

| 开关 | 用途 |
|---|---|
| `WECHAT_PAY_ENABLED=false` | 暂停真实支付 |
| `CONTENT_SECURITY_STRICT=false` | 降级内容安全策略 |
| `SUBSCRIBE_MESSAGE_ENABLED=false` | 暂停消息发送 |
| `MINI_MAINTENANCE_MODE=true` | 小程序显示维护提示 |

## 事故记录模板

- 时间：
- 影响范围：
- 触发版本：
- 发现方式：
- 处理动作：
- 恢复时间：
- 后续改进：
```

---

## Step 10：最终演示脚本

创建 `docs/FINAL_DEMO_SCRIPT.md`：

```md
# Final Demo Script

## 演示路径

1. 打开 BookNest Mini 体验版。
2. 微信登录。
3. 进入我的页，查看当前用户和 Workspace。
4. 切换 Workspace。
5. 返回首页，查看书籍列表。
6. 搜索一本书。
7. 创建新书。
8. 上传封面。
9. 保存并进入详情页。
10. 分享详情页。
11. 编辑书籍。
12. 创建评论并触发内容安全检测。
13. 创建读书会活动。
14. 创建订单。
15. mock/real 支付。
16. 支付成功生成 Ticket。
17. 订阅活动提醒。
18. 打开客服入口。
19. 管理员进入内容安全复核页。
20. 查看审计日志。
21. 展示 CI 上传体验版记录。
22. 展示分包和性能报告。

## 演示数据

- Workspace：
- 测试用户：
- 测试书籍：
- 测试活动：
- 测试订单：

## 截图清单

- [ ] 登录页。
- [ ] 首页书籍列表。
- [ ] 创建书籍表单。
- [ ] 上传封面成功。
- [ ] 书籍详情分享。
- [ ] 支付页。
- [ ] 支付结果页。
- [ ] 订阅消息授权。
- [ ] 客服入口。
- [ ] 内容安全复核。
- [ ] CI 成功记录。
```

---

## Day 18 验收标准 Checklist

### CI/CD

- [ ] GitHub Actions 能安装依赖。
- [ ] GitHub Actions 能构建 `weapp`。
- [ ] CI 能上传体验版或生成预览。
- [ ] 上传密钥没有进入 Git。
- [ ] 版本号和描述可配置。
- [ ] 构建失败时能看到日志。

### 环境和线上

- [ ] 体验版访问 HTTPS 后端。
- [ ] dev / trial / release 环境能区分。
- [ ] 合法域名配置完整。
- [ ] 上传、图片、支付回调域名可用。
- [ ] 生产环境关闭 mock callback。

### 审核和发布

- [ ] `WECHAT_REVIEW_CHECKLIST.md` 完成。
- [ ] `RELEASE_PLAN.md` 完成。
- [ ] `ROLLBACK_PLAN.md` 完成。
- [ ] 隐私协议、用户协议准备完成。
- [ ] 审核测试说明准备完成。
- [ ] 灰度发布指标定义完成。

### 最终演示

- [ ] `FINAL_DEMO_SCRIPT.md` 完成。
- [ ] 完整演示路径跑通。
- [ ] 关键截图归档。
- [ ] 性能报告和分包策略可展示。
- [ ] 阶段复盘完成。

---

## Day 18 Git Commit 示例

```bash
git add .
git commit -m "chore(mini): add mini program ci release and review checklist"
```

---

## Day 18 Prompt 模板

### CI/CD

```txt
你是资深微信小程序 CI/CD 工程师。
请审查我的 GitHub Actions mini-program.yml。
要求：检查 pnpm workspace、Taro build、miniprogram-ci 上传、Secrets 安全、版本号、失败日志、密钥临时文件清理。
```

### 审核策略

```txt
你是微信小程序审核策略顾问。
请审查我的 WECHAT_REVIEW_CHECKLIST.md。
项目包含微信登录、书籍管理、Workspace、支付、订阅消息、客服、内容安全。
请指出可能被审核卡住的点，并给出修改建议。
```

### 灰度发布

```txt
请为 BookNest Mini Pro 制定灰度发布和回滚方案。
要求：包含小程序版本回滚、后端回滚、支付开关、内容安全开关、观察指标、事故记录模板。
```

---

## Day 18 每日反馈

### 今日完成

- [ ] CI/CD 完成。
- [ ] 体验版完成。
- [ ] 审核清单完成。
- [ ] 灰度和回滚完成。
- [ ] 最终演示完成。

### 今日卡点

1. 
2. 
3. 

### Vibe Coding 反馈

| 提示词 | 结果 | 人工修正 |
|---|---|---|
| CI workflow |  |  |
| 审核清单 |  |  |
| 灰度发布 |  |  |
| 回滚计划 |  |  |

---

## 阶段结束复盘问题

1. 哪些 Web 端代码真正被复用了？哪些只是复用了思路？
2. Taro 迁移中最大的成本是组件、样式、路由还是请求？
3. 微信登录、UnionID、JWT 三者的边界是否清楚？
4. 支付回调为什么必须幂等？
5. 内容安全为什么必须后端兜底？
6. 分包后主包体积下降了吗？下降了多少？
7. 体验版上传和审核准备是否已经标准化？
8. 下一阶段你最想加强哪一块：真实支付、数据分析、运营后台、还是多端扩展？

---

## 本阶段最终验收

完成 Day 12-18 后，你应该拥有：

- [ ] 一个 Taro + React + TypeScript 微信小程序。
- [ ] 迁移自 Web 端的 BookNest 核心业务。
- [ ] 微信登录 + OpenID + UnionID 可空处理 + JWT。
- [ ] Workspace/RBAC 小程序端迁移。
- [ ] 封面上传和分享能力。
- [ ] 微信支付架构与 mock/real 模式。
- [ ] 订阅消息、客服消息、内容安全。
- [ ] 复杂分包和性能报告。
- [ ] CI 上传体验版。
- [ ] 审核、灰度、回滚文档。

---

## 参考资料

- miniprogram-ci：`https://www.npmjs.com/package/miniprogram-ci`
- Taro 小程序持续集成：`https://docs.taro.zone/docs/plugin-mini-ci`
- 微信小程序上传密钥：`https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html`
