# 英语语法笔记 · 站点

陈老师语法系列整理版，部署在 GitHub Pages 上随时翻阅。

## 站点形态

**单页文档站**：`index.html` 一页容纳所有 16 课，左侧目录点击即可滚动到对应课程。源 HTML 文件保留在 `零基础语法/` `基础语法/` 等目录中作为素材库，不在站点里展示。

## 目录结构

```
.
├── index.html              # 站点页面（自动生成，所有课程都在里面）
├── assets/site.css         # 共享样式
├── scripts/build.js        # 生成脚本（核心）
├── 零基础语法/             # 5 课的源 HTML（仅作素材，不链接）
├── 基础语法/               # 11 课的源 HTML
├── 中级语法/               # 待更新
├── 高级语法/               # 待更新
└── _prototypes/            # 设计原型（已废弃，被 .gitignore 排除）
```

## 课程文件命名规范

`【编号】标题.html`，例如：

- `【G001】名词的数：单复数变化规则.html`
- `【G02】感叹句：What 与 How 的极简公式.html`
- `【G09】判断主语【主语从句、形式主语】.html`

编号规则：

- 零基础用三位 `G001` / `G002` …
- 基础 / 中级 / 高级用两位 `G01` / `G02` …

脚本按"目录顺序 + 编号数字"自动排序。

## 怎么用

### 1. 本地预览

```bash
python -m http.server 8000
# 访问 http://localhost:8000
```

> 不要直接双击 `index.html` 打开，否则 CSS 路径会错。

### 2. 跑生成脚本

修改课程文件后（新增 / 删除 / 重命名 / 改标题），都跑一次：

```bash
node scripts/build.js
```

脚本会扫描 `零基础语法/` `基础语法/` `中级语法/` `高级语法/` 下所有 HTML，**提取每课正文**（去掉原 H1、去链接）后按编号顺序拼到 `index.html`。

### 3. 增量更新内容

最常见的流程：

1. 把新 HTML 丢进对应目录（命名规范见上）
2. 跑 `node scripts/build.js`
3. `git add .` → `git commit` → `git push`

新课程会出现在首页对应层级的章节里，左侧目录也会自动加上。

## 怎么部署到 GitHub Pages

1. 在 GitHub 上新建一个空仓库，例如 `english-grammar-notes`
2. 本地首次推送：

   ```bash
   git remote add origin https://github.com/<你的用户名>/english-grammar-notes.git
   git branch -M main
   git add .
   git commit -m "init: 语法笔记站点"
   git push -u origin main
   ```

3. GitHub 仓库 → **Settings** → **Pages** → Source 选 `Deploy from a branch` → Branch 选 `main` / `(root)` → Save
4. 几分钟后访问 `https://<你的用户名>.github.io/english-grammar-notes/`

## 设计 / 实现

- 布局风格基于 `ecommerce-product-template`（暖米色 `#F5F1E6` + 墨黑 `#1B1712` + 藏红 `#E8A317`）
- 布局：左目录 + 右内容
- 暗色主题：顶栏右侧太阳/月亮按钮切换，记忆在 `localStorage`，首次跟随系统；首屏 inline 脚本防闪烁
- 移动端：≤980px 触发；侧栏抽屉化 + 汉堡按钮 + 蒙层；顶栏 z-index=70 保证可重复点击关闭；触摸友好间距
- 站点零依赖：纯静态 HTML/CSS/JS，部署 = GitHub Pages

## 后续 TODO

- 站内搜索（`Ctrl K`）
- GitHub Pages 部署
