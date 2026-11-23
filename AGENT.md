# AGENT.md — 唯一手册

本仓库的唯一手册：只写「不能做什么 + 去哪查」，不重复事实（事实进 `docs/`）。

## 1 权威层级与读序（≤3 份）

1. `docs/raw-ignore-by-git/raw-requirement.txt` —— 需求原文，权威最高，只读。
2. `docs/design/01-requirements-analysis.md` —— 需求解读（解读层，冲突以原文为准）。
3. `docs/plan/` —— 执行计划（`plan-<name>-<date>.md`，文档先行，可回溯）。

文档格式约定（五行头）见 `docs/README.md`。

## 2 红线（不能做什么）

1. **不改 deepseek-harness 源码**。插件通过 dsh 插件机制安装/卸载，不写入 DSH 安装目录；`vendor/deepseek-harness/` 是只读 submodule，禁止修改其内容。
2. **文档先行**：任何执行（含写代码）先落 `docs/plan/plan-<name>-<date>.md`，未写计划不动代码。
3. **契约同批改**：跨端字段/接口改动，同一批改完所有侧，只改一侧视为未完成。
4. **密钥不进仓**：私钥 / token / CA 私钥用精确 `.gitignore` 条目排除，禁用 `*.env*` 通配（会吞 `.env.example`）。
5. **升级必须校验**：版本升级走明确通道 + 大小 + SHA-256（App 侧 hap 另验签名，plugin 侧用 npm/GitHub integrity），禁静默自更新。
6. **远程通道默认关闭**：LAN 先行；开启时 tailnet 优先（TailMesh/HarmoTail），公网隧道（cloudflared/FRP/反代）兜底，不用时关闭。

## 3 提交纪律

- git 主仓库 + 分支保护：feature 分支 → PR → 评审 → 合并；bug/需求先开 issue。
- 提交信息用英文 conventional commits（`feat/fix/docs/chore/refactor`），PowerShell 下避免全角括号。
- 提交顺序：`git add <具体路径>`（不用 `-A`）→ commit → push。

## 4 路径职责（AGENT.md per key path）

> 需求 #10：每个关键路径一个 `AGENT.md` 控制该路径的 agent 纪律。缺文件即视为纪律不完整。

| 路径 | 纪律文件 | 职责 |
|---|---|---|
| `/` | `AGENT.md`（本文件） | 全局红线 + 索引 |
| `app/` | `app/AGENT.md` | 鸿蒙应用红线（纯原生 ArkTS/ArkUI/权限/通知/HUKS/更新） |
| `plugin/` | `plugin/AGENT.md` | 插件红线（进程内插件/网关/回环代理/配对/白名单/版本监控） |
| `docs/` | `docs/AGENT.md`（纪律）+ `docs/README.md`（地图） | 文档纪律 + 五行头约定 |
| `vendor/deepseek-harness/` | 无（只读） | 禁改 |

## 5 workflows（skill 注册）

SOP 一律固化为 skill，agent 通过 `use_skill` 加载，禁止各写各的 SOP。已建 skill：`github-collab`、`handoff`（见 `.codebuddy/skills/`，索引见 `.agent/README.md`）。

## 6 命令速查

```powershell
# 文档纪律门禁（R1 禁文文件缺失 / R2 必读文档存在）
node tools/check-docs.mjs
```

## 7 环境注意

- 本机当前**无鸿蒙环境**（DevEco Studio 未装），鸿蒙相关动作先做调研/文档，不做构建。
- Windows/中文环境：`.ps1` 脚本一律 ASCII（PowerShell 5.1 解码）；提交信息英文。
