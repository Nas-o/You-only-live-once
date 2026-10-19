# 架构说明

## 1. 分层

```text
┌────────────────────────────────────────────────────────────┐
│ 平台外壳（apps/linux/electron、apps/windows/electron）       │
│ 窗口 · 单实例 · 菜单 · CSP · 文件对话框 · 原子写入 · 备份    │
└──────────────────────────┬─────────────────────────────────┘
                           │ preload 白名单 IPC（同一契约）
┌──────────────────────────▼─────────────────────────────────┐
│ 共享桌面 UI（packages/desktop-ui）                           │
│ React 页面 · zustand 状态机 · immer 提交 · 视图与动效        │
└──────────────────────────┬─────────────────────────────────┘
                           │ 纯函数调用
┌──────────────────────────▼─────────────────────────────────┐
│ 领域核心（packages/core）                                   │
│ 类型 · 报告校验/评分 · 计时恢复 · 攀登值/营地/成就 · 统计    │
│ 初始数据 · 示例数据 · 数据迁移                              │
└────────────────────────────────────────────────────────────┘
```

约束：

- `packages/core` 不 import React、Electron、Node API 或 DOM。
- `packages/desktop-ui` 不 import Electron/Node API；只通过 `window.yolo` 白名单桥访问平台能力。
- Linux 与 Windows 外壳实现同一套 `data:*` / `app:*` / `power:suspend` IPC 契约；数据目录不同，JSON 模型一致。
- 主进程不承载业务规则，只负责平台能力与数据安全。
- 所有状态变更必须经过 store 的 `commit`，以保证成就/攀登值结算与持久化触发不被绕过。

## 2. 数据模型

| 实体 | 关键字段 | 说明 |
| --- | --- | --- |
| `Task` | status, progress, estimatedMinutes, dueDate, phases, report, goalId | 任务与阶段、报告、累计投入 |
| `Phase` | estimatedMinutes, dueDate, status, rewardedAt | 阶段；`rewardedAt` 防止撤销后重复领奖 |
| `ResearchReport` | 11 项答案, path, resources, calibratedMinutes, score | 启程侦查；路径可生成阶段 |
| `Goal` | color, deadline, knowledgePoints | 大目标星图 |
| `KnowledgePoint` | status(locked/available/lit), xp, taskId, litAt | 知识点 |
| `FocusSession` | startedAt, endedAt, seconds, parallel, xp | 已结算的专注记录 |
| `ActiveTimer` | startedAt, heartbeatAt, accumulatedSeconds, pausedAt | 运行中的计时，可跨界面/重启恢复 |
| `RewardState` | xp, events, unlocked, dailyGoalAwards | 攀登值、足迹、成就、每日奖励去重 |
| `AppData` | version, meta, profile, settings, 全部实体 | 单文件根对象 |

时间约定：日期键使用**本地时区** `YYYY-MM-DD`；时间戳使用 ISO 字符串。`migrateData` 为旧数据补齐字段。

## 3. 启程侦查门禁

```text
点击开始计时
   │
   ├─ task.report 存在 ──────────────► 创建 ActiveTimer → 打开专注空间
   │
   └─ 不存在
        └─ 打开报告弹窗（startAfterSubmit=true）
             │
             ├─ 校验失败：点击提交后逐项提示，不能开始
             └─ 校验通过：createReport → applyReportToTask
                            ├─ 校准 estimatedMinutes
                            ├─ 可选：学习路径 → 阶段（追加/替换）
                            ├─ status: backlog → active
                            ├─ 首次 +60 攀登值
                            └─ 自动创建计时 → 打开专注空间
```

报告校验规则（`validateReport`）：

- 对象、目标、验收、前置、有用范围、不学范围、风险均有最小长度
- 学习路径 ≥ 2 步，每步 ≥ 5 分钟
- 至少一条资料
- 预计总用时 10 分钟 – 500 小时
- 把握程度 1–5

评分（`reportCompleteness`）按字段完整度与路径细节加权到 100，仅衡量“想清楚的程度”。

## 4. 计时生命周期

```text
startTimer(taskId)
  ├─ 任务已完成/归档 → 拒绝
  ├─ 无报告 → 报告门禁
  ├─ 同任务已有计时 → 恢复/打开
  ├─ 运行中数量 ≥ settings.maxParallel → 拦截
  └─ createTimer → activeTimers.push

运行中
  ├─ 每 15s heartbeat：accumulatedSeconds += Δ，heartbeatAt = now
  ├─ 暂停：沉淀本段，pausedAt = now
  ├─ 恢复：pausedAt = null，heartbeatAt = now
  ├─ 切换/收起：计时继续，只改变专注空间展示
  └─ 收功：settle → FocusSession + 任务累计 + 攀登值 + 每日目标 + 成就

异常关闭/重启
  └─ recoverTimers：运行中的计时转为暂停，只信任最后一次心跳的累计值
     （关闭期间不计时、不虚增）

系统休眠 / 锁屏
  └─ 主进程 powerMonitor 发送断开时刻 → 渲染层按该时刻暂停所有计时
     （休眠/锁屏时间不计入专注，回来后手动继续）
```

`parallel` 在收功时记录当时正在运行的计时条数（含自己），用于统计并行成本。

## 5. 攀登值与成就结算

```text
commit(recipe)
  ├─ immer produce 修改数据
  ├─ syncAchievements（可循环至多 3 轮，成就奖励可能推动营地）
  ├─ 比较 prevXp / nextXp → 是否升级
  ├─ set({ data })
  └─ 推送 XP / 成就 / 升级提示
```

攀登值来源：专注分钟、首次报告、阶段完成（每阶段一次）、任务完成（每任务一次）、知识点、目标完成、每日目标、成就。
防重复领取：`Phase.rewardedAt`、`Task.completionRewardedAt`、`rewards.unlocked`、`dailyGoalAwards`。

营地：11 个营地（山脚/林间/溪谷/草甸/岩壁/雪线/冰川/山脊/风口/冲顶营地/峰顶）× 4 阶（初探/渐入/稳健/抵达），`xpToNextLevel(n) = round(45 × n^1.55)` 累积升级。

## 6. 持久化与迁移

- 渲染层数据变化后 450ms 去抖保存；每 15s 心跳也触发保存。
- 主进程保存前把旧文件复制为 `yolo-data.backup.json`，再写临时文件并 rename（原子替换）。
- 启动时读主文件；JSON 损坏或为 null 则回退 `yolo-data.backup.json`。
- `beforeunload` 与窗口隐藏时尽力同步一次。
- 导入时经 `migrateData` 校验与补齐；版本号在 `SCHEMA_VERSION`。

## 7. 安全边界

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`
- preload 只暴露固定 IPC 白名单
- 生产环境注入 CSP：`default-src 'self'`，禁止外部脚本/连接
- 阻止页面导航与新窗口；外链只允许 http(s) 并交给系统浏览器
- 无网络请求、无遥测

## 8. 跨平台适配契约

平台子项目需要实现的最小能力：

1. **存储桥**：`loadData` / `saveData` / `exportData` / `importData`
2. **计时保活**：桌面端依赖心跳与状态恢复；Android 需要前台服务/通知与 Doze 处理
3. **通知**：每日目标、计时结束、连续专注提醒（可选）
4. **窗口外壳**：尺寸、单实例、快捷键、托盘（可选）
5. **打包**：Linux（AppImage/deb）、Windows（便携 ZIP/NSIS）、Android（APK/AAB）

桌面端实现状态：

- `apps/linux`：Electron 44，数据目录 `yolo-linux`，AppImage/deb 已产出并启动验证。
- `apps/windows`：Electron 44，数据目录 `yolo-windows`，`win-unpacked` 与便携 ZIP 已交叉构建；
  用同一套 IPC 契约与 `packages/desktop-ui`。NSIS 安装器需 Windows/Wine。
- `apps/android`：Capacitor 7 + 移动布局 + `window.yolo` 平台桥；数据存 Preferences，
  导出走 Share/Filesystem，导入走系统文件选择器；Debug APK 已构建。
- 桌面两端共享 `powerMonitor` 休眠/锁屏暂停逻辑、文件对话框、备份策略与安全边界。
- Android 后台/锁屏时按真实时间继续计时；前台服务/通知尚未接入，进程被杀后只恢复到最后一个心跳。

UI 与 core 不需要感知平台差异。

## 9. 主题层

- 主题存在 `settings.theme`：`paper` / `ink` / `swiss`，默认 `paper`。
- `packages/desktop-ui/src/lib/theme.ts` 在 React 挂载前应用 `data-theme`，并写入 localStorage 作为首屏缓存；数据文件中的主题在 bootstrap 后再次校正。
- CSS 顺序：`global.css`（布局）→ `paper.css`（默认主题）→ `ink.css` / `swiss.css`（按 `html[data-theme]` 覆盖变量与关键组件）。
- 顶栏 `ThemeSwitcher` 循环切换；设置页主题面板可直选。切换会立即提交 `settings.theme` 并去抖持久化。

## 10. Android 平台桥与移动布局

- `apps/android/src/mobileBridge.ts` 实现与桌面 preload 相同的 `window.yolo` 契约：
  - `loadData/saveData`：Preferences 主键 `yolo-data-v1` + 备份键；Web 预览退化为 localStorage。
  - `exportData`：Filesystem 写入 Cache，再通过 Share 打开系统分享面板。
  - `importData`：动态创建 `<input type="file">`，读取 JSON 后交给 `migrateData`。
  - `onPowerSuspend`：桌面按休眠时刻暂停；Android 原生不暂停（锁屏学习是常态），Web 预览监听 `visibilitychange` 以演示暂停逻辑。
  - `appInfo/openExternal/quit/minimize/openDataFolder`：对应 Capacitor 插件或 Web fallback。
- 移动布局在 `packages/desktop-ui` 的 CSS 中通过 `max-width: 820px` 生效：
  - 隐藏侧栏，显示固定底部导航（今日/任务/星图/攀登/统计）。
  - 任务表行转为卡片网格；报告/详情弹层全宽；弹窗底部安全区适配。
  - 顶栏保留问候、今日进度环、设置与新建任务。
- Android 构建链：Vite → `cap sync` → Gradle（AGP 8.x / compileSdk 35 / minSdk 23）→ debug APK。
- 当前限制：无前台服务，后台会暂停计时；debug 签名；未做真机 DPI/键盘/返回键验收。
