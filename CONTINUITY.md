# MoePet · 桌面宠物

> **更新**: 2026-06-01
> **给女朋友做的 Mac 桌面宠物小程序**

---

## 项目状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| PRD | ✅ 完成 | `PRD.md` |
| 环境搭建 | ✅ 完成 | Tauri + Vite + TypeScript，**MSVC toolchain** 方案 |
| M1 原型 | ✅ 完成 | 透明窗口 + Canvas 宠物绘制 + 行走动画 |
| M2 MVP | ❌ 未开始 | 状态系统 + 右键菜单 + 喂食玩耍 |
| M3 完善 | ❌ 未开始 | 对话气泡 + 拖拽 + 多外观 + 持久化 |
| M4 打包 | ⏳ GitHub Actions | CI 自动打包三平台 |

---

## 环境安装 · 最终方案

### 关键发现：使用 MSVC toolchain 绕过 windres

| 问题 | 解决方案 |
|------|----------|
| 缺 `dlltool.exe` | 安装 LLVM，建软链接 `dlltool.exe → llvm-dlltool.exe` |
| 缺 `windres.exe` | **根本方案**：切换到 MSVC toolchain，不依赖 GNU 工具链 |
| embed-resource 调用 windres | MSVC 不调用 windres，问题自然解决 |

### 安装步骤（已验证可行）

```powershell
# 1. 切换到 MSVC toolchain
rustup target add x86_64-pc-windows-msvc
rustup default stable-msvc

# 2. 验证编译
cargo check --target x86_64-pc-windows-msvc

# 3. 启动开发
npm run tauri dev
```

---

## 最终方案：GitHub Actions CI

已配置 `.github/workflows/release.yml`：
- **触发条件**：push 到 main / 打 tag (v*)
- **自动构建**：macOS (Intel + Apple Silicon) / Ubuntu / Windows
- **产出**：三个平台的安装包

### 使用流程

```powershell
# 1. 本地开发调试（Windows 版本）
cd C:\Users\xubia\Downloads\MoePet\moe-pet
npm run tauri dev

# 2. 推送代码
git add .
git commit -m "feat: add feature X"
git push origin main

# 3. 打版本 tag，自动生成 Release
git tag v0.1.0
git push origin v0.1.0
```

---

## 技术栈

- **外壳**: Tauri v2 (Rust + WebView)
- **前端**: Vite + TypeScript + Canvas 渲染
- **宠物形象**: Canvas 矢量绘制二次元萌系角色（无需外部资源）
- **跨平台**: macOS 12+ / Windows 10+
- **自动化打包**: GitHub Actions

---

## 目录结构

```
MoePet/
├── .github/
│   └── workflows/
│       └── release.yml      ← CI 自动打包配置
├── PRD.md                   ← 产品需求文档
├── CONTINUITY.md            ← 项目上下文（本文件）
├── moe-pet/                 ← Vite + TypeScript 前端
│   ├── src/
│   │   ├── main.ts          ← 前端入口
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── src-tauri/           ← Tauri Rust 后端
└── src-tauri/
    ├── src/
    │   ├── lib.rs
    │   └── main.rs
    ├── Cargo.toml
    ├── build.rs
    └── tauri.conf.json
```

---

## 待办

1. ✅ Windows 本地调试已跑通（MSVC toolchain）
2. ✅ M1 原型已完成：Canvas 二次元萌系宠物 + 行走动画 + 心情气泡
3. 初始化 git 并推送到 GitHub
4. 验证 CI 自动打包流程
5. 开始 M2：状态系统 + 右键菜单

---

## 经验教训

1. **先查文档再动手** — Tauri 官方文档明确写了 Windows 不能打包 macOS，这次先查了就没踩这坑
2. **MSVC vs GNU** — Windows 上用 MSVC toolchain 完美规避了 windres/dlltool 问题，比绕来绕去的软链接方案干净
3. **CI 是终极方案** — 自动���建比本地交叉编译稳多了
4. **搜索引擎关键词** — `Tauri Windows windres not found` 能直接找到 GitHub issues 和解决方案