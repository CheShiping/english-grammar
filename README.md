# 英语语法笔记 · 站点

陈老师语法系列整理版，部署在 GitHub Pages 上随时翻阅。

**线上地址**：<https://cheshiping.github.io/english-grammar/>

## 站点形态

**多页拆页站**：`index.html` 是首页（只列课程卡片），每课独立页面在 `dist/<level>/<file>.html`。源 HTML 文件保留在 `零基础语法/` `基础语法/` 等目录中作为素材库，build 脚本提取正文后生成 dist/ 下的站点页。

## 目录结构

```
.
├── index.html              # 首页（build 生成，列课程卡片）
├── assets/
│   ├── site.css            # 共享样式（暖色主题 + 暗色 + 移动端）
│   └── site.js             # 暗色切换 + 抽屉 + 回到顶部
├── scripts/
│   ├── build.js            # 站点生成主入口（拆页 + 首页）
│   └── build-source.js     # 重建干净源（中间产物）
├── dist/                   # build 产物（16 课独立页，已跟踪到 main）
│   ├── 零基础语法/
│   └── 基础语法/
├── 零基础语法/             # 源 HTML（只读，build 不碰）
├── 基础语法/               # 源 HTML
├── 中级语法/               # 待更新
├── 高级语法/               # 待更新
└── _prototypes/            # 设计原型（.gitignore 排除）
```

## 部署

**GitHub Pages Source = main 分支 / 根目录**

main 分支直接包含 build 产物（`dist/` + `index.html` + `assets/`），push 后自动部署。无需 gh-pages 分支。

访问地址：<https://cheshiping.github.io/english-grammar/>

## 课程文件命名规范

`【编号】标题.html`，例如：

- `【G001】名词的数：单复数变化规则.html`
- `【G02】感叹句：What 与 How 的极简公式.html`
- `【G09】判断主语【主语从句、形式主语】.html`

编号规则：

- 零基础用三位 `G001` / `G002` …
- 基础 / 中级 / 高级用两位 `G01` / `G02` …

脚本按"目录顺序 + 编号数字"自动排序。

## 增量更新流程

1. 把新 HTML 丢进对应目录（命名规范见上）
2. `node scripts/build.js`
3. `git add .` → `git commit` → `git push`
5. GitHub Pages 自动部署，几分钟后生效

## 本地预览

```bash
python -m http.server 8000
# 访问 http://localhost:8000
```

> 不要直接双击 `index.html` 打开，否则 CSS 路径会错。

## 设计 / 实现

- 布局风格基于 `ecommerce-product-template`（暖米色 `#F5F1E6` + 墨黑 `#1B1712` + 藏红 `#E8A317`）
- 布局：左目录（粘性）+ 右内容
- 暗色主题：顶栏右侧太阳/月亮按钮切换，记忆在 `localStorage`，首次跟随系统；首屏 inline 脚本防闪烁
- 移动端：≤980px 触发；侧栏抽屉化 + 汉堡按钮 + 蒙层；右下角浮动"回到顶部"按钮
- 动画：页面 mount 入场（translateY 12px + opacity，280ms ease-out）、按钮 press scale、翻页箭头 hover slide
- 站点零依赖：纯静态 HTML/CSS/JS，部署 = GitHub Pages

## 后续 TODO

- 站内搜索（`Ctrl K`）
