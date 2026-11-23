# Third-Party Notices

本文件披露 dsh-open-harmony-app 仓库中**本项目以外**的组件许可与版权归属。所有条目依据实际 `LICENSE` / `package.json` / 锁文件核查（核查日期 2026-11-23），不臆造。本文件不改变各组件自身许可条款。

本项目自身许可见根目录 [LICENSE](LICENSE)（MIT，© 2026 kuaizhongqiang）。

## 1 只读 submodule：DeepSeek Harness（dsh 本体）

| 项 | 值 |
|---|---|
| 组件 | DeepSeek Harness |
| 位置 | `vendor/deepseek-harness/`（**只读 submodule，禁止修改**） |
| 版本 | `dsh-v0.2.3-alpha.2`（commit `4b399c39a6d1479cd84ca591b4d7c88e24d38a96`） |
| 来源 | https://github.com/deepseek-ai/deepseek-harness |
| 许可证 | MIT |
| 版权行 | Copyright (c) 2026 DeepSeek |

其完整许可文本见 `vendor/deepseek-harness/LICENSE`（未复制，避免与 submodule 内容脱节）。

### 1.1 dsh 内嵌第三方

dsh 自带生成的第三方声明：`vendor/deepseek-harness/THIRD_PARTY_NOTICES.md`（含 runtime npm 依赖、Bundled Python 等完整清单）与 `vendor/deepseek-harness/pnpm-lock.yaml`（精确版本）。**本仓库不复制其内容**，分发 dsh 时须随附该 submodule 内文件。

其中源码 vendored 到 dsh 的 Cordis 家族（均 MIT，各自保留上游 `LICENSE`，版权行 `Copyright (c) 2021-present Shigma`）：

| 目录（submodule 内） | 发布包名 | 许可证 |
|---|---|---|
| `vendor/cordis` | `@deepseek-ai/cordis` | MIT |
| `vendor/cosmokit` | `@deepseek-ai/cosmokit` | MIT |
| `vendor/schemastery` | `@deepseek-ai/schemastery` | MIT |
| `vendor/loader` | `@deepseek-ai/cordis-plugin-loader` | MIT |
| `vendor/include` | `@deepseek-ai/cordis-plugin-include` | MIT |
| `vendor/group` | `@deepseek-ai/cordis-plugin-group` | MIT |
| `vendor/timer` | `@deepseek-ai/cordis-plugin-timer` | MIT |
| `vendor/hmr` | `@deepseek-ai/cordis-plugin-hmr` | MIT |
| `vendor/logger-console` | `@deepseek-ai/cordis-plugin-logger-console` | MIT |

> 上游 commit 与本地修改记录在 `vendor/deepseek-harness/vendor/README.md`。以上均为只读引用，本仓库未修改。

## 2 App 测试依赖（ohpm，`app/entry/`）

版本依据 `app/entry/oh-package-lock.json5`（lockfileVersion 3）。

| 组件 | 版本 | 许可证 | 来源 URL | 说明 |
|---|---|---|---|---|
| `@ohos/hypium` | 1.0.30 | Apache-2.0 | https://ohpm.openharmony.cn/ohpm/@ohos/hypium/-/hypium-1.0.30.har | 测试框架，devDependency |
| `@ohos/hamock` | 1.0.0 | Apache-2.0 | https://ohpm.openharmony.cn/ohpm/@ohos/hamock/-/hamock-1.0.0.har | 测试 mock，devDependency |

**版权 / NOTICE**：Apache-2.0 由 OpenHarmony 项目发布，版权归各贡献者。其完整 `NOTICE` 文本随 ohpm `.har` 包分发（见上表来源 URL）；本仓库不复制 har 内部文件。分发含测试依赖的产物时应保留其 NOTICE。

## 3 Plugin npm 依赖（`plugin/`，包 `dsh-harmony`）

版本与许可证依据 `plugin/package-lock.json`（实际解析版本，可能与 package.json 的 semver 范围不同）。

| 组件 | 版本 | 许可证 | 来源 |
|---|---|---|---|
| `ws` | 8.23.0 | MIT | https://registry.npmjs.org/ws/-/ws-8.23.0.tgz |
| `typescript`（devDependency） | 5.9.3 | Apache-2.0 | https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz |
| `@types/node`（devDependency） | 24.19.2 | MIT | https://registry.npmjs.org/@types/node/-/@types/node-24.19.2.tgz |
| `@types/ws`（devDependency） | 8.18.2 | MIT | https://registry.npmjs.org/@types/ws/-/@types/ws-8.18.2.tgz |
| `undici-types`（`@types/node` 传递依赖） | 7.24.6 | MIT | https://registry.npmjs.org/undici-types/-/undici-types-7.24.6.tgz |

**Apache-2.0 NOTICE**：TypeScript 由 Microsoft 发布（Copyright (c) Microsoft Corporation），其 NOTICE 随 npm 包分发；本仓库仅将其作 devDependency（构建期），不进入 npm 发布产物（`package.json` `files` 仅含 `dist` 与 `README.md`）。

## 4 声明口径说明

- **本项目本体**（脚本、文档、`app/`、`plugin/` 自有代码）：MIT，© 2026 kuaizhongqiang，见根 `LICENSE`。
- **不复制 submodule 内容**：dsh 及其内嵌第三方的完整声明始终以 submodule 内文件为准（红线 ADR-0002）。
- **版本以锁文件为准**：ohpm 以 `oh-package-lock.json5`、npm 以 `package-lock.json`、dsh 以 submodule commit。
- 若新增依赖或升级版本，须同步更新本文件（由 `tools/check-licenses.mjs` 门禁校验已知集合）。
