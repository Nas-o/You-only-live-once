## 下载

| 平台 | 文件 | 说明 |
| --- | --- | --- |
| Linux x64 | `YouOnlyLiveOnce-*-x86_64.AppImage` | 赋权后直接运行 |
| Linux x64 | `YouOnlyLiveOnce-*-amd64.deb` | Debian / Ubuntu 安装包 |
| Windows x64 | `YouOnlyLiveOnce-*-win-x64-portable.zip` | 解压后运行 `yolo.exe`，无需安装 |
| Android | `YouOnlyLiveOnce-*-android-debug.apk` | Debug 签名，适合测试安装 |

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
