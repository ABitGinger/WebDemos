# WebDemos · 姜的演示厅

一些跑在浏览器里的小网页演示，只包含 html / css / js，**纯静态、零构建**。

- 🎪 演示厅主页：<https://abitginger.github.io/demo/>
- 🎯 单个演示：`https://abitginger.github.io/demo/demos/<slug>/`
- 🧪 仓库预览（同一份内容）：<https://abitginger.github.io/WebDemos/>

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

独立地址 `/demo/demos/<slug>/` 是**自动生成**的，不用做任何配置。

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

`/demo/` 不是本仓库的 Pages，而是主站 `ABitGinger.github.io` 在构建时把本仓库
clone 进它的 `demo/` 目录后一起发布的（见主站的 `.github/workflows/static.yml`）。
本仓库推完代码后，主站的定时任务最迟 1 小时内会同步；想立刻生效就在主站 Actions 里
手动跑一次构建，或在本仓库配置 `HOMEPAGE_DISPATCH_TOKEN` 让 push 自动触发（见
[ADDEMO.md](./ADDEMO.md) 第 5 节）。
