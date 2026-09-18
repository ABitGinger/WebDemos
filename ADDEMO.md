# ADDEMO.md · 新增一个演示（可直接发给 AI 的操作手册）

> **这份文件就是「发给 AI 的那份 md」。**
> 下次做完一个新的小网页，把**这份文件 + 新的 html 文件**一起丢给 AI，并说一句
> 「按 ADDEMO.md 把新演示加进 WebDemos 仓库」，它就能照着这里的规范把演示接进去。
> 以下所有规则都是硬性的，AI 请逐条照做，不要自行发挥目录结构。

---

## 0. 先搞清楚这个仓库是什么

`WebDemos` 是**纯静态**的演示集合仓库，源码即产物：

| 项目 | 值 |
| --- | --- |
| 仓库 | `ABitGinger/WebDemos` |
| 演示厅主页（正式） | `https://abitginger.github.io/demo/` |
| 单个演示 | `https://abitginger.github.io/demo/demos/<slug>/` |
| 仓库预览（同一份内容的备份地址） | `https://abitginger.github.io/WebDemos/` |
| 主站 | `ABitGinger/ABitGinger.github.io`（`/demo/` 由它构建时同步生成） |

`/demo/` **不是**这个仓库的 GitHub Pages，而是主站 `ABitGinger.github.io` 在
构建时 `git clone` 本仓库、整份复制进它自己的 `demo/` 目录后一起发布的。
所以本仓库推完代码后，还需要主站重新构建一次才能上线（见第 5 节）。

---

## 1. 目录结构（不许改）

```
WebDemos/
├─ index.html              演示厅主页：清单在 <main> 里，页眉页脚只用于独立访问
├─ demos.json              ★ 唯一的清单数据源，加演示就是改这里
├─ assets/
│  ├─ hub.css              演示厅样式（.dm-* 前缀 + body.dm-standalone 两段）
│  └─ hub.js               演示厅逻辑：渲染卡片 / 程序化封面 / 点击放大展开
├─ demos/
│  ├─ SOURCES.md           收录来源记录（自动生成，手改也行）
│  └─ <slug>/              ★ 一个演示一个文件夹
│     └─ index.html        演示入口，文件名必须叫 index.html
├─ scripts/
│  ├─ check.py             清单与目录的一致性校验
│  └─ vendor_demos.py      一次性搬运脚本，平时不用管
└─ .github/workflows/      部署与通知
```

**一个演示 = 一个文件夹 + `index.html`。** 文件夹名（即 `slug`）会成为 URL 的一段，
所以叫 `/demo/demos/<slug>/` 这个独立地址是**自动生成**的，不需要额外配置。

不需要构建、不需要 `npm`、不需要打包。写什么就是什么。

---

## 2. 加一个演示：五步

### 第 1 步 · 定 slug

- 只能用小写字母、数字、连字符；不能有中文、空格、下划线、大小写混用。
- 用能看懂意思的英文，例如 `study-noise`、`engine-injection`、`pixel-clock`。
- 全仓库唯一，不能和已有目录重名。

### 第 2 步 · 放文件

```
demos/<slug>/index.html      ← 必须
demos/<slug>/...             ← 该演示自己的 css / js / 图片，随便放，但都要在文件夹内
```

**硬性要求（很重要，逐条检查）：**

1. **自包含**：演示文件夹里不能引用仓库外的路径（尤其不能出现
   `/css/style.css`、`/js/script.js` 这类主站绝对路径）。整个文件夹拷到任何地方都要能跑。
2. **相对路径**：文件夹内部互相引用一律用相对路径（`./app.js`、`./cover.png`）。
3. **文件名用 ASCII**：不要中文名、不要空格（避免 URL 编码踩坑）。
4. **别引第三方 CDN 之外的构建产物**：允许用 CDN（例如 `unpkg.com` 上的 three.js，
   仓库里的 `engine-injection` 就是这么用的），但不要引入 `node_modules`。
5. **不要放大文件**：单张图片尽量 < 500KB；视频/模型这类大文件请自行外链。
6. **可以全屏**：演示给自己设 `position:fixed; inset:0` 也没问题，
   它在演示厅里是被 `<iframe>` 装的，不会影响主页。

### 第 3 步 · 加「返回演示厅」胶囊（推荐）

演示厅里用的是内嵌 iframe，主页已经有返回按钮了；但**独立打开**这个 URL 时
（`/demo/demos/<slug>/`）用户会需要一个回去的路。所以推荐在演示的
`</body>` 前原样粘这一段——它被 iframe 装时会**自动把自己删掉**，独立访问才出现：

```html
<!-- ↓↓↓ 演示厅 SDK：独立访问时提供「返回演示厅」入口；被演示厅内嵌（iframe）时自动隐藏 -->
<a id="wb-back" href="../" title="返回演示厅">← 演示厅</a>
<script>(function(){if(window.self!==window.top){var e=document.getElementById('wb-back');if(e)e.parentNode.removeChild(e);}})();</script>
<style>
#wb-back{position:fixed;left:12px;bottom:12px;z-index:2147483000;display:inline-flex;align-items:center;
  padding:6px 13px;border-radius:999px;text-decoration:none;color:#fff;opacity:.42;
  font:600 12px/1.2 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif;
  background:rgba(0,0,0,.5);border:1px solid rgba(223,182,95,.6);
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
  transition:opacity .25s ease,transform .25s ease}
#wb-back:hover{opacity:1;transform:translateY(-1px)}
</style>
<!-- ↑↑↑ 演示厅 SDK 结束 -->
```

`href="../"` 是相对路径，正好回到 `/demo/`（或仓库预览的 `/WebDemos/`），不要改成绝对地址。

### 第 4 步 · 写进 demos.json

在 `demos` 数组里加一项。**顺序随意**，演示厅按数组顺序渲染（想置顶就往前放）。

```json
{
  "slug": "pixel-clock",
  "title": "像素时钟",
  "description": "一句话到三句话说清它是什么、能玩什么。会显示在卡片正文里，最多 4 行，超了自动省略。",
  "tags": ["小工具", "Canvas"],
  "date": "2026-09-18",
  "accent": ["#7dd3fc", "#0c4a6e"],
  "glyph": "🕰️",
  "coverArt": "waves",
  "entry": "index.html"
}
```

字段规范：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `slug` | ✅ | 必须和 `demos/<slug>/` 的目录名**完全一致** |
| `title` | ✅ | 卡片标题，短，10 字以内最好 |
| `description` | ✅ | 卡片简介。中文标点，别写 HTML |
| `tags` | ✅ | 字符串数组，**最多 4 个**（卡片上只显示前 3 个），会参与筛选 |
| `date` | ✅ | `YYYY-MM-DD` |
| `accent` | 建议 | `[亮色, 暗色]` 两个十六进制颜色，决定卡片封面的主色调 |
| `glyph` | 建议 | 一个 emoji，贴在封面右下角，方便一眼认出来 |
| `coverArt` | 建议 | 程序化封面画法，见下表，没有就 `aurora` 兜底 |
| `entry` | 可选 | 默认 `index.html`，一般不用写 |
| `featured` | 可选 | 预留字段，目前不影响排序 |

`coverArt` 可选值（都在 `assets/hub.js` 的 `ART` 对象里，想加新的就往那儿加）：

| 值 | 画出来的东西 | 适合 |
| --- | --- | --- |
| `dots` | 一片疏密不均的点阵，像一教室人在说话 | 模拟、粒子、群体行为 |
| `spray` | 喷嘴 + 锥形油束 + 液滴 | 流体、喷射、机械 |
| `wave` | 层层叠叠的正弦波纹 | 信号、音频、数学 |
| `grid` | 蓝图网格 + 同心结构 | 工程图、算法、布局 |
| `aurora` | 团块状极光渐变（兜底） | 别的都不合适时 |

**不要**为了封面去截图或放图片文件。程序化封面意味着新增演示零素材成本，
色调也能自动跟 `accent` 走。这是这个仓库的设计选择，请保持。

### 第 5 步 · 本地自检 + 提交

```bash
# 1) 清单和目录对得上吗（必须 0 错误）
python scripts/check.py

# 2) 起个本地服务看效果（直接双击 file:// 打开会因为 fetch 被拦而看不到列表）
python -m http.server 8000
#   → http://localhost:8000/            演示厅主页
#   → http://localhost:8000/demos/<slug>/   新演示的独立页面
```

**必须真的用浏览器点一遍**：卡片能不能点开、放大动画顺不顺、`⤢ 独立打开`是不是新标签页、
`Esc` / 点背景能不能关掉、手机上（窄窗）布局有没有炸。

提交信息用一句话说清做了什么，中文，**不加 `feat:` / `fix:` 这类前缀** ——
仓库现有历史就是这个风格，保持统一。一次提交别混多件事：

```
收录像素时钟 pixel-clock
补充 pixel-clock 的说明文案
修正窄屏下卡片间距
```

推上去之后，主站还需要重新构建才会更新 `/demo/`（见下）。

---

## 3. 绝对不要做的事

- ❌ 不要把演示直接写在根 `index.html` 里 —— 主页只负责列表和查看器。
- ❌ 不要给 `demos.json` 里的条目用中文 `slug`，也不要把 `slug` 和目录名写成不一样。
- ❌ 不要引用主站的 `/css/`、`/js/`、`/img/` —— `/demo/` 是主站的一部分，路径会串味，
  而且仓库预览地址下会 404。
- ❌ 不要为了「好看」去动 `assets/hub.css` / `assets/hub.js` 的**既有行为**：
  这两个文件同时被主站首页引入，改错会让主站一起坏。
  要改就整体考虑，并在 PR / commit 里说明。
- ❌ 不要往 `demos/<slug>/` 之外放演示资源。
- ❌ 不要引入需要构建才能跑的东西（Vue/React 的 SFC、TS、Sass、npm 依赖）。
  需要框架就用 CDN 的 UMD/ESM 版本，或者老老实实写原生。

---

## 4. 设计约定（照着做就长得像一家人）

- 主色：金色 `#dfb65f`（主站 `--accent`），深色玻璃卡片 `rgba(0,0,0,.45)` + `backdrop-filter: blur(6px)`。
- 圆角：卡片 20px，按钮胶囊 999px。
- 文案风格：轻松、口语、少用感叹号堆砌，可以自嘲；标题爱用「姜的 xxx」。
- 演示厅主页的类名一律以 `dm-` 开头；这个前缀是留给演示厅自己的，别在演示里用。

---

## 5. 上线：让 `/demo/` 更新

`/demo/` 的内容由主站 `ABitGinger.github.io` 的
`.github/workflows/static.yml` 在构建时同步（它会 clone 本仓库到 `demo/`）。
所以本仓库推完代码后：

- **什么都不用做**：主站每小时定时构建一次，最迟 1 小时后 `/demo/` 就是最新的。
- **想立刻生效**：去 `ABitGinger.github.io` 的 Actions 页面手动跑一次
  「Deploy static content to Pages」；或者在本仓库配好 Secret
  `HOMEPAGE_DISPATCH_TOKEN`（对主站仓库有 Actions 写权限的 PAT），
  之后本仓库每次 push 都会自动触发主站重建。

---

## 6. 交活前的检查清单

- [ ] `demos/<slug>/index.html` 存在，且整个文件夹自包含（无外部绝对路径）
- [ ] 「返回演示厅」胶囊已加入，且 `href="../"`
- [ ] `demos.json` 里新增了一条，`slug` 与目录名完全一致
- [ ] `python scripts/check.py` 输出「检查通过」，0 错误
- [ ] `python -m http.server` 起服务，在浏览器里点开、放大、独立打开、Esc 关闭都正常
- [ ] 窄窗口（手机宽度）下卡片和查看器都正常
- [ ] 提交信息是一句中文说明，没有加 `feat:` / `fix:` 前缀
