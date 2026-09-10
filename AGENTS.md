# AGENTS.md · 英语语法笔记站点

> 给 AI 编码 agent 的工作约束。本仓库只有一个目标：把 `零基础语法/` `基础语法/` `中级语法/` `高级语法/` 下的源 HTML 渲染成 GitHub Pages 站点。

---

## 0. 启动时必读

1. 读 `progress.md` —— 知道上次干到哪、踩过什么坑
2. 读 `README.md` —— 知道站点形态与部署
3. 跑 `bash init.sh` —— 验证环境 + 当前 build 是否健康

如果跑 `init.sh` 失败，**先修环境再动代码**。

---

## 1. 不可变约束（HARD RULES）

### 1.1 原 HTML 文件**只读**

- `零基础语法/` `基础语法/` `中级语法/` `高级语法/` 下的 `【Gxx】标题.html` 是**唯一源**。
- **build 脚本不得**修改、注入、重写、删除这些文件。
- 改这些文件 = 改内容（用户手动）。
- 这些文件被污染过一次（V1 注入过 SITE 块），再被 V2 提取时容忍。**绝不允许再被任何 build 步骤写入**。

### 1.2 build 流程幂等

- `node scripts/build.js` 跑任意次 = 同结果
- 它内部调 `scripts/build-source.js` 重建"干净源"，再从干净源拆 `dist/`
- "干净源"是临时中间产物（`index.html` 会被 `build.js` 末尾重写为最终首页），不需要保护

### 1.3 路径相对正确

- 课程页在 `dist/<level>/<file>.html`
- 课程页内任何相对链接必须基于 `dist/<level>/`：
  - 回首页 → `../../index.html`
  - 同辈课程 → `../<level>/<file>.html`（**只一个 `..`**，进入 dist/ 即可找到同辈）
  - CSS → `../../assets/site.css`

这是历史 bug：**两层 `..` 会跳到根目录的原始素材库**（被污染的旧文件），必须避免。

### 1.4 样式覆盖原 .card / .annotation

- 原 HTML 用了 `.card`（蓝底蓝边）、`.annotation`（绿条注释）、`.example-box` 等自定义类
- 站点 CSS 用 `.site-main .card` 作用域覆盖为暖色风格
- **不要**把原 HTML 的 class 改名——内容文件**只读**
- 也不要新增覆盖原 .card 视觉的全局类名（破坏作用域）

### 1.5 站点壳层结构（不要改）

```
index.html
└── 站点壳页
    ├── header.site-topbar
    ├── div.site-layout
    │   ├── aside.site-aside     ← 目录（粘性）
    │   └── main.site-main       ← 内容
    │       ├── .site-intro      ← 首页专用
    │       ├── .site-shelf      ← 每层级章节
    │       └── .site-prevnext   ← 课程页专用
    └── footer（暂无）
```

新功能必须**插入**到现有结构，**不要**改外壳类名。

---

## 2. 工作范围

### 允许做

- ✅ 改 `assets/site.css`（视觉调整）
- ✅ 改 `scripts/build.js` / `scripts/build-source.js`（生成逻辑）
- ✅ 改 `README.md` / `AGENTS.md` / `progress.md` / `feature_list.json`
- ✅ 改 `.gitignore`
- ✅ 跑 `node scripts/build.js` 后**只**新增 / 修改 / 覆盖 `dist/` 与 `index.html`
- ✅ 改 `init.sh`

### 不允许做

- ❌ 写入 / 删除 `零基础语法/` `基础语法/` `中级语法/` `高级语法/` 下的源 HTML
- ❌ 改用户原 HTML 的 class 名、id、文本
- ❌ 引入 npm 依赖（站点零依赖，部署就是静态文件）
- ❌ 加 React / Vue / 任何构建工具
- ❌ 加测试框架（不需要单测；`init.sh` 自带烟雾测试）

### 越界处理

如果用户要求改原 HTML（如修改语法解释、补充例句），**那是用户手动活**——告诉用户"请直接在 `零基础语法/` 下编辑对应 `【Gxx】.html` 文件"，**不要**让 agent 代写内容。

---

## 3. 完成定义（Definition of Done）

声称"完成"前**必须**通过以下全部检查：

1. ✅ `node scripts/build.js` 跑通，无错误
2. ✅ `dist/` 下的每课 HTML 都能在浏览器打开：
   - 顶栏 + 侧栏 + 正文 + 上一篇/下一篇 全部存在
   - CSS 加载成功（暖色底，不是裸 HTML）
   - 侧栏点击 → 跳到同辈课程页（不跳到原始素材）
3. ✅ `index.html` 只列卡片不显示正文
4. ✅ 源 HTML 文件 `git status` 无 diff

如果任一不通过，**不许说"完成"**。

---

## 4. 增量更新流程（这是用户最常做的事）

```
1. 用户在 零基础语法/ 或 基础语法/ 目录下
   新增 / 改 / 删 【Gxx】xxx.html

2. 跑：
   node scripts/build.js

3. 看：
   - 浏览器打开 http://localhost:8000
   - 确认新内容出现在首页
   - 点进对应课程页确认渲染

4. 提交：
   git add .
   git commit -m "新增 Gxx 课 / 修订 Gxx 内容"
   git push
```

5. 部署（已配 Pages 之后）自动生效。

---

## 5. 命名规范（强约束）

源 HTML 文件名：
```
【G{代码}】{标题}.html
```

- 代码：零基础用 `G001`-`G099`；基础/中级/高级用 `G01`-`G99`
- 标题：中文，**不要**加空格；用 `·` / `：` / `、` 等标点，不用 `-`
- 同代码可有多份（如 `G02` 有"2026版"和"原版"），按字母序排，build 自动保留

build 脚本从 `【】` 解析代码，从括号外解析标题。**改名 = 重新识别**，无 schema 文件。

---

## 6. 已知坑（踩过的）

| 坑 | 现象 | 解决 |
|---|---|---|
| V1 注入污染 | 原始 HTML 被加了 SITE 块、site-shell-hidden-h1 | 已迁移到"干净源 → dist 拆页"两段式，原始 HTML 不再被写入 |
| 路径 `../../` 误跳 | 侧栏点击跳到原始素材 | 改成 `../<level>/<file>`，**只一个 `..`** |
| 目录当前课不高亮 | 跳到新页后旧页高亮 | build 写入时按 `file` 字段匹配加 `class="cur"` |
| 首页同时显示正文 | 16 课全塞首页 | V2 单页 → V3 拆页，只 index.html 列卡片 |
| `node` 没装 | build 跑不了 | `init.sh` 自检；用户机器已确认有 node |

---

## 7. 会话交接

agent 结束会话时：

1. 更新 `progress.md` 的"当前状态"和"下一步"
2. 跑一遍 `init.sh` 确认能跑通
3. 在 `git status` 干净时结束（无未提交修改）

下一会话 agent 启动时按 `progress.md` "下一步"继续。
