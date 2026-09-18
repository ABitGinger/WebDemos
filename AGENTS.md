# AGENTS.md

这个仓库的完整操作规范写在 **[ADDEMO.md](./ADDEMO.md)** 里（给人和给 AI 看的是同一份）。
动手改任何东西之前，先把 ADDEMO.md 读完，尤其第 2 节「五步」和第 3 节「绝对不要做的事」。

三条最容易踩的，先列在这里：

1. **一个演示 = `demos/<slug>/index.html`**，同时要在 `demos.json` 里登记一条，
   两边的 `slug` 必须一字不差。加完跑 `python scripts/check.py`，必须是 0 错误。
2. **演示必须自包含**：只能引用自己文件夹内的资源，不允许出现 `/css/`、`/js/` 这类
   根路径 —— 演示跑在 `abitginger.top/WebDemos/demos/<slug>/`，写 `/css/` 会指到主站
   根目录去；而且演示还会被演示厅用 iframe 内嵌，路径更会串味。
3. **`assets/hub.css` 和 `assets/hub.js` 同时被主站首页的 `<head>` 引入**
   （主站静态跳转只替换 `<main>`、不会加载新样式，所以必须预加载）。改动它们的既有
   行为会连带影响 `abitginger.top` 首页。要改就整体考虑并在提交里说明。

不需要构建、不需要 npm —— **仓库里的文件就是站点产物，push 到 main 即上线**，
详见 ADDEMO.md 第 5 节。
