# AGENTS.md

这个仓库的完整操作规范写在 **[ADDEMO.md](./ADDEMO.md)** 里（给人和给 AI 看的是同一份）。
动手改任何东西之前，先把 ADDEMO.md 读完，尤其第 2 节「五步」和第 3 节「绝对不要做的事」。

三条最容易踩的，先列在这里：

1. **一个演示 = `demos/<slug>/index.html`**，同时要在 `demos.json` 里登记一条，
   两边的 `slug` 必须一字不差。加完跑 `python scripts/check.py`，必须是 0 错误。
2. **演示必须自包含**：只能引用自己文件夹内的资源，不允许出现 `/css/`、`/js/` 这类
   主站绝对路径 —— `/demo/` 是主站的一部分，路径会串味。
3. **`assets/hub.css` 和 `assets/hub.js` 同时被主站首页引入**，改动它们的既有行为
   会连带影响 `abitginger.github.io` 首页。要改就整体考虑并在提交里说明。

不需要构建、不需要 npm。改完的部署方式见 ADDEMO.md 第 5 节。
