---
读者: 全体 Agent / 负责人
类型: decision
权威: 高
状态: 生效（取代 ADR-0007 的 Q1 硬承诺；其余决策不变）
---

# ADR-0009 API 9 改为机会性适配（2026-11-23）

- **决策（负责人）**：**API 9 不纠结，能适配就适配，不能适配就算了。**
  - **取代** ADR-0007 的 Q1「两个都支持（NEXT API12+ + 纯 OpenHarmony API9+）」这一硬承诺。
  - 新口径：**优先把 HarmonyOS / API 12+ 目标做通做稳**；纯 OpenHarmony **API 9 为机会性目标**——在适配层能低成本覆盖时顺带支持，成本过高/工具链不兼容时**明确后置，不阻塞交付、不算未完成**。
  - ADR-0007 的 Q7/Q8/Q9（版本直查 GitHub、配对 CA 绑定、无二进制上传端点）**继续有效，不受影响**。
- **为什么**：本机 DevEco 26 的 SDK Manager 无 API 9（最低 API 18），旧 API 9 SDK 需手下 1.6 GB 且与 hvigor 6.26.8 相差 3 年、大概率不被识别（见 `plan-harmony-env-init` §5）。为已经停维的 API 9 投入专门工具链不划算；负责人据此把"双平台都支持"从硬约束降为机会性目标。
- **影响面**：
  - **build-profile**：当前 `compatibleSdkVersion = 5.0.0(12)` / `runtimeOS = HarmonyOS` **保持不变**（API 12 下限已满足优先目标）。不为 API 9 新建 product。
  - **PlatformAdapter（02 §2.1.1 / 06 §7）**：抽象层继续保留（对未来多平台有用），但 API 9 的实现项从"必须交付"降为"机会性"；`tls.capability()` 在某平台返回 `none` 时拒连不降级的**安全策略不变**（ADR-0008）。
  - **plan**：M4 不再被"双平台下限未决"阻塞，仅剩 In-house 签名证书；Q10 / issue #21 以此决策关闭。
  - **远程通道**：tailnet 优先不变；API 9 设备若无 TailMesh/HarmoTail，公网隧道兜底（机会性）。
- **不做**：不改历史 ADR-0007 文件（决策台账只追加）；不为 API 9 安装 DevEco 3.1 旧工具链；不在适配层为 API 9 写专门的降级 hack 拖累主线。
