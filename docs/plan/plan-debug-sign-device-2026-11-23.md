---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 草案
依赖: docs/plan/plan-project-init-2026-11-23.md, docs/plan/plan-e2e-device-2026-11-23.md, docs/decisions/ADR-0005-version-monitoring-inhouse.md
---

# plan-debug-sign-device-2026-11-23

Owner 明确：没有企业实名账号，不继续推进 In-house 发布。当前目标改为：**用 DevEco 自动签名（Debug）产出的 hap 安装到已连接的真机**，仅用于真机调试与验证。

## 1 目标

1. 用 DevEco 自动签名生成 debug 证书/Profile（绑定本机华为账号与设备 UDID）。
2. 构建带 debug 签名的 hap。
3. 通过 hdc 安装到手机 `7HD9K26127014659`（UDID `E89D20B9A6A47A656B566FFD6FDFD26245AB6D440D6E6CCB92145B73DB7392CD`）。
4. 验证 App 可启动并连接 PC 侧网关 `https://192.168.3.5:3443`。

## 2 做 / 不做

**做**
- DevEco 登录个人华为账号（需开发者账号；若账号未实名按 IDE 提示完成）。
- 在 DevEco 中启用 `Automatically generate signature`，生成 debug 签名配置。
- 构建 debug hap 并用 hdc 安装。
- 记录签名有效期与设备绑定信息。

**不做**
- 不申请 In-house 发布证书/Profile（无企业实名账号，本路线搁置）。
- 不把 debug 包当作 M4 正式出包或对外分发方案。
- 不把证书、私钥、密码提交到仓库。

## 3 步骤

1. DevEco Studio 打开 `app/` 工程，登录华为账号。
2. `File > Project Structure > Project > Signing Configs`，勾选 `Automatically generate signature`。
3. 选择当前应用/包名 `com.kuaizhongqiang.dshharmony`，确认设备列表中包含上述 UDID。
4. DevEco 生成 debug 证书与 Profile，并写入本地签名配置；该配置不得提交含密码的版本。
5. 构建：`Build > Build Hap(s)/APP(s) > Build Debug Hap` 或 hvigor assembleHap（带签名配置）。
6. 安装：`hdc -t 7HD9K26127014659 install -r <debug.hap>`。
7. 验证：应用启动；从 App 侧请求 `/mobile/health`；记录 TLS pin/扫码/HUKS 等真机项状态。

## 4 验收

- 手机上出现应用图标并可启动。
- `hdc shell bm list` 可查到 `com.kuaizhongqiang.dshharmony`。
- App 能连 `https://192.168.3.5:3443/mobile/health` 并得到 200。
- `git status` 不出现私钥、证书、密码或签名产物。

## 5 边界与影响

- 这是 Debug 安装方案，不等同于 ADR-0005 的 In-house 正式发布；M4 的“正式签名出包”口径需 Owner 另行更新或关闭。
- Debug Profile 绑定设备 UDID 且有有效期，过期需重新生成。
- 自更新链路仍不能按 In-house 正式方案验收；如需正式分发，仍需企业资质或改用其他被允许的发布方式。

## 6 执行结果（2026-11-23 实测）

- DevEco 自动签名已生成：`.p12` / `.cer` / `.p7b` 位于 `C:\Users\kuai\.ohos\config\`，未进仓。
- `app/build-profile.json5` 已被 DevEco 写入 debug 签名配置（含本地密码），**不得提交**；如需继续构建请保留在本机。
- 设置 `DEVECO_SDK_HOME=D:\Harmony\DevEco Studio\sdk` 后，`hvigorw assembleHap` BUILD SUCCESSFUL，产出 `entry-default-signed.hap`（214125 B）。
- `hdc install -r` 安装成功；`aa start -b com.kuaizhongqiang.dshharmony -a EntryAbility` 启动成功；`ps -ef` 可见进程 `com.kuaizhongqiang.dshharmony`。
- 手机 shell 无 curl/wget，无法从设备侧直接 HTTP 冒烟；App 当前仍是占位页，未写网络业务代码，因此 `/mobile/health` 真机 App 侧验证待后续业务实现后执行。

## 7 本地签名配置不进仓（2026-11-23）

- DevEco 自动签名会把密码写入 `app/build-profile.json5`；该文件原本被跟踪，存在误提交风险。
- 处理：新增可跟踪模板 `app/build-profile.example.json5`（`signingConfigs: []`），在 `.gitignore` 用精确条目忽略 `app/build-profile.json5`，并用 `git rm --cached` 取消跟踪（保留本机文件）。
- 新克隆/换机时：复制 `app/build-profile.example.json5` 为 `app/build-profile.json5`，再由 DevEco 生成本地签名配置；禁止提交含密码的本地文件。
