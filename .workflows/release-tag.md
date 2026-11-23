# release-tag — 版本发布 SOP

替代 `docs/RECORD.md`，用 tag + Release 承载记录。

## 步骤

1. 确认 milestone 下所有 issue 已 close。
2. 更新根 `CHANGELOG.md`：本次变更（feat/fix/breaking）。
3. 打 tag：`v<major>.<minor>.<patch>`（semver），推到 origin。
4. 发 GitHub Release：正文贴 CHANGELOG；附件放 app 的 hap + plugin 的 tarball（附 SHA-256）。

## 校验（禁静默自更新）

- app hap：验签名 + SHA-256（In-house 证书）。
- plugin tarball：npm/GitHub integrity（SHA-512）+ GitHub tag 的 SHA-256。

## tag 命名约定

- plugin 发布 tag 与 app 发版 tag 分开：`plugin-v0.1.0` / `app-v0.1.0`（或统一 `v0.1.0`，按 Q6 范围决定）。
