# WSL2 项目局域网访问指南

## 问题背景

BookNest 项目运行在 WSL2 (Linux) 中，存在以下网络隔离问题：

- WSL2 使用 NAT 虚拟网络，与宿主机 (Windows) 和局域网隔离
- WSL2 内部的 IP（如 `172.24.x.x`）只有 Windows 宿主机能访问
- 局域网中的其他设备（手机、平板、其他电脑）无法直接访问 WSL2 内的服务

## 网络拓扑

```
局域网设备 ──✗──> WSL2 (172.24.166.142:4001)     直接不可达
    │
    └──✓──> Windows 宿主机 (<物理网卡IP>:4001)    可达
              │
              └── 端口转发 ──> WSL2 (172.24.166.142:4001)
```

## 解决方案：Windows 端口转发

### 第一步：确认 WSL2 IP

在 WSL2 终端中运行：

```bash
hostname -I
# 输出类似：172.24.166.142 172.17.0.1 172.18.0.1
# 取第一个非 172.17/172.18 的地址（172.17.x 和 172.18.x 是 Docker 网络）
```

### 第二步：配置 Vite 监听所有网卡

确保 `frontend/vite.config.ts` 中配置了 `host: '0.0.0.0'`：

```ts
export default defineConfig({
  server: {
    host: '0.0.0.0',  // 监听所有网卡，不仅限于 localhost
    port: 4001,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
```

> **注意**：`0.0.0.0` 是绑定地址，不是可访问的 URL。服务绑定后，通过 `localhost:4001`、`172.24.166.142:4001` 等实际 IP 访问。

### 第三步：设置 Windows 端口转发

在 **Windows PowerShell（管理员）** 中运行：

```powershell
# 转发前端 (4001)
netsh interface portproxy add v4tov4 listenport=4001 listenaddress=0.0.0.0 connectport=4001 connectaddress=172.24.166.142

# 转发后端 API (4000，如需直接访问后端)
netsh interface portproxy add v4tov4 listenport=4000 listenaddress=0.0.0.0 connectport=4000 connectaddress=172.24.166.142
```

### 第四步：开放 Windows 防火墙

```powershell
netsh advfirewall firewall add rule name="BookNest 4001" dir=in action=allow protocol=TCP localport=4001

netsh advfirewall firewall add rule name="BookNest 4000" dir=in action=allow protocol=TCP localport=4000
```

### 第五步：确认宿主机局域网 IP

在 Windows CMD 中运行 `ipconfig`，找到连接路由器的物理网卡 IP：

```
以太网适配器 以太网:
   IPv4 地址 . . . . . . . . . . . . : 192.168.1.xxx    <-- 这个

无线局域网适配器 WLAN:
   IPv4 地址 . . . . . . . . . . . . : 192.168.1.xxx    <-- 或这个
```

以下地址 **不是** 局域网 IP（局域网设备无法访问）：

- `172.24.x.x` — WSL/Hyper-V 虚拟网络
- `172.17.x.x` / `172.18.x.x` — Docker 虚拟网络
- `192.168.9.x` / `192.168.30.x` — VMware 虚拟网络

## 访问方式总结

| 访问来源 | 地址 | 说明 |
|---------|------|------|
| WSL2 内部 | `http://localhost:4001` | 直接访问 |
| Windows 宿主机 | `http://localhost:4001` | WSL2 自动转发到 Windows |
| Windows 宿主机 | `http://172.24.166.142:4001` | 通过 WSL2 IP 直接访问 |
| 局域网设备 | `http://<宿主机物理IP>:4001` | 通过端口转发访问 |

## 管理命令

### 查看已配置的端口转发

```powershell
netsh interface portproxy show v4tov4
```

### 删除端口转发规则

```powershell
netsh interface portproxy delete v4tov4 listenport=4001 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=4000 listenaddress=0.0.0.0
```

### 删除防火墙规则

```powershell
netsh advfirewall firewall delete rule name="BookNest 4001"
netsh advfirewall firewall delete rule name="BookNest 4000"
```

## 注意事项

1. **WSL2 IP 会变化**：每次 WSL 重启后 IP 可能改变，需要更新端口转发的 `connectaddress`。如果局域网设备突然无法访问，先检查 WSL2 IP 是否变化。

2. **端口被占用**：如果 Windows 上 4001 端口被其他程序占用，端口转发会失败。可以用 `netstat -ano | findstr :4001` 检查占用情况。

3. **WSL2 镜像网络模式（替代方案）**：在 Windows 11 的较新版本中，可以在 `%USERPROFILE%\.wslconfig` 中启用镜像网络模式：

   ```ini
   [wsl2]
   networkingMode=mirrored
   ```

   启用后 WSL2 与 Windows 共享网络栈，无需端口转发，重启 WSL 生效（`wsl --shutdown`）。
