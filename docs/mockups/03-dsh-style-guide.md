---
audience: dsh-open-harmony-app mockup 子代理、前端工程师、设计还原评审
kind: design
authority: 高（token 原样来自 DSH submodule：vendor/deepseek-harness，不可改写）
status: 生效（决策已定：DSH 主题 CSS 原样内联进 mockup；不用鸿蒙样式，不另写样式）
depends_on: vendor/deepseek-harness/packages/client/ui-theme/src/styles/base.css, vendor/deepseek-harness/packages/client/ui-theme/src/styles/design-platform.css
---

# DSH 主题 CSS 抽取与样式指南

本文件是 mockup 用色的**唯一权威说明**。配套文件 `dsh-theme.css` 是 `base.css` + `design-platform.css` 的逐字节原样拼接，任何视觉还原都必须直接消费其中的 token，不得重新定义近似值。

## 1. 来源与字节数

| 来源 | 字节数 | 内容 |
| --- | --- | --- |
| `vendor/deepseek-harness/packages/client/ui-theme/src/styles/base.css` | 1933 B | 字体栈、圆角阶梯、动效曲线、settings-card 材质别名 |
| `vendor/deepseek-harness/packages/client/ui-theme/src/styles/design-platform.css` | 29861 B | 全部静态色板与语义别名，含亮色与暗色两套 |
| `docs/mockups/dsh-theme.css`（拼接产物） | **31865 B**（约 31.1 KiB / 31.9 KB） | 先 `base.css`，中间两行核对注释，再 `design-platform.css` |

拼接顺序与核对标记：

```css
/* ...base.css 原文... */
/* === end of base.css === */
/* ...design-platform.css 原文... */
/* === end of design-platform.css === */
```

**已自检**：包含 `:root`、`body[data-ds-dark-theme]`、`--dsw-alias-bg-base`、`--dsw-radius-panel`；**不含** `@import`、`url(`、`@font-face`；`--dsw-` 出现 **717** 次。文件为 UTF-8。

**为什么原样内联，而不是重写或引用 submodule 路径**：

1. **零外部依赖**：两个源文件本身自包含（无 `@import` / `url()` / 外部字体）。内联后单个 HTML 即可离线打开，不依赖构建时解析 submodule 路径，也不会因 submodule 更新导致 mockup 静默漂移。
2. **明暗两套齐全**：亮色（`:root` + `body`）与暗色（`body[data-ds-dark-theme]`）一起带入，无需自己补任何暗色分支。
3. **它们是 DSH 视觉真源**：这些 token 就是 DSH Web 客户端实际消费的值。按用户决策「都用 dsh 的标准样式，不用鸿蒙的样式，也不用自己写样式，直接调用 submodule 中的样式」，原样搬运优先于任何「看起来差不多」的手写。

## 2. token 前缀与主题切换

| 前缀 | 层级 | 典型成员 |
| --- | --- | --- |
| `--dsw-*` | **主设计 token**（消费层） | `--dsw-static-*`（不可直接用的色板）、`--dsw-alias-*`（唯一允许在功能样式里用的语义别名）、`--dsw-font-*`、`--dsw-radius-*`、`--dsw-elevation-*`、`--dsw-shadow-*` |
| `--dsh-*` | **引导 / 用户设置层** | `--dsh-font-family-text-default`、`--dsh-font-family-code-default`、`--dsh-font-family-text`（用户字体列表）、`--dsh-content-font-size`、`--dsh-hairline-width` |
| `--ds-*` | **动效 / 代码** | `--ds-ease-in-out`、`--ds-transition-duration{,-fast,-slow}`、`--ds-font-family-code` |

主题落点：

- **亮色**：`base.css` 的 `:root` 定义字体与圆角；`design-platform.css` 的 `body` 定义亮色静态色板与全部亮色 `--dsw-alias-*`。
- **暗色**：`design-platform.css` 的 `body[data-ds-dark-theme]` 定义同名的完整暗色覆盖。
- **切换方式**：只需在 `<body>` 上 toggle `data-ds-dark-theme` 属性，例如 `document.body.toggleAttribute('data-ds-dark-theme')`。**不要**另写 `prefers-color-scheme` 分支或自己的 `.dark` 选择器。

> 注意：`--dsh-hairline-width` 由主题运行时在 document root 发布，不在本次拼接的两个源文件中；mockup 需写成 `var(--dsh-hairline-width, 0.5px)` 或直接写 `0.5px`。

## 3. 可直接使用的一级语义别名清单

下表只列 mockup 高频别名。映射中的 `neutral-bluish-*` / `deepseek-*` 等指拼接文件里的静态色板 token；「亮色含义 / 暗色含义」给出其解析后的实际视觉。

| 变量名 | 亮色含义 | 暗色含义 | 适用场景 |
| --- | --- | --- | --- |
| `--dsw-alias-bg-base` | `neutral-bluish-00` 纯白画布 | `neutral-bluish-950` rgb(21,21,23) 近黑 | 页面根背景 |
| `--dsw-alias-bg-layer-1` | `neutral-bluish-00` 白 | `neutral-bluish-875` rgb(35,35,36) | 一级内容层 |
| `--dsw-alias-bg-layer-2` | `neutral-bluish-00` 白 | `neutral-bluish-850` rgb(44,44,46) | 二级层 / 设置卡片底 |
| `--dsw-alias-bg-layer-3` | `neutral-bluish-00` 白 | `neutral-bluish-800` rgb(53,54,56) | 三级层 / 抬升容器 |
| `--dsw-alias-label-primary` | `neutral-bluish-1000` 近黑 | `neutral-bluish-50` rgb(249,250,251) 近白 | 标题、正文主文本 |
| `--dsw-alias-label-secondary` | `neutral-bluish-700` 中灰 | `neutral-bluish-300` 浅灰 | 次要说明文字 |
| `--dsw-alias-label-tertiary` | `neutral-bluish-600` 灰 | `neutral-bluish-400` 灰 | 时间戳、辅助提示 |
| `--dsw-alias-border-l1` | `rgba(0,0,0,.04)` | `rgba(255,255,255,.06)` | 最轻分割线 |
| `--dsw-alias-border-l4` | `rgba(0,0,0,.16)` | `rgba(255,255,255,.2)` | 最强中性边框；elevation 描边默认色 |
| `--dsw-alias-link` | `deepseek-500` rgb(65,118,230) | `deepseek-400` rgb(122,170,255) | 可点击链接，配 `font-weight: 500` |
| `--dsw-alias-button-primary-fill` | 等于 `brand-primary` → `neutral-bluish-1000` 近黑 | `neutral-bluish-50` 近白 | 主按钮填充 |
| `--dsw-alias-card-fill` | `neutral-50` rgb(250,250,250) | `neutral-850` rgb(33,33,35) | 卡片、计划/交付物卡底 |
| `--dsw-alias-state-success-primary` | `green-500` rgb(34,197,94) | `green-500` 同色 | 成功态图标 / 文本 |
| `--dsw-alias-state-error-primary` | `red-600` rgb(236,19,19) | `red-400` rgb(242,90,90) | 错误态 |
| `--dsw-alias-state-warn-primary` | `amber-500` rgb(245,158,11) | `amber-500` 同色 | 警告态 |
| `--dsw-alias-state-done-primary` | `violet-600` rgb(124,58,237) | `violet-400` rgb(167,139,250) | 完成态 |
| `--dsw-alias-settings-card-fill` | 等于 `bg-layer-2`（白） | 等于 `bg-layer-2`（深） | 设置页卡片填充（定义在 `base.css` 的 `body`） |
| `--dsw-alias-settings-card-stroke` | 等于 `border-l4` | 等于 `border-l4` | 设置页卡片描边（定义在 `base.css` 的 `body`） |
| `--dsw-elevation-panel` | 0.5px 发丝描边 + 两层极淡柔光 | 同结构，靠描边分离 | **浮层投影**；不在拼接文件中，见下方说明 |
| `--dsw-shadow-lv1` | `0 2px 4px 0 rgba(0,0,0,.05)` | 同值 | 一级静态阴影；不在拼接文件中 |
| `--dsw-shadow-lv2` | 两层淡阴影叠加 | 同值 | 二级静态阴影；不在拼接文件中 |
| `--dsw-shadow-lv3` | 三层阴影（含 12px 32px 大扩散） | 同值 | 三级静态阴影；不在拼接文件中 |

### elevation / shadow 需单独补的一小段

`--dsw-elevation-panel` 与 `--dsw-shadow-lv1..3` 定义在 `gradient-shadow-text.css`，**不在**本次拼接的 `base.css` + `design-platform.css` 中。按「原样内联」决策，`dsh-theme.css` 保持两文件拼接、不擅自混入第三文件。mockup 若需要浮层或阴影，必须在自己的 `<style>` 中原样补下面这一小段；**不得自造阴影值或描边宽度**。

```css
/* 原样摘自 gradient-shadow-text.css；仅在需要浮层/阴影的 mockup 中补此段 */
body {
  --dsw-shadow-lv1: 0 2px 4px 0 rgba(0, 0, 0, 0.05);
  --dsw-shadow-lv1-blur: 0 4px 12px 0 rgba(0, 0, 0, 0.02);
  --dsw-shadow-lv2: 0 4px 12px 0 rgba(0, 0, 0, 0.02), 0 2px 8px 0 rgba(0, 0, 0, 0.04);
  --dsw-shadow-lv3:
    0 0 1px 0 rgba(0, 0, 0, 0.2), 0 0 4px 0 rgba(0, 0, 0, 0.02), 0 12px 32px 0 rgba(0, 0, 0, 0.08);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l4);
}
body[data-ds-dark-theme] [data-menu-material] {
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l3);
}
body,
body * {
  --dsw-elevation-stroke: 0 0 0 0.5px var(--dsw-elevation-stroke-color);
  --dsw-elevation-panel:
    var(--dsw-elevation-stroke), 0 3px 8px 0 rgba(0, 0, 0, 0.03), 0 0 16px 0 rgba(0, 0, 0, 0.02);
}
```

## 4. 字体栈与圆角（原文取值）

来自 `base.css`，已原样进入 `dsh-theme.css`：

```css
:root {
  --dsh-font-family-text-default: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --dsw-font-family: var(--dsh-font-family-text-default);
  --dsw-radius-xs: 4px;
  --dsw-radius-sm: 8px;
  --dsw-radius-md: 12px;
  --dsw-radius-lg: 16px;
  --dsw-radius-xl: 20px;
  --dsw-radius-panel: 28px;
}
body {
  --dsw-font-family: var(--dsh-font-family-text, var(--dsh-font-family-text-default)), var(--dsh-font-family-text-default);
}
```

字体使用要点：`--dsw-font-family` 在 `body` 上被重新绑定，用户字体列表 `--dsh-font-family-text` 优先、内置栈兜底；未设置时重复内置栈是故意的，字体匹配会忽略重复项。代码字体走 `--ds-font-family-code`，品牌字体走 `--dsw-font-family-brand`。圆角**只用上面六级**，现圆/胶囊需按主题规则补 `corner-shape: round`（mockup 不涉及时可省略）。

## 5. 硬规则（源自 `docs/web-styling.zh.md` 16–33 行）

1. **只用语义 token**：功能样式只消费 `--dsw-alias-*`；禁止复制 `--dsw-static-*` 静态色板值，禁止写十六进制、`white`、`black` 或颜色函数字面量（`box-shadow`、遮罩属性、alpha 为 0 的值属于显式豁免）。
2. **浮层三件套**：菜单、浮层、对话框、面板等高层级表面设 `border: 0`，使用 `box-shadow: var(--dsw-elevation-panel)`（或 `--dsw-elevation-prominent` / 输入框 `--dsw-elevation-soft`）；**不得**把 `--dsw-alias-border-*` 真 border 与 lv/elevation 投影配对。
3. **发丝边框**：中性边框与分割线一律 `0.5px`，使用 `var(--dsh-hairline-width, 0.5px)`；状态色 border（warn 面板）与 dashed 记号保持 1px。
4. **hover 条件化**：`:hover` 规则必须写在 `@media (hover: hover)` 内；选中、展开、按下、键盘焦点样式留在该条件之外，并保留可见的键盘焦点。
5. **不在功能 CSS 写明暗主题选择器**：主题覆盖归主题所有方；mockup 只 toggle `body[data-ds-dark-theme]`，不写 `body[data-ds-dark-theme] .xxx { ... }` 调色。
6. **组件行为参考 ui-primitives API，但 mockup 用原生元素复刻**：不引入组件库或 Tailwind。由于 mockup 不加载 CSS Module，**禁止伪造模块类名**——`class="button primary"` 这类写法不会生效；请直接用原生标签 + 内联 `dsh-theme.css` 的语义 token 实现观感。
7. 字号必须与行高配对，优先使用主题排版变量（如 `--dsw-font-s-14`、`--dsw-font-markdown-*`）；有匹配角色时不要自造字号。

## 6. 给下游两个 mockup 子代理的「允许补充的极小量 CSS」白名单

`dsh-theme.css` 只提供 token，不提供布局。除 token 文件本身外，mockup 的 `<style>` 中**只允许**以下两类补充：

**A. 纯布局结构属性（无视觉语义）**

- `display`、`grid-template-columns/rows`、`grid-area`、`flex-direction`、`flex-wrap`、`flex`、`align-*`、`justify-*`
- `gap`、`row-gap`、`column-gap`
- `width`、`height`、`min/max-width`、`min/max-height`、`box-sizing`
- `padding`、`margin`、`overflow`、`position`、`top/right/bottom/left`、`inset`、`z-index`
- 仅用于位移的 `transform: translate(...)`

**B. token 未覆盖的个别情况（需注明原因）**

- 手机外壳的设备边框、刘海、边框宽度等纯结构尺寸；
- 状态变体专用间距（如成功/错误提示与图标的 gap）；
- 上述 elevation / shadow 第 3 节那段原样补入。

**仍然强制的约束**：任何**颜色、字体、圆角、阴影、焦点**一律 `var(--dsw-*)`（含 `--dsw-alias-*`、`--dsw-elevation-*`、`--dsw-shadow-*`、`--dsw-radius-*`），不得出现字面量；不得新增或覆盖 `:root` token；不得复制静态色板；不得写 `hex`/`white`/`black`；不得写暗色选择器或 `prefers-color-scheme`；不得引入外部 CSS、组件库、Tailwind 或伪造 CSS Module 类名。超出白名单的样式需求先回到本文件第 3/4 节找已有 token，确实缺失再上报，不要自行发明。
