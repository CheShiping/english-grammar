#!/usr/bin/env bash
# init.sh · 环境检查 + build 烟雾测试
# --------------------------------------------------------------------
# 用途：agent 启动时跑一次，确认环境就绪 + 当前 build 健康。
# 退出码 0 = 一切正常；非 0 = 失败，agent 不得声称"完成"。
# --------------------------------------------------------------------
set -e

cd "$(dirname "$0")"

echo "=== 1. 环境检查 ==="

# node
if ! command -v node >/dev/null 2>&1 && ! command -v node.exe >/dev/null 2>&1; then
  echo "✗ node 未安装"
  echo "  → https://nodejs.org 安装 LTS"
  exit 1
fi
NODE_VER=$(node -v 2>/dev/null || node.exe -v 2>/dev/null)
echo "✓ node $NODE_VER"

# git
if ! command -v git >/dev/null 2>&1; then
  echo "✗ git 未安装"
  exit 1
fi
echo "✓ git $(git --version | awk '{print $3}')"

# python（用于本地预览）
if ! command -v python >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1; then
  echo "⚠ python 未安装（仅影响本地预览，不影响 build）"
fi

echo ""
echo "=== 2. 源 HTML 计数 ==="
for d in 零基础语法 基础语法 中级语法 高级语法; do
  if [ -d "$d" ]; then
    n=$(find "$d" -maxdepth 1 -name "【*.html" -type f | wc -l)
    echo "  $d: $n 课"
  else
    echo "  $d: 不存在"
  fi
done

echo ""
echo "=== 3. 跑 build ==="
node.exe scripts/build.js 2>&1 || node scripts/build.js 2>&1

echo ""
echo "=== 4. build 烟雾测试 ==="

# 4.1 干净源被覆盖为最终首页
if [ ! -f "index.html" ]; then
  echo "✗ index.html 缺失"
  exit 1
fi
echo "✓ index.html 存在 ($(wc -c < index.html) bytes)"

# 4.2 dist/ 下有 16 课（如果源 HTML 是 16）
expected=$(find 零基础语法 基础语法 中级语法 高级语法 -maxdepth 1 -name "【*.html" -type f 2>/dev/null | wc -l)
actual=$(find dist -maxdepth 2 -name "【*.html" -type f 2>/dev/null | wc -l)
if [ "$expected" -ne "$actual" ]; then
  echo "✗ dist/ 课数 ($actual) 与源 ($expected) 不一致"
  exit 1
fi
echo "✓ dist/ 课数 $actual 与源一致"

# 4.3 抽样检查：随机取一个课程页，验证关键链接
sample=$(find dist -maxdepth 2 -name "【*.html" -type f | head -1)
echo "  抽样：$sample"

# 4.3.1 CSS 链接应是 ../../assets/site.css
if ! grep -q 'href="../../assets/site.css"' "$sample"; then
  echo "✗ CSS 链接错（应该是 ../../assets/site.css）"
  exit 1
fi
echo "✓ CSS 链接正确"

# 4.3.2 侧栏应包含其他课程链接（不只当前课）
sidebar_count=$(grep -oE 'href="\.\./[^"]*\.html"' "$sample" | wc -l)
if [ "$sidebar_count" -lt 5 ]; then
  echo "✗ 侧栏链接数太少 ($sidebar_count)，可能没渲染全"
  exit 1
fi
echo "✓ 侧栏有 $sidebar_count 个链接"

# 4.3.3 不应跳到原始源（路径不应有 ../../零基础语法/ 等）
if grep -qE 'href="\.\./\.\./(零基础|基础|中级|高级)语法/' "$sample"; then
  echo "✗ 发现 ../<level>/ 误路径（会跳到原始素材库）"
  exit 1
fi
echo "✓ 无误路径"

# 4.3.4 上一篇/下一篇 应存在
if ! grep -qE 'site-prevnext' "$sample"; then
  echo "✗ 缺上一篇/下一篇"
  exit 1
fi
echo "✓ 上一篇/下一篇存在"

echo ""
echo "=== 5. 源 HTML 未被破坏性污染 ==="
# V1 时代注入过 SITE 块 + hidden-h1（已在文件中残留），
# 当前 build 流程能容忍它们（V3 提取时只取 .container inner 并去 H1）。
# 这里只做 warn，不报错。彻底清理见 scripts/clean-source.js。
warn=$(grep -l "SITE:NAV\|site-shell-hidden-h1" 零基础语法 基础语法 中级语法 高级语法 -r --include="*.html" 2>/dev/null | wc -l)
if [ "$warn" -gt 0 ]; then
  echo "  ⚠ $warn 个源文件含 V1 残留污染（无害，建议清理）"
  echo "    → 可手动跑 node scripts/clean-source.js 清理（脚本不存在则跳过）"
else
  echo "✓ 源 HTML 无 V1 残留"
fi

# 5.1 关键检查：build 跑后源 HTML 没被改（按 mtime 判定）
if [ -d "dist" ]; then
  # git bash 上 find -printf %T@ 不可靠，用 stat -c %Y
  newest_dist=$(find dist -name "*.html" -type f -exec stat -c %Y {} \; 2>/dev/null | sort -n | tail -1)
  newest_src=$(find 零基础语法 基础语法 中级语法 高级语法 -name "【*.html" -type f -exec stat -c %Y {} \; 2>/dev/null | sort -n | tail -1)
  if [ -n "$newest_dist" ] && [ -n "$newest_src" ]; then
    if [ "$newest_dist" -gt "$newest_src" ]; then
      echo "✓ 源 HTML mtime < dist/ mtime（build 未触碰源）"
    else
      echo "✗ 源 HTML mtime ≥ dist/ mtime（build 写过源！）"
      exit 1
    fi
  fi
fi

echo ""
echo "=== 全部通过 ✓ ==="
echo "本地预览：python -m http.server 8765  →  http://localhost:8765/"
