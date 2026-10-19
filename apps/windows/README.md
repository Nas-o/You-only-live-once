# Windows x64 子项目

> 状态：✅ **已实现源代码与 Windows 构建产物**。
> 已在 Linux 上完成 Windows x64 交叉打包（`win-unpacked` / 便携版 ZIP），并通过
> Linux Electron 对 Windows 外壳与共享 UI 做了启动冒烟；**尚未在真实 Windows 机器上运行验收**。
> NSIS 安装包需要 Windows 或 Wine，当前环境未安装 Wine。

## 已实现

- Electron 44 外壳：单实例、窗口状态记忆、CSP、外链白名单、系统休眠/锁屏自动暂停
- 数据目录：`%APPDATA%\yolo-windows\yolo-data.json`（可用 `YOLO_CONFIG_DIR` 覆盖）
- 原子写入 + 每次保存前备份；导入/导出/打开数据目录
- 复用 `packages/desktop-ui`：任务表、启程侦查、并行计时、星图、攀登奖励、统计、设置
- 与 Linux 使用同一份 JSON 模型，可直接互相导入备份
- Windows 图标（多尺寸 `.ico`）与可执行文件资源元数据（resedit，已跳过代码签名）
- 便携版产物：`release/YouOnlyLiveOnce-0.1.0-win-x64-portable.zip`

## 运行 / 构建

```bash
# 在仓库根目录
npm install
npm run dev:windows          # Vite + Electron 开发模式
npm run build:windows        # 只构建渲染层
npm run package:windows      # 跨平台：win-unpacked + 便携版 ZIP
npm run start:demo:windows   # 构建后启动并载入示例数据
```

在 Windows 本机（或安装了 Wine 的 CI）上可构建 NSIS 安装包：

```bash
npm run package:windows:installer
# 或进入 apps/windows 执行 npm run package
```

## 当前产物

```text
apps/windows/release/win-unpacked/                         # 解包即可运行（Windows）
  └─ yolo.exe
apps/windows/release/YouOnlyLiveOnce-0.1.0-win-x64-portable.zip
```

## 验收状态

- [x] 共享 UI 在 Windows 外壳中可启动，示例数据与今日页正常（Linux Electron 冒烟）
- [x] Windows x64 `win-unpacked` 交叉打包成功，`yolo.exe` 为 PE32+ x86-64
- [x] 应用图标、产品名、版本元数据写入可执行文件
- [x] 数据目录与 JSON 模型正确
- [ ] 在真实 Windows 10/11 上启动、计时、睡眠恢复
- [ ] 125% / 150% / 200% DPI 与中文输入法验收
- [ ] NSIS 安装/卸载/开始菜单/桌面快捷方式验收（需要 Windows 或 Wine）
- [ ] Windows Defender / SmartScreen 提示评估（未签名）

## 待办

- 在 Windows 环境或安装 Wine 的 CI 上生成并验收 NSIS 安装包
- 增加系统通知与托盘；通知需 AppUserModelID 与安装路径配合
- 使用 Windows 代码签名证书签名（当前 `signExecutable: false`，仅跳过签名）
- 处理 Windows 文件名/路径长度与多显示器窗口恢复
