---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 草案
依赖: docs/plan/plan-e2e-device-2026-11-23.md, docs/plan/plan-debug-sign-device-2026-11-23.md, docs/design/03-contracts.md
---

# plan-app-health-ondevice-2026-11-23

目标：让已安装的 debug hap 在真机页面上能完成 `GET /mobile/health`，作为 App↔网关链路的第一个可观测验收点。

## 1 背景

- PC 侧网关已运行：`https://192.168.3.5:3443`，health/version 在 PC 侧验证通过。
- 手机已安装并启动 debug hap；`Index.ets` 已有 health 按钮与文本区，但默认 origin 是 `192.168.1.5:3443`。
- 网关当前使用开发自签 CA。HarmonyOS `@ohos.net.http` 支持 `HttpRequestOptions.caData`（API 20+），可在请求级指定 PEM CA，不需要把 CA 装进系统信任库。

## 2 做 / 不做

**做**
- 生成开发 CA 与服务器证书，SAN 包含 `localhost`、`127.0.0.1`、`192.168.3.5`、`100.103.126.87`；重启网关。
- 将**公开的开发 CA 证书**（非私钥）作为常量放入 App 源码，仅用于 debug 请求级信任。
- `HttpClient` 在 health/pair 请求中设置 `caData`。
- `Index.ets` 默认 origin 改为 `https://192.168.3.5:3443`，增加 checking/RTT/错误码展示。
- 构建、安装、启动并观察页面结果。

**不做**
- 不提交 `.p12` / `.key` / CA 私钥 / 密码。
- 不把 CA 装入系统信任库；不关闭 TLS 校验；不使用 `http://`。
- 不实现真实 TLS pin 校验、HUKS、扫码（本步 health 不触发这些桩）。
- 不改契约字段。

## 3 验收

- `curl -k https://192.168.3.5:3443/mobile/health` 200。
- 构建 `BUILD SUCCESSFUL`，`entry-default-signed.hap` 安装成功。
- 真机页面 health 显示 `ok` 及 plugin/dsh 版本，且有 RTT。
- `git status` 不出现私钥/密码/签名产物。
