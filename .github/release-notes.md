## 下载

| 平台 | 文件 | 说明 |
| --- | --- | --- |
| Linux x64 | `*-x86_64.AppImage` / `*-amd64.deb` | AppImage 赋权运行；deb 用于 Debian/Ubuntu |
| Linux arm64 | `*-arm64.AppImage` / `*-arm64.deb` | ARM64 Linux |
| Windows x64 | `*-win-x64-portable.zip` | 解压后运行 `yolo.exe` |
| Windows arm64 | `*-win-arm64-portable.zip` | Windows on ARM |
| Android | `*-android-debug.apk` | Universal debug APK |

校验文件：`SHA256SUMS.txt`

## 安装提示

Linux：

```bash
chmod +x YouOnlyLiveOnce-*.AppImage
./YouOnlyLiveOnce-*.AppImage
```

Windows：解压 ZIP 后运行 `yolo.exe`。首次运行 SmartScreen 可能提示未知发布者。

Android：允许安装未知来源应用后安装 APK；这是 debug 签名，不是商店版本。

## 平台支持

v0.2.0 起只支持 **Linux / Windows / Android**。macOS 与 iOS 支持已取消，旧版本产物不再更新。

## 应用内更新

从 v0.1.9 起，客户端启动时会检查 GitHub Releases，发现新版本会弹窗询问：

- Windows 便携版：下载 ZIP、校验 SHA-256、退出后自动替换并重启
- Linux AppImage：下载新 AppImage 后自动替换并重启
- Android：打开新版 APK 下载，覆盖安装保留数据

v0.1.9 之前的版本没有更新检查器，需要最后手动安装一次 v0.1.9。

## 说明

- 所有数据保存在本机，没有账号、云同步或遥测。
- Windows 便携版尚未在真实 Windows 机器上做完整验收。
- Android 端尚未接入前台常驻服务；应用被系统回收时会从最后一次心跳恢复。
- 详细功能与数据位置见仓库 README。
- 代码采用 MIT License；噜噜人物、应用图标等品牌素材不包含在 MIT 授权中。
