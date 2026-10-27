# dsh-sidebar-panels

[中文](#中文) · [English](#english)

在 DeepSeek Harness 里集中管理左侧「全局面板」图标的显示与顺序，并与各插件自带的侧栏开关双向同步。

Manage the left global panel list in DeepSeek Harness: show or hide entries, drag to reorder, and keep each entry in step with the plugin's own sidebar switch.

## 中文

### 功能

- **集中管理**：设置 → 通用 → 侧边栏面板（位于「外观」与「字号大小」之间），一屏列出当前所有面板行。
- **显示与隐藏**：取消勾选即从左侧面板列表移除，勾选恢复。侧边栏中右键任一图标可直接隐藏。
- **拖动排序**：侧边栏里直接拖动图标调整顺序；设置弹窗里拖动同样有效。使用与工作区、会话列表一致的原生 HTML5 拖放，落点按行上半/下半判定，并显示同样的插入指示条。
- **双向同步**：对本插件之外自带侧栏开关的插件，集中管理处的改动会写回它们自己的开关；反过来，在插件自己的界面里开关，也会反映到集中管理处。

### 同步覆盖的插件

| 面板行 | 插件 | 开关存储 |
| --- | --- | --- |
| 上下文洞察 | dsh-context | 设置项 `insightsEntry` |
| 搜索索引 | dsh-search-index | 设置项 `enabled` |
| 插件市场 | dsh-market | 插件自身的 `sidebar-entry` 状态 |
| 大肥鱼军械库 | dsh-armory | 浏览器本地存储 `dsh-armory/entry` |

其余面板行（插件、自动化任务、任务看板）没有自带开关，只由本插件控制。

同步只走各插件公开的持久化接口，不修改它们的源码。`dsh-market` 与 `dsh-armory` 的面板行是否注册由它们自己的内存状态决定，因此从关到开时它们需要刷新一次界面才会重新出现；反方向以及两个设置项插件都实时生效。

### 安装

```sh
dsh plugin add github:NONEMIN/dsh-sidebar-panels
```

装好后重载 DSH 窗口，在 设置 → 通用 → 侧边栏面板 打开。

### 数据存放位置

- 面板配置：`~/.dsh/sidebar-panels.json`
- 诊断日志：`~/.dsh/logs/sidebar-panels.log`（超过 1 MB 自动轮转）

本插件不联网、不读取项目文件、不收集任何数据。宿主侧的两个接口只接受同源写入。

### 许可

MIT

## English

### What it does

- **One place**: Settings → General → Sidebar panels, sitting between Appearance and Font size, lists every panel entry currently registered.
- **Show and hide**: uncheck an entry to remove it from the left panel list, check it to bring it back. Any icon can also be hidden with a right click in the sidebar.
- **Drag to reorder**: drag icons in the sidebar, or rows in the settings dialog. Both use the harness's native HTML5 drag and drop — the same mechanism as the workspace and conversation lists — with the same insertion marker and upper/lower-half hit test.
- **Two-way sync**: for plugins that ship their own sidebar switch, a change made here is written back to that plugin's switch, and a change made in the plugin's own UI shows up here.

### Plugins covered by the sync

| Entry | Plugin | Switch storage |
| --- | --- | --- |
| Context insights | dsh-context | setting `insightsEntry` |
| Search index | dsh-search-index | setting `enabled` |
| Plugin market | dsh-market | the plugin's own `sidebar-entry` state |
| Armory | dsh-armory | browser storage key `dsh-armory/entry` |

The remaining entries (plugins, schedules, task board) have no switch of their own and are controlled here only.

The sync uses only each plugin's public persistence surface and never edits their source. Whether `dsh-market` and `dsh-armory` register their entry at all is decided by their in-memory state, so turning one of them on from here needs that plugin to redraw once; the other direction, and both setting-backed plugins, follow live.

### Install

```sh
dsh plugin add github:NONEMIN/dsh-sidebar-panels
```

Reload the DSH window afterwards, then open Settings → General → Sidebar panels.

### Where data lives

- Panel configuration: `~/.dsh/sidebar-panels.json`
- Diagnostics: `~/.dsh/logs/sidebar-panels.log`, rotated at 1 MB

The plugin makes no network requests, reads no project files, and collects nothing. Its two host routes accept same-origin writes only.

### License

MIT
