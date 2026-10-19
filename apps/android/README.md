# Android 手机版子项目

> 状态：✅ **源码与 Debug APK 已生成并完成 Web/桥接验收**。
> 尚未在真实 Android 手机或模拟器上安装验证；未接入前台服务与常驻通知。

## 已实现

- Capacitor 7.6 + React 19 + Vite 7，复用 `packages/core` 与 `packages/desktop-ui`
- 移动布局：底部导航（今日/任务/星图/攀登/统计）、单列任务卡、全宽报告与详情抽屉、移动端顶栏
- 平台桥 `window.yolo`：
  - `@capacitor/preferences` 持久化（主键 `yolo-data-v1`，备份键 `yolo-data-backup-v1`）
  - `@capacitor/share` + `@capacitor/filesystem` 导出 JSON
  - 系统文件选择器导入 JSON
  - `@capacitor/app` 退出/最小化、前后台状态监听
  - `@capacitor/browser` 打开外部资料链接
- 应用退到后台/锁屏时计时按真实时间继续（适合锁屏学习）；进程存活期间由 JS 计时
- 未接入前台服务与常驻通知；进程被系统杀死后，重启恢复到最后一个心跳，不虚增
- 纸色启动屏、自适应图标、中文应用名、minSdk 23 / targetSdk 35
- 三套界面主题（纸上时间 / 深墨 / 瑞士网格），顶栏一键切换并持久化
- Debug APK：`release/YouOnlyLiveOnce-0.1.0-android-debug.apk`（约 5 MB）

## 构建

需要 **JDK 21** 与 **Android SDK 35**。本仓库不提交 SDK/JDK。

```bash
# 1. 安装 JDK 21 与 Android cmdline-tools（略，见 Android 官方文档）
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk
export ANDROID_USER_HOME=/path/to/workspace/.android-user   # 避免写入 HOME
export GRADLE_USER_HOME=/path/to/workspace/.gradle
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# 2. 安装 SDK
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

# 3. 构建（仓库根目录）
npm install
npm run sync:android
npm run package:android
# → apps/android/release/YouOnlyLiveOnce-0.1.0-android-debug.apk
```

开发预览（浏览器移动视口）：

```bash
npm run dev:android
npm run test:mobile      # 390×844 逐页截图 + 横向溢出检查
npm run verify:android:web  # Android 平台桥 + localStorage + 计时结算
```

## APK 校验结果

```text
package name : com.yolo.android
versionName  : 0.1.0
minSdk       : 23
targetSdk    : 35
label        : 你只活一次
icon         : adaptive icon（深色底 + 鎏金时钟）
signature    : Android Debug
```

## 验收状态

- [x] 390×844 移动布局：无横向溢出
- [x] 底部导航、移动任务卡、全宽报告/详情页
- [x] Android Web 包启动、示例数据载入
- [x] 平台桥 localStorage 持久化、计时收功追加会话
- [x] Gradle `assembleDebug` 成功，`aapt2` 元数据正确
- [ ] 真机/模拟器安装与启动
- [ ] 真实 Preferences 持久化、分享导出、文件导入
- [ ] 后台计时前台服务与常驻通知（当前进程存活时按真实时间继续）
- [ ] 系统返回键、键盘遮挡、浅色状态栏与状态栏图标
- [ ] release keystore 与 AAB 上架配置

## 已知限制

- Debug 签名，**不适合直接分发**；需配置 release signing。
- 未实现前台服务/常驻通知：应用退到后台后，只要进程存活计时会继续；进程被系统回收时可能损失最后一段时间。
- 未在真机验证 Doze、厂商 ROM 后台限制、文件选择器与分享面板。
- WebView 版本较旧时，`color-mix` 等现代 CSS 可能降级；建议 Android System WebView 保持更新。
