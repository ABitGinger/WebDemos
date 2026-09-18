'use strict';
/* ==========================================================================
   hub.js · 姜的演示厅
   --------------------------------------------------------------------------
   职责：
   1. 读取 demos.json，把清单里的演示渲染成卡片网格（含搜索、标签筛选）；
   2. 每张卡片的封面由 canvas 现场画出来（程序化封面），因此新增演示
      不需要准备任何图片，也不会给仓库增加二进制文件；
   3. 点击卡片 → 卡片封面原地放大占满屏幕（FLIP 动画），渐变加载幕后
      以内嵌 <iframe> 打开演示；点「⤢ 独立打开」才跳转到独立页面。

   宿主适配：
   · 既可以独立访问（/demo/），也可以被主站的「静默跳转」把 <main> 换进来。
     后者只会替换 <main>、不会重新执行 <head> 里的脚本，所以本文件同时监听
     DOMContentLoaded 与主站派发的 view:swapped 事件（与主站 js/repos.js 一致）。
   · 所有路径都由本文件自身的 <script src> 反推，因此在
     /demo/ 与仓库自有 Pages（/WebDemos/）下都能直接跑。
   ========================================================================== */

(function () {
    var TAU = Math.PI * 2;

    /* ====================== 0. 基础路径与常量 ====================== */
    var SELF = (function () {
        if (document.currentScript) return document.currentScript;
        var list = document.getElementsByTagName('script');
        for (var i = list.length - 1; i >= 0; i--) {
            if (/assets\/hub\.js/.test(list[i].src || '')) return list[i];
        }
        return null;
    })();

    // 例：https://abitginger.github.io/demo/assets/hub.js  ->  /demo/
    var BASE = (function () {
        var src = (SELF && SELF.src) || '';
        if (src) return src.replace(/assets\/hub\.js.*$/, '');
        var p = location.pathname;
        return p.charAt(p.length - 1) === '/' ? p : p.replace(/[^/]*$/, '');
    })();

    var MANIFEST_URL = BASE + 'demos.json';
    var DATA_URL_HINT = BASE + 'demos.json';

    /* ====================== 1. 小工具 ====================== */
    function h(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined && text !== null) n.textContent = text;
        return n;
    }

    function hash(str) {
        var x = 2166136261;
        for (var i = 0; i < str.length; i++) {
            x ^= str.charCodeAt(i);
            x = Math.imul(x, 16777619);
        }
        return x >>> 0;
    }

    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hex2rgb(value) {
        var s = String(value || '').replace('#', '').trim();
        if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
        var n = parseInt(s, 16);
        if (!isFinite(n) || s.length !== 6) return [223, 182, 95];
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function mix(a, b, t) {
        var A = hex2rgb(a), B = hex2rgb(b);
        return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
            Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
            Math.round(A[2] + (B[2] - A[2]) * t) + ')';
    }

    function rgba(c, a) {
        var C = hex2rgb(c);
        return 'rgba(' + C[0] + ',' + C[1] + ',' + C[2] + ',' + a + ')';
    }

    function accentOf(demo) {
        var a = demo && demo.accent;
        if (!Array.isArray(a) || !a.length) return ['#dfb65f', '#3b2c10'];
        return [a[0] || '#dfb65f', a[1] || a[0] || '#3b2c10'];
    }

    function demoUrl(demo) {
        return BASE + 'demos/' + demo.slug + '/' + (demo.entry || 'index.html');
    }

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /* ====================== 2. 程序化封面 ====================== */
    function vignette(ctx, w, h) {
        var g = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.12,
            w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,.55)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#ffffff';
        for (var y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
        ctx.globalAlpha = 1;
    }

    var ART = {};

    /* 点阵：一教室学生，越亮越吵 */
    ART.dots = function (ctx, w, h, demo, rnd) {
        var A = accentOf(demo);
        var g = ctx.createLinearGradient(0, 0, w * 0.3, h);
        g.addColorStop(0, mix(A[1], '#0a1120', 0.62));
        g.addColorStop(1, '#05080f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        var COLS = 34;
        var ROWS = Math.max(5, Math.round(COLS * h / w));
        var cell = Math.min(w / COLS, h / ROWS);
        var ox = (w - cell * COLS) / 2;
        var oy = (h - cell * ROWS) / 2;
        var cx = COLS * 0.42, cy = ROWS * 0.56;

        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                var dx = (c - cx) / (COLS * 0.66);
                var dy = (r - cy) / (ROWS * 0.95);
                var v = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy));
                v = Math.max(0, Math.min(1, v * 0.66 + rnd() * 0.5));
                ctx.globalAlpha = 0.32 + v * 0.68;
                ctx.fillStyle = 'rgb(' + Math.round(45 + v * 210) + ',' +
                    Math.round(58 + v * 96) + ',' + Math.round(84 - v * 24) + ')';
                ctx.beginPath();
                ctx.arc(ox + (c + 0.5) * cell + (rnd() - 0.5) * cell * 0.16,
                    oy + (r + 0.5) * cell + (rnd() - 0.5) * cell * 0.16,
                    cell * (0.15 + 0.27 * v), 0, TAU);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    };

    /* 油束：喷嘴 + 锥形喷雾 + 液滴 */
    ART.spray = function (ctx, w, h, demo, rnd) {
        var A = accentOf(demo);
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, mix(A[1], '#04060b', 0.45));
        g.addColorStop(1, '#04060b');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        // 缸壁弧线
        ctx.strokeStyle = rgba('#7fb4ff', 0.16);
        ctx.lineWidth = 1.4;
        for (var i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(w * 0.5, -h * (0.35 + i * 0.5), w * 0.62, 0.35, Math.PI - 0.35);
            ctx.stroke();
        }
        // 活塞顶
        ctx.strokeStyle = rgba('#7fb4ff', 0.24);
        ctx.beginPath();
        ctx.moveTo(w * 0.14, h * 0.9);
        ctx.quadraticCurveTo(w * 0.5, h * 0.78, w * 0.86, h * 0.9);
        ctx.stroke();

        var nx = w * 0.5, ny = h * 0.16;

        // 油束
        var N = Math.round(520 * Math.min(1, 1));
        ctx.globalCompositeOperation = 'lighter';
        for (var k = 0; k < N; k++) {
            var t = Math.pow(rnd(), 0.72);
            var spread = 0.44 * (0.3 + t);
            var ang = (rnd() - 0.5) * 2 * spread;
            var len = t * h * 0.72;
            var x = nx + Math.sin(ang) * len;
            var y = ny + Math.cos(ang) * len;
            var rad = Math.max(0.5, (0.9 + rnd() * 2.6) * (1 - t * 0.5) * (w / 300));
            ctx.globalAlpha = (1 - t) * 0.8;
            ctx.fillStyle = k % 11 === 0 ? '#eaf6ff' : (k % 3 === 0 ? A[0] : '#79b0ff');
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, TAU);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        // 喷嘴本体
        ctx.fillStyle = 'rgba(16,22,32,.95)';
        ctx.strokeStyle = rgba('#7fb4ff', 0.5);
        ctx.lineWidth = 1.4;
        var bw = w * 0.2, bh = h * 0.2;
        ctx.beginPath();
        ctx.moveTo(nx - bw * 0.36, ny - bh);
        ctx.lineTo(nx + bw * 0.36, ny - bh);
        ctx.lineTo(nx + bw * 0.24, ny + bh * 0.2);
        ctx.lineTo(nx - bw * 0.24, ny + bh * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 喷孔高光
        var glow = ctx.createRadialGradient(nx, ny + bh * 0.24, 0, nx, ny + bh * 0.24, w * 0.1);
        glow.addColorStop(0, rgba('#dff0ff', 0.85));
        glow.addColorStop(1, rgba('#4da3ff', 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(nx, ny + bh * 0.24, w * 0.1, 0, TAU);
        ctx.fill();
    };

    /* 波纹：连续变化的曲线族 */
    ART.wave = function (ctx, w, h, demo, rnd) {
        var A = accentOf(demo);
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, mix(A[1], '#05080f', 0.55));
        g.addColorStop(1, '#05080f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 1.4;
        for (var i = 0; i < 16; i++) {
            var t = i / 15;
            ctx.globalAlpha = 0.18 + t * 0.6;
            ctx.strokeStyle = mix(A[1], A[0], t);
            ctx.beginPath();
            var phase = rnd() * TAU;
            var amp = h * (0.05 + t * 0.16);
            var freq = 1.2 + rnd() * 2.4;
            for (var x = 0; x <= w; x += 4) {
                var y = h * 0.62 + Math.sin((x / w) * TAU * freq + phase) * amp + (t - 0.5) * h * 0.3;
                x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    };

    /* 蓝图：网格 + 结构示意 */
    ART.grid = function (ctx, w, h, demo, rnd) {
        var A = accentOf(demo);
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, mix(A[1], '#05080f', 0.5));
        g.addColorStop(1, '#05080f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = rgba(A[0], 0.16);
        ctx.lineWidth = 1;
        var stepX = w / 18, stepY = h / 9;
        for (var x = 0; x <= w; x += stepX) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (var y = 0; y <= h; y += stepY) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        ctx.strokeStyle = rgba(A[0], 0.75);
        ctx.lineWidth = 1.8;
        var cx = w * 0.5, cy = h * 0.52, rr = Math.min(w, h) * 0.26;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, rr * 0.62, 0, TAU);
        ctx.stroke();
        for (var a = 0; a < 8; a++) {
            var th = (a / 8) * TAU + rnd() * 0.08;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(th) * rr * 0.62, cy + Math.sin(th) * rr * 0.62);
            ctx.lineTo(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr);
            ctx.stroke();
        }
        ctx.fillStyle = rgba(A[0], 0.9);
        ctx.beginPath();
        ctx.arc(cx, cy, rr * 0.16, 0, TAU);
        ctx.fill();
    };

    /* 极光：通用兜底封面 */
    ART.aurora = function (ctx, w, h, demo, rnd) {
        var A = accentOf(demo);
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, mix(A[1], '#05080f', 0.35));
        g.addColorStop(1, '#05080f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < 5; i++) {
            var cx = rnd() * w;
            var cy = rnd() * h;
            var rr = Math.max(w, h) * (0.18 + rnd() * 0.3);
            var rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
            rg.addColorStop(0, rgba(i % 2 ? A[0] : mix(A[0], A[1], 0.6), 0.5));
            rg.addColorStop(1, rgba(A[1], 0));
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, TAU);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    };

    function paintCover(canvas, demo, w, h) {
        if (!canvas || !(w > 1) || !(h > 1)) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        var rnd = mulberry32(hash(String(demo.slug || demo.title || 'demo')));
        var kind = demo.coverArt;
        var fn = ART[kind] || ART.aurora;
        try {
            fn(ctx, w, h, demo, rnd);
        } catch (err) {
            ART.aurora(ctx, w, h, demo, rnd);
        }
        vignette(ctx, w, h);

        // 底部压暗，让左上角的技术标签读得清
        var shade = ctx.createLinearGradient(0, 0, 0, h);
        shade.addColorStop(0, 'rgba(0,0,0,.34)');
        shade.addColorStop(0.42, 'rgba(0,0,0,0)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);
    }

    /* ====================== 3. 页面状态 ====================== */
    var S = {
        graph: null,
        bySlug: {},
        query: '',
        tag: null,
        viewer: null,
        viewerSlug: null,
        lastFocus: null,
        readyTimer: 0,
        slowTimer: 0,
        booted: false,
        bound: false,
        resizeTimer: 0
    };

    /* ====================== 4. 卡片与网格 ====================== */
    function buildCard(demo) {
        var A = accentOf(demo);

        var card = h('article', 'dm-card');
        card.dataset.dmSlug = demo.slug;

        /* --- 封面 --- */
        var cover = h('div', 'dm-card-cover');

        var canvas = h('canvas', 'dm-cover-art');
        canvas.setAttribute('aria-hidden', 'true');
        cover.appendChild(canvas);

        var tags = h('div', 'dm-card-tags');
        (demo.tags || []).slice(0, 3).forEach(function (t) {
            tags.appendChild(h('span', 'dm-chip', t));
        });
        cover.appendChild(tags);

        var open = h('a', 'dm-card-open', '⤢');
        open.href = demoUrl(demo);
        open.target = '_blank';
        open.rel = 'noopener';
        open.title = '在新标签页独立打开「' + demo.title + '」';
        open.setAttribute('aria-label', '在新标签页独立打开 ' + demo.title);
        cover.appendChild(open);

        if (demo.glyph) {
            var glyph = h('span', 'dm-card-glyph', demo.glyph);
            glyph.setAttribute('aria-hidden', 'true');
            cover.appendChild(glyph);
        }

        /* --- 正文 --- */
        var body = h('div', 'dm-card-body');

        var title = h('h3', 'dm-card-title');
        var hit = h('a', 'dm-card-hit', demo.title);
        hit.href = demoUrl(demo);
        hit.title = '点击就地展开；按住 Ctrl / ⌘ 或中键可独立打开';
        title.appendChild(hit);
        body.appendChild(title);

        body.appendChild(h('p', 'dm-card-desc', demo.description || '暂无简介'));

        var foot = h('div', 'dm-card-foot');
        foot.appendChild(h('span', null, demo.date || ''));
        var hint = h('span', 'dm-card-hint', '点击展开 ⤡');
        foot.appendChild(hint);
        body.appendChild(foot);

        card.append(cover, body);
        card.__demo = demo;
        return card;
    }
    function buildTagChips() {
        var wrap = document.getElementById('dm-tags');
        if (!wrap) return;
        var counts = {};
        (S.graph.demos || []).forEach(function (d) {
            (d.tags || []).forEach(function (t) {
                counts[t] = (counts[t] || 0) + 1;
            });
        });
        var names = Object.keys(counts).sort(function (a, b) {
            return counts[b] - counts[a] || a.localeCompare(b, 'zh');
        });

        wrap.replaceChildren();
        var all = h('button', 'dm-tag-chip', '全部');
        all.type = 'button';
        all.setAttribute('aria-pressed', String(!S.tag));
        all.addEventListener('click', function () {
            S.tag = null;
            applyFilter();
        });
        wrap.appendChild(all);

        names.forEach(function (name) {
            var chip = h('button', 'dm-tag-chip', name);
            chip.type = 'button';
            chip.setAttribute('aria-pressed', String(S.tag === name));
            chip.addEventListener('click', function () {
                S.tag = S.tag === name ? null : name;
                applyFilter();
            });
            wrap.appendChild(chip);
        });
    }

    function matches(demo) {
        if (S.tag && (demo.tags || []).indexOf(S.tag) === -1) return false;
        var q = S.query.trim().toLowerCase();
        if (!q) return true;
        var hay = [demo.title, demo.description, demo.slug, (demo.tags || []).join(' ')]
            .join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
    }

    function paintAllCovers(root) {
        var cards = root.querySelectorAll('.dm-card');
        for (var i = 0; i < cards.length; i++) {
            var cv = cards[i].querySelector('.dm-cover-art');
            var box = cards[i].querySelector('.dm-card-cover');
            if (!cv || !box) continue;
            var rect = box.getBoundingClientRect();
            if (rect.width < 2) continue;
            paintCover(cv, cards[i].__demo, rect.width, rect.height);
        }
    }

    function applyFilter() {
        var grid = document.getElementById('dm-grid');
        var summary = document.getElementById('dm-summary');
        if (!grid || !S.graph) return;

        var list = (S.graph.demos || []).filter(matches);
        grid.replaceChildren();

        if (!list.length) {
            grid.appendChild(h('div', 'dm-empty', S.query || S.tag
                ? '没有匹配的演示。换个词，或点「全部」试试。'
                : '演示厅还是空的，往 demos/ 里丢一个小项目就会被列在这里。'));
        } else {
            list.forEach(function (d, i) {
                var card = buildCard(d);
                card.style.setProperty('--dm-delay', Math.min(i * 70, 420) + 'ms');
                card.classList.add('dm-enter');
                grid.appendChild(card);
            });
        }

        // 标签按钮的选中态
        var chips = document.querySelectorAll('#dm-tags .dm-tag-chip');
        for (var i = 0; i < chips.length; i++) {
            var label = chips[i].textContent;
            chips[i].setAttribute('aria-pressed',
                String(label === '全部' ? !S.tag : S.tag === label));
        }

        var total = (S.graph.demos || []).length;
        if (summary) {
            summary.textContent = list.length === total
                ? '共 ' + total + ' 个演示'
                : '匹配 ' + list.length + ' / ' + total + ' 个演示';
        }

        // 等浏览器量完尺寸再画封面
        requestAnimationFrame(function () {
            paintAllCovers(grid);
        });
    }

    function showStatus(msg, withRetry) {
        var box = document.getElementById('dm-status');
        if (!box) return;
        box.replaceChildren();
        box.appendChild(h('p', null, msg));
        if (withRetry) {
            var retry = h('button', 'dm-btn', '🔄 重试');
            retry.type = 'button';
            retry.style.marginTop = '14px';
            retry.addEventListener('click', function () {
                box.hidden = true;
                loadAndRender();
            });
            box.appendChild(retry);
        }
        box.hidden = false;
    }

    function loadAndRender() {
        var grid = document.getElementById('dm-grid');
        var box = document.getElementById('dm-status');
        if (!grid) return;

        grid.replaceChildren();
        for (var i = 0; i < 4; i++) grid.appendChild(h('div', 'dm-skeleton'));
        if (box) {
            box.hidden = true;
            box.replaceChildren();
        }

        fetch(MANIFEST_URL, { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                S.graph = data && Array.isArray(data.demos) ? data : { demos: [] };
                S.bySlug = {};
                S.graph.demos.forEach(function (d) {
                    if (d && d.slug) S.bySlug[d.slug] = d;
                });

                var t = document.getElementById('dm-hero-title');
                if (t && data.title) t.textContent = data.title;
                var sub = document.getElementById('dm-hero-sub');
                if (sub && data.subtitle) sub.textContent = data.subtitle;

                buildTagChips();
                applyFilter();
            })
            .catch(function (err) {
                showStatus('😔 演示清单加载失败了（' + DATA_URL_HINT + '）。' +
                    '如果是本地打开文件，请用 http 服务而不是 file://  。', true);
                if (window.console) console.warn('[演示厅] demos.json 加载失败：', err);
            });
    }

    /* ====================== 5. 就地展开的查看器 ====================== */
    function buildViewer(demo) {
        var root = h('div', 'dm-viewer');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', demo.title);

        var backdrop = h('div', 'dm-viewer-backdrop');
        backdrop.setAttribute('data-dm-close', '');

        var shell = h('div', 'dm-viewer-shell');

        var bar = h('div', 'dm-viewer-bar');
        var back = h('button', 'dm-btn', '← 返回演示厅');
        back.type = 'button';
        back.setAttribute('data-dm-close', '');
        var titleWrap = h('div', 'dm-viewer-title');
        titleWrap.appendChild(document.createTextNode(demo.title));
        titleWrap.appendChild(h('small', null, '就地展开中'));
        var open = h('a', 'dm-btn', '⤢ 独立打开');
        open.href = demoUrl(demo);
        open.target = '_blank';
        open.rel = 'noopener';
        open.title = '在新标签页打开这个演示的独立页面';
        var close = h('button', 'dm-btn', '✕');
        close.type = 'button';
        close.setAttribute('data-dm-close', '');
        close.setAttribute('aria-label', '关闭');
        bar.append(back, titleWrap, open, close);

        var bodyArea = h('div', 'dm-viewer-body');

        var frame = document.createElement('iframe');
        frame.className = 'dm-viewer-frame';
        frame.title = demo.title;
        frame.setAttribute('allow', 'fullscreen; autoplay; microphone; clipboard-write; gamepad');
        frame.setAttribute('allowfullscreen', '');
        frame.setAttribute('loading', 'eager');
        frame.src = demoUrl(demo);

        var cover = h('div', 'dm-viewer-cover');
        var canvas = h('canvas', null);
        cover.appendChild(canvas);
        var loading = h('div', 'dm-viewer-loading');
        loading.append(h('div', 'dm-loadbar'), h('span', null, '正在唤醒这个小玩意…'));
        cover.appendChild(loading);

        bodyArea.append(frame, cover);
        shell.append(bar, bodyArea);
        root.append(backdrop, shell);

        return { root: root, shell: shell, body: bodyArea, cover: cover, canvas: canvas, frame: frame, loading: loading };
    }

    function makeFlyer(demo, to) {
        var flyer = h('div', 'dm-flyer');
        flyer.style.left = to.left + 'px';
        flyer.style.top = to.top + 'px';
        flyer.style.width = to.width + 'px';
        flyer.style.height = to.height + 'px';
        var canvas = h('canvas', null);
        flyer.appendChild(canvas);
        document.body.appendChild(flyer);
        paintCover(canvas, demo, to.width, to.height);
        return flyer;
    }

    function flyTransform(from, to) {
        var sx = from.width / to.width;
        var sy = from.height / to.height;
        return {
            sx: sx,
            sy: sy,
            dx: from.left - to.left,
            dy: from.top - to.top
        };
    }

    function openViewer(demo, card) {
        if (S.viewer || !demo) return;

        var v = buildViewer(demo);
        S.lastFocus = document.activeElement;

        // 先锁滚动再量尺寸：锁定时滚动条会消失、视口变宽，若先量再锁，
        // 飞行层的起点会和卡片实际位置差出一个滚动条的宽度。
        document.documentElement.classList.add('dm-lock');
        document.body.classList.add('dm-lock');
        document.body.appendChild(v.root);

        var coverEl = card ? card.querySelector('.dm-card-cover') : null;
        var from = coverEl ? coverEl.getBoundingClientRect() : null;

        S.viewer = v;
        S.viewerSlug = demo.slug;

        var to = v.body.getBoundingClientRect();
        paintCover(v.canvas, demo, to.width, to.height);

        var reduce = prefersReducedMotion();
        var backdrop = v.root.querySelector('.dm-viewer-backdrop');

        if (!from || from.width < 2 || reduce) {
            backdrop.animate([{ opacity: 0 }, { opacity: 1 }],
                { duration: 200, fill: 'forwards', easing: 'ease-out' });
            v.shell.animate([{ opacity: 0 }, { opacity: 1 }],
                { duration: 220, fill: 'forwards', easing: 'ease-out' });
        } else {
            var f = flyTransform(from, to);
            var flyer = makeFlyer(demo, to);

            backdrop.animate([{ opacity: 0 }, { opacity: 1 }],
                { duration: 320, fill: 'forwards', easing: 'ease-out' });
            v.shell.animate([{ opacity: 0 }, { opacity: 1 }],
                { duration: 190, delay: 250, fill: 'forwards', easing: 'ease-out' });

            var anim;
            try {
                anim = flyer.animate([
                    {
                        transform: 'translate(' + f.dx + 'px,' + f.dy + 'px) scale(' + f.sx + ',' + f.sy + ')',
                        borderRadius: '16px'
                    },
                    { transform: 'none', borderRadius: '0px' }
                ], { duration: 470, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
            } catch (err) {
                anim = null;
            }
            var drop = function () {
                if (flyer.parentNode) flyer.parentNode.removeChild(flyer);
            };
            if (anim && anim.finished && anim.finished.then) {
                anim.finished.then(drop, drop);
            } else if (anim) {
                anim.addEventListener('finish', drop);
            }
            setTimeout(drop, 780);
        }

        // 演示就绪后再撤掉加载幕
        var reveal = function () {
            clearTimeout(S.readyTimer);
            clearTimeout(S.slowTimer);
            v.root.classList.add('is-ready');
        };
        v.frame.addEventListener('load', reveal, { once: true });
        S.readyTimer = setTimeout(reveal, 45000);
        S.slowTimer = setTimeout(function () {
            var txt = v.loading.querySelector('span');
            if (txt && !v.root.classList.contains('is-ready')) {
                txt.textContent = '加载有点慢，也可以点右上角「⤢ 独立打开」';
            }
        }, 6000);

        var closeBtn = v.root.querySelector('.dm-viewer-bar .dm-btn[aria-label="关闭"]');
        if (closeBtn) try { closeBtn.focus({ preventScroll: true }); } catch (err2) { /* 忽略 */ }
    }

    function closeViewer() {
        var v = S.viewer;
        if (!v) return;
        S.viewer = null;
        clearTimeout(S.readyTimer);
        clearTimeout(S.slowTimer);

        document.documentElement.classList.remove('dm-lock');
        document.body.classList.remove('dm-lock');

        var demo = S.bySlug[S.viewerSlug];
        var card = null;
        try {
            card = document.querySelector('.dm-card[data-dm-slug="' + S.viewerSlug + '"]');
        } catch (err) { /* 选择器异常时忽略 */ }
        var coverEl = card ? card.querySelector('.dm-card-cover') : null;
        var to = v.body.getBoundingClientRect();
        var backdrop = v.root.querySelector('.dm-viewer-backdrop');

        var remove = function () {
            try { v.frame.src = 'about:blank'; } catch (err) { /* 忽略 */ }
            if (v.root.parentNode) v.root.parentNode.removeChild(v.root);
        };

        var reduce = prefersReducedMotion();
        if (coverEl && demo && to.width > 2 && !reduce) {
            var from = coverEl.getBoundingClientRect();
            var f = flyTransform(from, to);
            var flyer = makeFlyer(demo, to);

            backdrop.animate([{ opacity: 1 }, { opacity: 0 }],
                { duration: 200, delay: 160, fill: 'forwards', easing: 'ease-in' });
            v.shell.animate([{ opacity: 1 }, { opacity: 0 }],
                { duration: 190, delay: 110, fill: 'forwards', easing: 'ease-in' });

            var anim;
            try {
                anim = flyer.animate([
                    { transform: 'none', borderRadius: '0px' },
                    {
                        transform: 'translate(' + f.dx + 'px,' + f.dy + 'px) scale(' + f.sx + ',' + f.sy + ')',
                        borderRadius: '16px'
                    }
                ], { duration: 400, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
            } catch (err3) {
                anim = null;
            }
            var drop = function () {
                if (flyer.parentNode) flyer.parentNode.removeChild(flyer);
            };
            if (anim && anim.finished && anim.finished.then) {
                anim.finished.then(drop, drop);
            } else if (anim) {
                anim.addEventListener('finish', drop);
            }
            setTimeout(function () { drop(); remove(); }, 460);
        } else {
            backdrop.animate([{ opacity: 1 }, { opacity: 0 }],
                { duration: 200, fill: 'forwards', easing: 'ease-in' });
            v.shell.animate([{ opacity: 1 }, { opacity: 0 }],
                { duration: 200, fill: 'forwards', easing: 'ease-in' });
            setTimeout(remove, 230);
        }

        if (S.lastFocus && S.lastFocus.focus) {
            try { S.lastFocus.focus({ preventScroll: true }); } catch (err4) { /* 忽略 */ }
        }
        S.lastFocus = null;
    }

    /* ====================== 6. 事件绑定 ====================== */
    function bindOnce() {
        if (S.bound) return;
        S.bound = true;

        document.addEventListener('click', function (e) {
            // 1) 查看器内的关闭按钮 / 背景遮罩
            var closer = e.target.closest ? e.target.closest('[data-dm-close]') : null;
            if (closer && S.viewer && S.viewer.root.contains(closer)) {
                e.preventDefault();
                closeViewer();
                return;
            }

            // 2) 卡片点击 → 就地展开
            //    保留 Ctrl / ⌘ / Shift / Alt 与中键的原生行为（新标签打开独立页面）
            if (!e.target.closest) return;
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (e.target.closest('.dm-card-open')) return;
            var card = e.target.closest('.dm-card');
            if (!card || !card.__demo) return;
            e.preventDefault();
            openViewer(card.__demo, card);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && S.viewer) {
                e.preventDefault();
                closeViewer();
            }
        });

        window.addEventListener('resize', function () {
            clearTimeout(S.resizeTimer);
            S.resizeTimer = setTimeout(function () {
                var grid = document.getElementById('dm-grid');
                if (grid) paintAllCovers(grid);
            }, 220);
        });
    }

    /* ====================== 7. 启动 ====================== */
    function bootHub() {
        var grid = document.getElementById('dm-grid');
        if (!grid || grid.dataset.dmBooted) return;
        grid.dataset.dmBooted = '1';

        bindOnce();

        var input = document.getElementById('dm-search');
        if (input) {
            var wrap = input.closest('.dm-search');
            input.addEventListener('input', function () {
                S.query = input.value;
                if (wrap) wrap.classList.toggle('has-value', !!input.value);
                applyFilter();
            });
            var clear = document.querySelector('.dm-search-clear');
            if (clear) {
                clear.addEventListener('click', function () {
                    input.value = '';
                    S.query = '';
                    if (wrap) wrap.classList.remove('has-value');
                    input.focus();
                    applyFilter();
                });
            }
        }

        loadAndRender();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootHub);
    } else {
        bootHub();
    }
    // 主站静默跳转把 <main> 换进来之后，由主站派发这个事件
    document.addEventListener('view:swapped', bootHub);
})();
