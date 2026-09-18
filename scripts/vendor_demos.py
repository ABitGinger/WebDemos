#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把下载目录里的两个演示收进 demos/，并注入「返回演示厅」胶囊。

用法：
    python scripts/vendor_demos.py

说明：这是一次性的搬运脚本，保留在仓库里只是为了记录来源与注入方式；
新增演示时不需要跑它（见 AGENTS.md）。
"""
import io
import os
import re
import shutil
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOWNLOADS = os.path.expanduser("~/Downloads")

JOBS = [
    ("自习课静默模拟v1.html", "study-noise"),
    ("发动机喷油3D演示.html", "engine-injection"),
]

PILL = """
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
"""

MARK = "演示厅 SDK"


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    for filename, slug in JOBS:
        src = os.path.join(DOWNLOADS, filename)
        if not os.path.exists(src):
            print(f"跳过：找不到 {src}")
            continue

        dest_dir = os.path.join(ROOT, "demos", slug)
        os.makedirs(dest_dir, exist_ok=True)

        with io.open(src, "r", encoding="utf-8") as fh:
            html = fh.read()

        if MARK in html:
            html = re.sub(r"\n?<!-- ↓↓↓ 演示厅 SDK.*?<!-- ↑↑↑ 演示厅 SDK 结束 -->\n?", "", html, flags=re.S)

        if "</body>" not in html:
            print(f"跳过：{filename} 里没有 </body>")
            continue

        html = html.replace("</body>", PILL + "</body>", 1)

        dest = os.path.join(dest_dir, "index.html")
        with io.open(dest, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(html)

        size = os.path.getsize(dest)
        print(f"已写入 demos/{slug}/index.html（{size} 字节，来自 {filename}）")

    # 顺手记一下原始文件名，避免以后忘了东西是从哪来的
    manifest = os.path.join(ROOT, "demos", "SOURCES.md")
    with io.open(manifest, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("# 演示来源\n\n")
        fh.write("| 演示 | slug | 原始文件 |\n| --- | --- | --- |\n")
        for filename, slug in JOBS:
            fh.write(f"| {os.path.splitext(filename)[0]} | `{slug}` | `{filename}` |\n")
        fh.write("\n收录时只在 `</body>` 前注入了「返回演示厅」胶囊，其余代码未作改动。\n")
    print(f"已写入 {os.path.relpath(manifest, ROOT)}")


if __name__ == "__main__":
    main()
