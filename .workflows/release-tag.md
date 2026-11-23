# release-tag — 版本发布 SOP

替代 `docs/RECORD.md`，用 tag + Release 承载记录。遵循 ADR-0006：**merge 不发布，只有显式 tag 触发 publish**。

## 步骤

1. 变更经 PR + CI 绿 + merge 进 main（禁止直接 push，ADR-0006）。
2. 确认 milestone 下所有 issue 已 close。
3. 更新根 `CHANGELOG.md`：本次变更（feat/fix/breaking），经 PR merge。
4. **手动**打 tag：`v<major>.<minor>.<patch>` / `plugin-v*` / `app-v*`（semver），推到 origin。
5. tag push 自动触发 `.github/workflows/publish.yml`：校验门禁与 CHANGELOG → 发 GitHub Release（正文贴 CHANGELOG；附件放 app hap + plugin tarball，附 SHA-256）。
6. 普通 merge **不触发** publish；需要时可用 `workflow_dispatch` 指定已有 tag 重发。

## 校验（禁静默自更新）

- app hap：验签名 + SHA-256（In-house 证书）。
- plugin tarball：npm/GitHub integrity（SHA-512）+ GitHub tag 的 SHA-256。

## tag 命名约定

- plugin 发布 tag 与 app 发版 tag 分开：`plugin-v0.1.0` / `app-v0.1.0`（或统一 `v0.1.0`，按 Q6 范围决定）。
