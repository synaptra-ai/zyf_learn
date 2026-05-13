# Rollback Plan

## 小程序回滚

1. 如果新版本审核通过但正式发布后出现严重问题，优先在小程序后台回退到上一个稳定版本
2. 如果只是后端接口问题，先不要频繁提交小程序版本，优先回滚后端
3. 保留上一版本小程序版本号和提交 commit

## 后端回滚

1. GitHub Actions 回滚到上一个稳定 commit
2. Docker 镜像保留最近 3 个版本
3. 数据库迁移如不可逆，必须提前写 down/补偿脚本
4. 支付相关数据禁止直接删除，只能修正状态并留审计日志

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
