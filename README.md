# 北辰 · Polaris

[English](README.en.md)

北辰是一个同时支持 Claude Code 和 Codex 的插件：让助手在工作时记录需求和任务进度，在本机星图看板查看多个系统，并导出可分享的只读镜像。

![北辰星图看板](docs/images/sky.png)

![北辰任务看板](docs/images/board.png)

## 运行要求

- **Node.js 22.13 或以上**，且启用内置 `node:sqlite`；推荐从 [Node.js 官网](https://nodejs.org) 安装 LTS。
- **Claude Code 或 Codex**，用于安装插件和调用 Skill。Codex 命令已在 CLI 0.167.0 验证，其他版本请以 `codex plugin --help` 为准。
- **git（可选）**，用于自动备份的版本提交。没有 git 时仍会导出 `backup/polaris.sql`，但不提交。

安装用户无需安装 pnpm 或项目依赖。

## 安装

把 `<仓库地址>` 换成本仓库的 Git 地址。需要有这个仓库的读取权限，并且本机 git 能拉取它（HTTPS 账号或 SSH 密钥）。

```bash
claude plugin marketplace add <仓库地址>
claude plugin install polaris@polaris
```

从本地仓库目录安装（使用仓库根目录，marketplace 会定位到 `plugin/`）：

```bash
claude plugin marketplace add /path/to/polaris
claude plugin install polaris@polaris
```

安装后新开 Claude Code 会话。需要临时试用本地插件时，也可运行 `claude --plugin-dir ./plugin`。

## 在 Codex 中使用

与 Claude Code 共用同一个插件市场和插件目录，无需另一套声明文件。安装：

```bash
codex plugin marketplace add https://gitlab.rejo9.com/guohongsen/polaris.git
codex plugin add polaris@polaris
```

需有 GitLab 仓库读取权限；命令参数以本机 `codex plugin --help` 及相应子命令的 `--help` 为准。首次启动时，在 Codex 中**信任插件钩子**后钩子才会运行。钩子摘要能否注入会话上下文，取决于 Codex 的支持情况。

Codex 默认 workspace-write 沙箱不能写工作区外的数据目录。使用默认数据目录时，在 `~/.codex/config.toml` 加入以下配置，把示例路径换成自己的**绝对路径**（若已有 `writable_roots`，在原数组中追加）：

```toml
[sandbox_workspace_write]
writable_roots = ["/Users/你的用户名/Documents/polaris-data"]
```

也可启动时指定：

```bash
codex -c 'sandbox_workspace_write.writable_roots=["/Users/你的用户名/Documents/polaris-data"]'
```

或把 `POLARIS_HOME` 指向工作区内的可写目录；切换目录不会搬迁已有数据。若两平台要共用数据，须使用相同的数据目录。

安装后新开会话。技能名为 `polaris:polaris`、`polaris:req`、`polaris:status`、`polaris:sync`、`polaris:mirror`，可直接用自然语言触发，例如“用北辰查看当前进度”。Codex 中的斜杠入口显示以本机界面为准。技能里的插件路径若仍显示 `${CLAUDE_PLUGIN_ROOT}`，用所读取的 `skills/<名>/SKILL.md` 往上两级作为插件根目录，执行 `node "<插件根>/bin/polaris.mjs"`。

Codex 的镜像技能只生成 HTML 文件并返回路径；要发布到 claude.ai 请在 Claude Code 里运行 `/polaris:mirror`。两个平台共用同一个数据目录和 http://127.0.0.1:8790/ 本机看板，无需各起一份服务。

Git 市场安装的更新命令：

```bash
codex plugin marketplace upgrade polaris
codex plugin add polaris@polaris
```

`upgrade` 不带市场名时刷新所有已配置的 Git 市场；随后重新 `add` 安装市场当前版本。本地目录市场无需 `upgrade`，目录更新后重新 `add` 即可。更新后新开会话。

## 第一次用

在新会话里说“记一条需求”；Claude Code 也可输入 `/polaris:status`。助手会询问系统名称、说明、星座名（默认“北斗”）和系统 key，然后在本机建库。你自己的数据和其他安装者互不相干。

默认数据目录是 `~/Documents/polaris-data/`（Windows 为用户主目录下的 `Documents/polaris-data`）：

| 文件 | 用途 |
|---|---|
| `polaris.db` | SQLite 数据库，另有运行时 WAL/SHM 文件 |
| `backup/polaris.sql` | 每次成功写入后的 SQL 导出；有 git 时保留提交历史 |
| `build/mirror.html` | 默认镜像输出位置 |

可在启动 Claude Code 或 Codex 前设置环境变量 `POLARIS_HOME`，改到你有写权限的本机目录；CLI 也支持 `--home DIR`。例如：

```bash
# macOS / Linux
export POLARIS_HOME="$HOME/polaris-data"
```

```powershell
# Windows PowerShell
$env:POLARIS_HOME = Join-Path $HOME 'polaris-data'
```

不要把正在使用的数据库放到网盘同步目录。换目录不会自动搬迁旧数据。

## 斜杠命令

以下是 Claude Code 的入口；Codex 使用上文所列技能名或自然语言触发。

| 命令 | 用途 |
|---|---|
| `/polaris:status` | 看需要你、下一版候选、已知未验证和完成比例 |
| `/polaris:req` | 记录需求、来源、优先级和验收标准 |
| `/polaris:sync` | 把当前对话中已发生的任务进展、决定和发版同步到北辰 |
| `/polaris:mirror` | 生成只读镜像，在发布工具可用时协助发布 |

CLI：`polaris release next --system KEY --version VERSION [--note TEXT]` 仅修改下一版，不新增发版记录。省略 `--note` 保留说明，`--note ""` 清空；系统须已有 App 记录。动态、修改记录、备份及 `undo` 沿用现有写入流程。

Claude Code 有数据库时，会话开始会注入最多 4 行只读摘要；无库时不输出。Codex 的钩子信任与上下文支持见上文。设置 `POLARIS_HOOK=off` 可关闭钩子。

## 本机看板

让助手“打开北辰本机看板”，或运行下面的 CLI 命令。本文的 `<插件目录>` 指已安装的插件根目录；本地仓库里就是 `plugin`，Skill 按所在平台定位正确路径。

```bash
node "<插件目录>/bin/polaris.mjs" serve
```

打开 http://127.0.0.1:8790/ 。服务只监听本机。若该端口已有北辰，会提示已经运行；若被其他程序占用，改用：

```bash
node "<插件目录>/bin/polaris.mjs" serve --port 8791
```

## 只读镜像

```bash
node "<插件目录>/bin/polaris.mjs" mirror --out ./polaris-mirror.html
```

生成一个内嵌数据的 HTML 文件，可发布为 Claude Artifact，或放到任何静态托管平台。发布需要相应工具或托管账号。镜像是生成时的**快照，不会自动更新**；数据变化后需要重新生成并发布。

## 数据与隐私

北辰的数据只保存在本机，不自动上传数据库或备份。发给助手的需求和对话仍按所用平台（Claude Code 或 Codex）的数据政策处理。镜像包含需求与任务内容；发布后，拿到链接的人可能都能看到，分享前请检查内容及托管平台的访问设置。

## 更新与卸载

管理者发布新版本时，应先递增 `plugin/.claude-plugin/plugin.json` 的 `version`，并提交源码和构建产物。Claude Code 用户更新：

```bash
claude plugin marketplace update polaris
claude plugin update polaris@polaris
```

Codex 用户更新（Git 市场）：

```bash
codex plugin marketplace upgrade polaris
codex plugin add polaris@polaris
```

两平台更新后均需新开会话。Claude Code 卸载：

```bash
claude plugin uninstall polaris@polaris
```

Codex 卸载：

```bash
codex plugin remove polaris@polaris
```

卸载插件不会删除数据目录；如需清理，请先备份再自行删除。

## 常见问题

- **Node 版本太低**：运行 `node --version`，安装 Node 22.13 或以上，并确认所用平台使用同一套 PATH。
- **`node:sqlite` 不可用**：使用 Node 官方构建，升级 LTS，并检查 `NODE_OPTIONS` 或启动参数中是否有 `--no-experimental-sqlite`。
- **端口被占用**：用 `serve --port 8791`，或先确认已有北辰服务是否可用。
- **斜杠命令不出现**：确认安装的是完整插件，安装或更新后新开会话。
- **检查环境与数据**：运行以下命令。doctor 只读检查 Node、SQLite、数据目录、数据库迁移版本和完整性、git、备份仓库及 8790 端口。每项显示 ✓ / ✗ 与修复建议；全部通过退出 0，否则退出 1。首次尚未建库或未装可选 git 也会标记未通过，但不妨碍首次建库或 SQL 导出。

```bash
node "<插件目录>/bin/polaris.mjs" doctor
node "<插件目录>/bin/polaris.mjs" doctor --json
```

开发与贡献见 [CONTRIBUTING.md](CONTRIBUTING.md)。历史页面仅保留 `history/index.v42.html`，作为新旧对照测试基准。

许可证：待定
