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
| 演示厅主页（正式） | `https://abitginger.top/WebDemos/` |
| 单个演示 | `https://abitginger.top/WebDemos/demos/<slug>/` |
| 主站 | `ABitGinger/ABitGinger.github.io`（首页 `<head>` 预加载 hub 资源，见第 5 节） |

> 主机名一律写 `abitginger.top` —— 那才是本账号的正式域名。`abitginger.github.io/...`
> 是同一个站点的别名，访问会 301 过去，**路径完全一样**。

**`/WebDemos/` 就是本仓库自己的 GitHub Pages**，由 `.github/workflows/pages.yml`
在 push 到 `main` 时部署，零构建。曾经还有一套 `/demo/` 方案（让主站构建时 clone
本仓库、复制进它的 `demo/` 目录），已经废弃 —— 多一层跨仓库复制没有必要。

### URL 规则（别记错，很多人在这里绕圈）

GitHub Pages 的路径规则只有两条，没有第三条：

- 仓库名等于 `<用户名>.github.io` → 发布到 `/`，**站内路径随便起**；
- 其他仓库（项目站点）→ 发布到 `/<仓库名>/`，**路径等于仓库名，不可配置**。

**自定义域名只换主机名，不换路径。** 主站正式域名是 `abitginger.top`，它名下的项目
站点就全部平移成 `abitginger.top/<仓库名>/`：`abitginger.github.io/mcdoc/` 会 301 到
`abitginger.top/mcdoc/`（`mcdoc` 仓库自己的 `site_config.json` 里，`site_root_url`
也写死为 `/mcdoc/` —— 因为仓库就叫 `mcdoc`）。

所以本仓库的地址前缀只能是 `/WebDemos/`，**改不了**。想换前缀只有两条路：把仓库
**改名**，或者把内容塞进根站仓库（后者就是被废弃的 `/demo/` 方案）。

推论：**不要去改 `demos/` 下面目录的名字来凑路径** —— 目录名只决定
`/WebDemos/demos/<slug>/` 的后半段，和前缀无关。

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
└─ .github/workflows/      部署（pages.yml：push 到 main 即上线）
```

**一个演示 = 一个文件夹 + `index.html`。** 文件夹名（即 `slug`）会成为 URL 的一段，
所以叫 `/WebDemos/demos/<slug>/` 这个独立地址是**自动生成**的，不需要额外配置。

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
（`/WebDemos/demos/<slug>/`）用户会需要一个回去的路。所以推荐在演示的
`</body>` 前原样粘这一段——它被 iframe 装时会**自动把自己删掉**，独立访问才出现：

```html
<!-- ↓↓↓ 演示厅 SDK：独立访问时提供「返回演示厅」入口；被演示厅内嵌（iframe）时自动隐藏 -->
<a id="wb-back" href="../../" title="返回演示厅">← 演示厅</a>
<script>
/* 演示厅 SDK：href 由自身路径反推，换挂载点（/WebDemos/、/demo/…）或改层级都不用动这里。
   演示固定放在 <演示厅根>/demos/<slug>/ 下，所以砍掉这段尾巴就是演示厅根。 */
(function () {
  var a = document.getElementById('wb-back');
  if (!a) return;
  if (window.self !== window.top) { a.parentNode.removeChild(a); return; }
  var hall = location.pathname.replace(/demos\/[^/]+\/.*$/, '');
  if (hall && hall !== location.pathname) a.href = hall;
})();
</script>
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

`href="../../"` 是**两层**：演示在 `<演示厅根>/demos/<slug>/` 下，回到演示厅要上跳两层。
写成 `../` 会停在 `demos/` 目录（404）。后面那句脚本是为了不依赖层级 —— 它直接从
地址栏反推演示厅根，所以以后改目录结构（或换挂载点）它都不会错，`href` 上的
`../../` 只是没跑 JS 时的兜底。

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
  "coverArt": "wave",
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

`demos.json` 的**顶层**还有两个字段，整份文件各只有一处，跟单个演示无关：

| 字段 | 说明 |
| --- | --- |
| `title` | 演示厅页头的标题，显示成「🧪 姜的演示厅」 |
| `subtitle` | 页头计数行的后半句，整行是「共 N 个演示 · ⟨subtitle⟩」。所以**必须短**，一句话说完 —— 对照主站仓库展示页那句「共 13 个仓库 · 点击卡片可跳转到仓库主页」。改文案只改这里，不用碰代码。 |

页头版式（返回按钮在标题左边、计数行在下面）是刻意与主站 `/repos/` 对齐的，
所以那两行别加花活：标题就是白字 + 文字阴影，不做渐变、不加分隔线。

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

推上去约 1 分钟后，`abitginger.top/WebDemos/` 就是最新的（见第 5 节）。

---

## 3. 绝对不要做的事

- ❌ 不要把演示直接写在根 `index.html` 里 —— 主页只负责列表和查看器。
- ❌ 不要给 `demos.json` 里的条目用中文 `slug`，也不要把 `slug` 和目录名写成不一样。
- ❌ 不要引用主站的 `/css/`、`/js/`、`/img/` —— 演示跑在
  `abitginger.top/WebDemos/demos/<slug>/`，写 `/css/` 会指到主站根目录去；
  演示还会被 iframe 内嵌，路径更会串味。
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

## 5. 上线

**本仓库的 Pages 就是正式站点**（`abitginger.top/WebDemos/`），由
`.github/workflows/pages.yml` 在 push 到 `main` 时部署，零构建。

- **什么都不用做**：`git push` 到 `main`，约 1 分钟后线上就是最新的。
- **看进度**：本仓库的 Actions → 「部署演示厅」。
- **手动重跑**：Actions → 部署演示厅 → Run workflow。
- **首次部署**：仓库 `Settings → Pages → Source` 选 `GitHub Actions`，**只能手动点**。
  ⚠️ 不要用 `configure-pages` 的 `enablement: true` 去「自动打开」——它需要 PAT 或
  GitHub App 令牌才能建 Pages 站点，工作流自带的 `GITHUB_TOKEN` 会报
  `HttpError: Resource not accessible by integration`，这一步会直接把部署打断。

主站 `ABitGinger.github.io` 只做一件相关的事：它的首页 `<head>` 里预加载了
`/WebDemos/assets/hub.css` 与 `/WebDemos/assets/hub.js`，好让首页点「🧪 演示厅」时
能做同源静态跳转（只替换 `<main>`、不刷新页面，页眉页脚不动）。**所以改了这两个
文件不需要去改主站**；但如果改的是「既有行为」，仍然要整体考虑（见第 3 节）。

> 早先的 `/demo/` 方案是让主站构建时 clone 本仓库、复制进它自己的 `demo/` 目录，
> 已废弃 —— 跨仓库复制纯属多余，现在两边各部署各的。主站 `static.yml` 里对应的
> 同步步骤也已经删掉了。

---

## 6. 交活前的检查清单

- [ ] `demos/<slug>/index.html` 存在，且整个文件夹自包含（无外部绝对路径）
- [ ] 「返回演示厅」胶囊按第 3 步原样加入（`href="../../"` + 反推脚本，别只写 `../`）
- [ ] `demos.json` 里新增了一条，`slug` 与目录名完全一致
- [ ] `python scripts/check.py` 输出「检查通过」，0 错误
- [ ] `python -m http.server` 起服务，在浏览器里点开、放大、独立打开、Esc 关闭都正常
- [ ] 窄窗口（手机宽度）下卡片和查看器都正常
- [ ] 提交信息是一句中文说明，没有加 `feat:` / `fix:` 前缀
