#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验 demos.json 与 demos/ 目录是否对得上。

检查项：
  1. demos.json 能被解析，demos 是数组；
  2. 每个条目都有 slug / title / description，slug 是 `小写字母-数字-连字符`；
  3. slug 不重复，且 demos/<slug>/<entry> 文件真实存在；
  4. demos/ 下没有「没写进清单」的演示目录（演示厅只渲染清单里的条目）；
  5. tags 是字符串数组，accent 是两个颜色值，date 是 YYYY-MM-DD，coverArt 名字合法。

用法：
    python scripts/check.py

退出码 0 = 全部通过；1 = 有问题（GitHub Actions 里会打印出来但不阻断部署）。
"""
import io
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MANIFEST = os.path.join(ROOT, "demos.json")
DEMOS_DIR = os.path.join(ROOT, "demos")

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
COLOR_RE = re.compile(r"^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|[a-z]+)$")
KNOWN_ART = {"dots", "spray", "wave", "grid", "aurora"}

problems = []
warnings = []


def fail(msg):
    problems.append(msg)


def warn(msg):
    warnings.append(msg)


def check_color(value, where):
    if not isinstance(value, str) or not COLOR_RE.match(value.strip()):
        fail(f"{where}：颜色值不合法（{value!r}），示例 '#dfb65f'")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    if not os.path.exists(MANIFEST):
        fail("找不到 demos.json")
        return report()

    try:
        with io.open(MANIFEST, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception as err:
        fail(f"demos.json 不是合法 JSON：{err}")
        return report()

    demos = data.get("demos")
    if not isinstance(demos, list):
        fail("demos.json 里的 demos 必须是数组")
        return report()

    if not data.get("title"):
        warn("demos.json 缺少 title，演示厅标题会使用页面里的默认值")

    seen = set()
    for i, demo in enumerate(demos):
        where = f"demos[{i}]"
        if not isinstance(demo, dict):
            fail(f"{where} 不是对象")
            continue

        slug = demo.get("slug")
        if not slug:
            fail(f"{where} 缺少 slug")
            continue
        where = f"demos[{i}]（{slug}）"

        if not SLUG_RE.match(slug):
            fail(f"{where}：slug 只能是小写字母、数字和单个连字符，且不能以连字符开头/结尾")
        if slug in seen:
            fail(f"{where}：slug 重复")
        seen.add(slug)

        if not demo.get("title"):
            fail(f"{where} 缺少 title")
        if not demo.get("description"):
            warn(f"{where} 缺少 description，卡片上会显示「暂无简介」")

        entry = demo.get("entry", "index.html")
        target = os.path.join(DEMOS_DIR, slug, entry)
        if not os.path.isfile(target):
            fail(f"{where}：找不到入口文件 demos/{slug}/{entry}")

        tags = demo.get("tags", [])
        if not isinstance(tags, list) or any(not isinstance(t, str) for t in tags):
            fail(f"{where}：tags 必须是字符串数组")
        elif len(tags) > 4:
            warn(f"{where}：tags 超过 4 个，卡片上只会显示前 3 个")

        accent = demo.get("accent")
        if accent is None:
            warn(f"{where}：没有 accent，封面会用默认金色")
        elif not isinstance(accent, list) or not 1 <= len(accent) <= 2:
            fail(f"{where}：accent 应是 1~2 个颜色值组成的数组")
        else:
            for c in accent:
                check_color(c, where)

        date = demo.get("date")
        if date and not DATE_RE.match(str(date)):
            fail(f"{where}：date 要写成 YYYY-MM-DD")

        art = demo.get("coverArt")
        if art and art not in KNOWN_ART:
            warn(f"{where}：coverArt '{art}' 没定义，会自动退回 aurora（现有：{', '.join(sorted(KNOWN_ART))}）")

    # 反向检查：目录里有、清单里没有
    if os.path.isdir(DEMOS_DIR):
        for name in sorted(os.listdir(DEMOS_DIR)):
            full = os.path.join(DEMOS_DIR, name)
            if not os.path.isdir(full):
                continue
            if name not in seen:
                fail(f"demos/{name}/ 这个目录没写进 demos.json，演示厅不会显示它")

    return report()


def report():
    for w in warnings:
        print(f"提示：{w}")
    if problems:
        print()
        for p in problems:
            print(f"错误：{p}")
        print(f"\n共 {len(problems)} 个问题，请修好后重跑。")
        return 1
    print(f"✔ demos.json 与 demos/ 一致，检查通过（{len(warnings)} 条提示）。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
