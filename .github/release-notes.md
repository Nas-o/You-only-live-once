## 下载

| 平台 | 文件 | 说明 |
| --- | --- | --- |
| Linux x64 | `*-x86_64.AppImage` / `*-amd64.deb` | AppImage 赋权运行；deb 用于 Debian/Ubuntu |
| Linux arm64 | `*-arm64.AppImage` / `*-arm64.deb` | ARM64 Linux |
| Windows x64 | `*-win-x64-portable.zip` | 解压后运行 `yolo.exe` |
| Windows arm64 | `*-win-arm64-portable.zip` | Windows on ARM |
| macOS Intel | `*-mac-x64.dmg` / `.zip` | 未签名，首次打开需放行 |
| macOS Apple Silicon | `*-mac-arm64.dmg` / `.zip` | 未签名，首次打开需放行 |
| Android | `*-android-debug.apk` | Universal debug APK |
| iOS | `*-ios-unsigned.ipa` | 未签名，需要 AltStore/Sideloadly 重签 |

校验文件：`SHA256SUMS.txt`

## 安装提示

Linux：

```bash
chmod +x YouOnlyLiveOnce-*.AppImage
./YouOnlyLiveOnce-*.AppImage
```

Windows：解压 ZIP 后运行 `yolo.exe`。首次运行 SmartScreen 可能提示未知发布者。

Android：允许安装未知来源应用后安装 APK；这是 debug 签名，不是商店版本。

## 说明

- 所有数据保存在本机，没有账号、云同步或遥测。
- Windows 便携版尚未在真实 Windows 机器上做完整验收。
- Android 端尚未接入前台常驻服务；应用被系统回收时会从最后一次心跳恢复。
- 详细功能与数据位置见仓库 README。
- 代码采用 MIT License；噜噜人物、应用图标等品牌素材不包含在 MIT 授权中。
- iOS IPA 未签名，不能直接安装或上架；macOS 应用未签名，Gatekeeper 可能拦截。
