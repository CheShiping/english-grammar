# progress.md · 当前状态

> 每次会话结束前更新"当前状态"和"下一步"。

## 当前状态（2026-09-11）

**站点 V5 · 暗色主题 + 移动端 + 动画完成。** 16 课桌面/移动、暗色/亮色、动画/减动效全部跑通。

新增：
- ✅ **暗色主题**
  - 顶栏右侧"太阳/月亮"切换按钮，桌面 + 移动端均显示
  - 首次访问跟随系统 `prefers-color-scheme`
  - 选择后写入 `localStorage.eg-theme`，刷新记忆
  - 配色保持暖色基调：浅色 `#F5F1E6` / 深色 `#16140F`，强调色 `#E8A317` → 暗色 `#F4B83C`
  - 首屏闪烁防护：`<head>` 内嵌 inline 脚本，CSS 加载前就同步 `data-theme`
- ✅ **移动端适配（≤980px / ≤560px）**
  - 顶栏：导航收成汉堡按钮；品牌名隐藏只留图标；暗色按钮保留
  - 侧栏：抽屉化（默认隐藏，translateX 滑入），82vw 宽，蒙层遮罩，body 锁滚动
  - 顶栏 z-index=70，永远盖在抽屉之上，可重复点击汉堡关闭
  - 触摸友好：链接 padding 加大、行高 1.8、字号收紧、卡片间距缩小
  - ESC 关闭抽屉；点击蒙层关闭；点击抽屉内链接自动关闭
- ✅ **动画 / Motion**（V5）
  - 页面 mount：`.site-main` `translateY(12px)`+opacity 0 → 0，280ms `var(--ease-out)`；抽屉 `.site-aside` 320ms
  - 按钮 press：`.site-iconbtn` scale(.94)，课程卡 + 侧栏链接 + 翻页按钮 scale(.99)
  - 课程卡 hover：translateY(-2px) + 边框 accent + box-shadow
  - 翻页 hover：translateY(-2px) + box-shadow；箭头 `.arrow` translateX(±4px)
  - 顶栏图标按钮 hover：SVG 旋转（汉堡 -8°，主题 -30°）
  - 缓动令牌：`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`、`--ease-in-out`、`--ease-drawer`
  - **全部 respect `prefers-reduced-motion: reduce`**（animation:none，hover transform 禁用）

**harness 文件就位：**
- ✅ AGENTS.md
- ✅ .claude/feature_list.json
- ✅ init.sh（环境检查 + build 烟雾测试）
- ✅ progress.md（本文件）

**未做：**
- ❌ GitHub Pages 部署
- ❌ 站内搜索（`Ctrl K` 当前只是占位 placeholder）
- ❌ 抽屉内"当前层级"高亮（仅顶部导航有 `class="cur"`）

## 下一步

1. **部署到 GitHub Pages**（F5）—— 用户决定何时做
2. **内容继续增量更新**（主线）
3. **站内搜索**（F7）

## 会话日志

### 2026-09-11
- **V5 动画**：用 animate skill 决策（频率 tier = tens，purpose = spatial/feedback；CSS transition + keyframes，零 JS）
- 主内容 mount 280ms `--ease-out` + 抽屉入场 + 按钮 press scale + 翻页箭头 hover slide
- 浏览器实测 computed style：animation/transition 全部正确绑定；reduced-motion 守护生效
- V4 暗色 + 移动端：抽屉遮挡顶栏 → 顶栏 z-index 提到 70 修复

### 2026-09-10
- 用户意图对齐：纯资料库 + 树形书架 + 自动更新脚本
- 视觉定调：沿用 ecommerce-product-template（暖米色 + 墨黑 + 藏红）
- V1 单课页注入 → 失败（CSS 漏写 + 路径错）
- V2 单页内嵌 → 用户说"不要一页全显示" → 推倒
- V3 拆页站 → 跑通
- Harness 文件就位

---
**最后验证**：`bash init.sh` 通过（2026-09-11）
- 环境：node v22.16.0、git 2.34.1
- build：16 课成功
- 烟雾测试：CSS/侧栏 20 链接/上一篇下一篇/无误路径 ✓
- 源 HTML mtime < dist/ mtime（build 未触碰源）✓
- 浏览器实测：动画绑定 + reduced-motion 守护全通
