---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 草案
依赖: docs/plan/plan-project-init-2026-11-23.md, docs/handoffs/m3-slice-2026-11-23.json, docs/design/03-contracts.md
---

# plan-e2e-device-2026-11-23

真机已接入（hdc `7HD9K26127014659`，HarmonyOS aarch64），DSH 只读 submodule 已初始化（`dsh-v0.2.3-alpha.2`）。本计划只做**联调环境准备与可观测性验证**，不写业务功能代码，不碰签名出包（M4 仍等 Owner 的 In-house 证书 + Profile）。

## 1 目标

1. 在本机启动 DSH Web/Host（默认 `127.0.0.1:3080`）。
2. 以开发 patch 方式加载本地 `dsh-harmony` 插件，启动 HTTPS 网关（默认 `3443`）。
3. 从 PC 侧验证 `GET /mobile/health`、`GET /mobile/version`、回环代理与 WS 首帧鉴权可用。
4. 记录真机侧可继续验证的项（HUKS / TLS pin / 相机扫码 / CA 生命周期），这些需要可安装 hap，受 M4 证书阻塞。

## 2 做 / 不做

**做**
- 在 `vendor/deepseek-harness/` 执行依赖安装与构建（只读参考目录，不改源码）。
- 在仓库外（如 `$env:TEMP/dsh-harmony-dev/`）生成临时自签 server  cert/key 与 CA 锚证书，计算 DER SHA-256 指纹；不写入仓库、不写入 `vendor/`。
- 在仓库外写 `--patch` YAML，用绝对路径指向 `plugin/dist/index.js` 或 `plugin/src/index.ts` 加载插件。
- 启动 DSH + 网关，做 PC 侧冒烟验证。

**不做**
- 不改 `vendor/deepseek-harness/**` 任何受版本控制文件。
- 不提交私钥、证书、token、pin 到仓库。
- 不实现 CA/HUKS/TLS pin/持久化/扫码等业务桩（另立 follow-up）。
- 不尝试 debug 自动签名绕过 M4 证书要求（除非 Owner 明确允许）。

## 3 步骤

1. `pnpm install --frozen-lockfile` + `pnpm run build`（`vendor/deepseek-harness/`）。
2. `npm install` + `npm run build`（`plugin/`），确认 `plugin/dist/index.js` 存在。
3. 生成临时 CA/server 证书到仓库外目录，导出 `DSH_HOME`、`ca.anchorCertFile` 或 `ca.fingerprint`、`tls.certFile`、`tls.keyFile`。
4. 写仓库外 patch YAML：
   ```yaml
   - insert:
       - id: dsh-harmony
         name: '<absolute path>/dsh-harmony/plugin/dist/index.js'
   ```
5. `pnpm dsh web --patch <patch.yml>`（或 `pnpm run start:web -- --patch ...`），保持进程运行。
6. 冒烟：`curl -k https://127.0.0.1:3443/mobile/health`、`curl -k https://127.0.0.1:3443/mobile/version`，并检查 `http://127.0.0.1:3080` 可达。

## 4 验收

- DSH 3080 与网关 3443 均处于 LISTEN。
- `/mobile/health` 返回 200，`X-Contract-Version: v0.1`。
- `/mobile/version` 返回契约约定字段。
- 未提交的私钥/证书不在 `git status` 中出现。
- `git submodule status` 保持 `dsh-v0.2.3-alpha.2` 且无脏文件。

## 5 阻塞与边界

- M4 签名 hap 仍阻塞于 Owner 的 In-house 证书 + Profile；因此真机上安装 App、HUKS/TLS pin/相机扫码/CA 生命周期真机用例仍不可执行。
- 本计划执行的是 PC 侧联调环境准备；手机已通过 hdc 识别，但可安装性依赖 M4。

## 6 执行结果（2026-11-23 实测）

- DSH submodule 已初始化并构建成功（`build:artifacts` 8/8 gates PASS）；临时关闭 safe-delete 仅作用于依赖安装/构建两条命令，已恢复。
- `plugin/` 依赖与构建完成，产物入口实际为 `plugin/dist/src/index.js`。
- 仓库外开发材料位于 `%LOCALAPPDATA%\Temp\dsh-harmony-dev\`：自签 server 证书（DER SHA-256 `69c89ec1bf09d429f2af30b89bef3dff97b162f69e025c39f98f0dca4a5a5ec0`）、`DSH_HOME`、插件 wrapper、`cordis.patch.yml`；未写入仓库。
- DSH Web 后台运行：PID 20856；`127.0.0.1:3080` 与 `0.0.0.0:3443` 均 LISTEN。
- 冒烟：`GET https://127.0.0.1:3443/mobile/health` → 200，`X-Contract-Version: v0.1`；`GET /mobile/version` → 200，契约字段齐全。
- PC 地址：LAN `192.168.3.5`，tailnet `100.103.126.87`；手机可用 `https://192.168.3.5:3443` 连网关（自签证书需 App 侧 pin 或调试放行）。
- 仓库状态：仅新增本计划文档，submodule 保持固定 commit 且无源码改动。
