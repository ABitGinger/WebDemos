# WebDemos · 姜的演示厅

一些跑在浏览器里的小网页演示，只包含 html / css / js，**纯静态、零构建**。

- 🎪 演示厅主页：<https://abitginger.top/WebDemos/>
- 🎯 单个演示：`https://abitginger.top/WebDemos/demos/<slug>/`

> 主机名一律写 `abitginger.top` —— 那才是本账号的正式域名。`abitginger.github.io/...`
> 是同一个站点的别名，访问会 301 过去，路径完全一样。本文档下同。

主页上，每张卡片都是活的（封面由 canvas 现场程序化绘制）。点卡片会**就地放大占满屏幕**，
渐变出一个加载幕，然后把演示装进 iframe 跑起来——页眉页脚不动、不刷新页面。
想单独看就点卡片右上角的 `⤢`，新标签页打开它的独立地址。

---

## 加一个新演示

**把 [`ADDEMO.md`](./ADDEMO.md) 连同你的 html 一起发给 AI，说「按 ADDEMO.md 加进去」就行。**
那份文件把目录结构、字段规范、注意事项、检查清单都写死了。

手改也很快，三步：

1. 新建 `demos/<slug>/index.html`（把演示丢进去，资源也放同一个文件夹）
2. 在 `demos.json` 的 `demos` 数组里加一条（`slug` 要和目录名一致）
3. `python scripts/check.py` 全是 0 错误，提交

独立地址 `/WebDemos/demos/<slug>/` 是**自动生成**的，不用做任何配置。

---

## 目录

```
index.html          演示厅主页
demos.json          唯一清单数据源
assets/hub.css      演示厅样式（.dm-* 前缀，可安全挂在任何页面上）
assets/hub.js       卡片渲染 / 程序化封面 / 点击放大展开
demos/<slug>/       一个演示一个文件夹，入口固定叫 index.html
scripts/check.py    清单与目录一致性校验
ADDEMO.md           新增演示的完整规范（给人和 AI 共用）
```

## 本地预览

```bash
python -m http.server 8000
# 主页        http://localhost:8000/
# 单个演示    http://localhost:8000/demos/<slug>/
```

> 直接双击 html 用 `file://` 打开是看不到演示列表的——主页要 `fetch` 同一目录下的
> `demos.json`，浏览器会以跨域为由拦掉。必须走 http 服务。

## 部署

**这个仓库的 GitHub Pages 就是正式站点，push 到 `main` 即上线**（零构建：仓库里的
文件就是站点产物）。工作流见 [`.github/workflows/pages.yml`](./.github/workflows/pages.yml)。

首次需要在仓库 `Settings → Pages → Source` 里选 `GitHub Actions`，**这一步只能手动点**。
`configure-pages` 的 `enablement: true` 看着像能自动开，实际不行——它需要 PAT 或
GitHub App 令牌，工作流自带的 `GITHUB_TOKEN` 去建 Pages 站点会直接报
`Resource not accessible by integration`。所以工作流里不带这个开关。

### 地址为什么是 `/WebDemos/`

GitHub Pages 的路径规则只有两条，没有第三条：

| 仓库 | 发布到 |
| --- | --- |
| `ABitGinger.github.io`（根站，仓库名必须等于 `<用户名>.github.io`） | `/` —— **站内路径随便起** |
| 其他仓库（项目站点） | `/<仓库名>/` —— 路径**等于仓库名，不可配置** |

**自定义域名只换主机名，不换路径。** 主站的正式域名是 `abitginger.top`，于是它名下的
项目站点全部平移成 `abitginger.top/<仓库名>/`：

```
abitginger.github.io/mcdoc/   →   abitginger.top/mcdoc/
```

所以本仓库的地址前缀只能是 `/WebDemos/`。曾经用过 `/demo/` —— 那是把内容复制进主站
根站目录的做法，跨仓库复制没必要，已经废弃。

### 和主站的关系（两条很轻的耦合）

1. 主站首页的 `<head>` 预加载了 `/WebDemos/assets/hub.css` 与 `/WebDemos/assets/hub.js`。
   这是必要的：主站的「静默跳转」只替换 `<main>`、不会重新加载 `<head>` 里的资源，
   所以首页点「🧪 演示厅」时得靠预先加载好的这两个文件把卡片渲染出来（主站 `/repos/`
   的 `js/repos.js` 同理）。反过来说，这两个文件**同时服务两个宿主**，改动既有行为前
   要整体考虑；它们用 `.dm-` 前缀 + `body.dm-standalone` 做了隔离，挂在主站上不会
   污染主站样式。
2. 演示厅的 favicon 写的是 `../favicon.ico`，也就是主站根目录那个（同源，取得到）。

除此之外两个仓库互不相干：本仓库改了直接生效，不需要主站重新构建。
