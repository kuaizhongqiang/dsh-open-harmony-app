---
读者: 全体 Agent / 负责人
类型: plan
权威: 高
状态: 草案（依据本机实测环境；双平台 SDK 缺口见 §5）
依赖: docs/plan/plan-project-init-2026-11-23.md, docs/design/02-architecture.md, app/AGENT.md
---

# plan-harmony-env-init-2026-11-23

鸿蒙 App 路径（`app/`）与仓库根目录的**环境初始化**计划。对应主计划 M3.4（App 骨架）与 M4.1（出 hap）的"环境准备"部分；不写业务功能代码。

## 1 背景与环境事实（本机实测 2026-11-23）

| 项 | 实测值 | 与现有文档差异 |
|---|---|---|
| DevEco Studio | `26.0.0.851` (build `261.23567.138.36.2600851`) | 根 `AGENT.md` §7 / `app/AGENT.md` §3 记录"本机无 DevEco"，已失效 |
| hvigor | `6.26.8`（`D:\Harmony\DevEco Studio\tools\hvigor\bin\hvigorw.bat`） | 新增事实 |
| SDK | `D:\Harmony\DevEco Studio\sdk\default`，`apiVersion=26`，HarmonyOS 26.0.0 | 新增事实 |
| SDK 子目录 | `hms/` + `openharmony/` 均存在；**未发现独立 API 9 / API 12 SDK 包** | 约束见 §5 |
| ohpm registry | `https://ohpm.openharmony.cn/ohpm/` | 新增事实 |
| Node | `v24.19.0` | 新增事实 |

## 2 目标

1. 在 `app/` 下生成**可被 DevEco Studio 直接打开的 Stage 模型 ArkTS 工程骨架**（入口 Ability + 占位 Index 页），版本参数对齐本机模板。
2. 根目录 `.gitignore` 补鸿蒙工程生成物忽略项（构建产物、依赖缓存、本地签名配置）。
3. 更正根 `AGENT.md` §7 与 `app/AGENT.md` §3 的环境事实，避免后续 agent 误判。
4. 以一次真实 `hvigorw` 构建验证骨架可用，并记录 SDK 缺口导致的不可验项。

## 3 范围（做 / 不做）

**做**
- `app/AppScope/`、`app/entry/`、`app/hvigor/`、`app/build-profile.json5`、`app/oh-package.json5`、`app/hvigorfile.ts`、`app/code-linter.json5`
- 最小 ArkTS 源码：`EntryAbility.ets` + `pages/Index.ets`（占位页，非业务功能）
- 根 `.gitignore` 追加鸿蒙忽略段（精确条目，不用通配吞 `.env.example`）
- 环境事实更正（仅 §7 / §3 两处环境句，不动红线）
- 构建验证 + 结果记录（本文 §6）

**不做**
- 不写业务功能代码（会话/配对/网络/安全层均不动，属 M3.4 之后）
- 不新增 `PlatformAdapter` 实现（当前仅工程层；适配实现待双平台 SDK 齐备，见 §5）
- 不改契约（`docs/design/03-contracts.md` 为唯一真源）
- 不提交、不 push（当前分支 `chore/add-gitignore` 有他人未提交改动，保持原样）
- 不修改 `vendor/deepseek-harness/**`（只读）

## 4 执行步骤

1. 以 DevEco 内置模板 `plugins/codegenie-plugin/previewProjectTemplate/` 为基线，复制工程骨架到 `app/`（不含 IDE 私有文件 `phoneSettingConfig_Phone.json`、`oh-package-lock.json5`）。
2. 改写配置：
   - `AppScope/app.json5`：bundleName = `com.kuaizhongqiang.dshharmony`，vendor = `kuaizhongqiang`，icon/label 保持 `$media` / `$string` 引用。
   - `build-profile.json5`：`runtimeOS = HarmonyOS`，`compatibleSdkVersion = "5.0.0(12)"`、`targetSdkVersion = "5.0.0(12)"`（对齐 ADR-0007 的 API 12+ 下限）；`signingConfigs: []`（不生成私钥，红线 4）。
   - `entry/src/main/module.json5`：`deviceTypes` 收窄为 `["phone", "tablet"]`（手机优先，2in1/wearable 非本期目标）。
   - `pages/Index.ets`：占位文案标明"骨架页，非业务 UI"。
   - 资源文件（图标 png / string.json / color.json / float.json / profile）随模板复制，保证构建期资源引用可解析。
3. 根 `.gitignore` 追加：`oh_modules/`、`entry/.cxx/`、`entry/build/`、`.hvigor/`、`build/`、`.hap`、`*.hap`、`local.properties`、`oh-package-lock.json5` 不忽略（锁文件提交）。
4. 更正环境事实两处。
5. 构建验证（§6）。

## 5 约束与风险

- **双平台 SDK 缺口（2026-11-23 网络核查更新）**：
  - 本机实测两套 SDK 均为 API 26：HarmonyOS SDK 在 `D:\Harmony\DevEco Studio\sdk\default`（26.0.0.105 / apiVersion 26）；OpenHarmony SDK 在 `%LOCALAPPDATA%\OpenHarmony\Sdk\26.0.0`（26.0.0.38 / apiVersion 26）。
  - DevEco 26.0.0.851 的 SDK Manager 中 **API 9 根本不存在**（列表最低 API 18：18/20/23/26），取消"隐藏过时的包"也不显示——API 9 = OpenHarmony 3.2 Release（2023-04），华为已归入"已停止维护的历史版本"，新版 IDE 不再集成。
  - 但 API 9 Public SDK 包仍可从华为云仓库手动下载（实测 HTTP 200）：
    - `https://repo.huaweicloud.com/openharmony/os/3.2-Release/ohos-sdk-windows_linux-public.tar.gz`（1,755,001,273 B / 1.6 GiB）
    - SHA256 文件：`https://repo.huaweicloud.com/openharmony/os/3.2-Release/ohos-sdk-windows_linux-public.tar.gz.sha256`
    - SHA256 = `4d10abec23d0d219baaac5db74a19ff7cad5f0c6a7fe17d873a88931c66373ab`
  - **风险**：DevEco 26 的 hvigor 6.26.8（2026）与 API 9 SDK 工具链（2023）相差 3 年，手动放置旧 SDK 目录大概率不被新版 IDE 识别；要按原下限验证需另装 DevEco 3.1 Release。
  - 本计划产出的工程只验证 HarmonyOS 目标；纯 OpenHarmony(API 9+) 的 `runtimeOS` product 待 Owner 拍板，不伪造"双平台已验"。
- **构建期签名**：`signingConfigs` 留空，未签名 hap 仅用于编译验证，不可安装；真正出包（M4.1）需 Owner 提供 In-house 证书（红线 5：升级校验签名）。
- **目录名禁忌**：`app/entry/build/` 等为 DevEco 生成物目录，列入 `.gitignore`，不作为源码目录管理，不违反"源码目录禁 build"的纪律。
- **共享路径串行写**：`docs/plan/` 属 Docs/Architect owner，本文件因红线 2（文档先行）由本次初始化任务创建；后续同目录写操作需串行。

## 6 验收（怎么验）

| # | 验收项 | 判据 |
|---|---|---|
| V1 | 骨架完整 | `app/` 含 `AppScope/app.json5`、`entry/src/main/module.json5`、`build-profile.json5`、`hvigorfile.ts` 等必需文件 |
| V2 | 配置正确 | bundleName / runtimeOS / compatibleSdkVersion 与本文 §4 一致；`signingConfigs` 为空 |
| V3 | 构建通过 | `hvigorw --mode module -p module=entry@default -p product=default assembleHap` 退出码 0（若因缺 API 12 SDK 失败，记录为受限项，不伪造通过） |
| V4 | 忽略链生效 | `git status --short` 不出现 `oh_modules/`、`build/`、`.hvigor/` 条目 |
| V5 | 纪律门禁 | `node tools/check-docs.mjs` 退出码 0 |
| V6 | 事实一致 | 根 `AGENT.md` §7、`app/AGENT.md` §3 不再声称"本机无 DevEco" |

### 验收结果（2026-11-23 实测）

- V1/V2/V6：PASS。`app/` 骨架完整，`build-profile.json5` 无重复键，`signingConfigs: []`；两份 AGENT 环境事实已更正。
- V3：**PASS**。`hvigorw --mode module -p module=entry@default -p product=default assembleHap --no-daemon` → `BUILD SUCCESSFUL in 48 s 157 ms`，34/34 任务执行，退出码 0；产物 `app/entry/build/default/outputs/default/entry-default-unsigned.hap`。
  - 告警 1：模板 `EntryAbility.ets:9` `setColorMode` 可能抛异常（模板自带，非本次引入）。
  - 告警 2：`Will skip sign 'hos_hap'. No signingConfigs profile`（预期，无签名配置）。
- V4：PASS。`git status --short` 无 `oh_modules/`、`.hvigor/`、`build/`、`*.hap` 条目（已忽略）。
- V5：PASS。`node tools/check-docs.mjs` → `check-docs: PASS`，退出码 0。

## 7 决策与未决

- 已定：工程落在 `app/`（与 `app/AGENT.md` 归属一致）；最小骨架，不写业务代码。
- 未决（进 `docs/open-questions.md` 由 Owner 拍板）：
  - **双平台下限（ADR-0007 变更）**：网络核查确认 DevEco 26 不提供 API 9 SDK 且旧 SDK 与新工具链相差 3 年。选项：(A) 把下限放宽到 API 18+（本机可用），走 issue+PR 改 ADR-0007；(B) 另装 DevEco 3.1 + API 9 SDK，按原下限验证；(C) 本期只验 HarmonyOS 目标，OpenHarmony 后置。**需 Owner 拍板，AI 不自行决定**。
  - 是否 now 进入 M3.4 业务代码。
