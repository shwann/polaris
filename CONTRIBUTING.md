# 贡献指南

开发需要 Node.js 22.13 以上（内置 `node:sqlite`）、git，以及 `package.json` 的 `packageManager` 指定版本的 pnpm。不要新增或升级依赖而不说明理由。运行数据与源码分开，测试只用临时目录，不操作个人真实数据。

## 安装、检查与构建

```bash
pnpm install
pnpm check
pnpm build
```

macOS / Linux 构建前运行 `umask 022`；Windows 不需要设置 umask。

`pnpm check` 包括 TypeScript、ESLint、Prettier 和 Vitest。测试自动生成前端产物，用 jsdom 对照历史页面，不依赖本机 Chrome。测试准备脚本通过 Node 启动 Vite，以兼容 Windows。

`pnpm build` 生成 `plugin/bin/polaris.mjs` 和 `plugin/assets/index.html`。**正式发布时必须把两个构建产物随源码一起提交**，安装者才能直接使用，不需要下载依赖。不要手改生成文件；CI 会检查构建结果与已提交的产物是否一致。

## 代码与提交约定

- 每个文件不超过 300 行，按职责拆分。
- 说明文字使用中文，代码注释使用英文。
- 遵守现有 TypeScript、ESLint 与 Prettier 配置。
- 提交信息使用英文 Conventional Commits，例如 `feat(cli): add environment diagnostics` 或 `docs: explain plugin installation`。
- 插件内容改变时，发布前把 `plugin/.claude-plugin/plugin.json` 的 `version` 加一，否则用户更新可能继续使用缓存版本。本次由管理者合并后统一递增，当前分支不改版本。
- 检查 Git diff，确保没有个人路径、账号、真实项目数据或密钥；历史基准 `history/index.v42.html` 不做内容修改。

## 目录结构

| 路径 | 内容 |
|---|---|
| `.claude-plugin/marketplace.json` | marketplace 入口，指向 `./plugin` |
| `plugin/.claude-plugin/plugin.json` | 插件清单与版本 |
| `plugin/skills/`、`plugin/hooks/` | Skill、斜杠命令与会话钩子 |
| `plugin/bin/`、`plugin/assets/` | 已提交的可安装产物 |
| `packages/core/` | 共享类型、枚举与校验 |
| `packages/cli/` | CLI、SQLite、服务、导出与测试 |
| `packages/web/` | React 看板与星图引擎 |
| `docs/` | 架构与截图 |
| `history/index.v42.html` | 新旧对照测试基准 |

架构说明见 [docs/架构设计.md](docs/架构设计.md)。前端开发可用 `pnpm --filter @polaris/web dev`；需要数据时先启动本机 CLI `serve`。

## 本地试装

先构建，再从仓库根目录临时启动：

```bash
claude --plugin-dir ./plugin
```

若要验证完整 marketplace 安装链路，用本地仓库的绝对路径：

```bash
claude plugin marketplace add /path/to/polaris
claude plugin install polaris@polaris
```

新开会话，使用 `/polaris:status` 和 `/polaris:req`。试装时把 `POLARIS_HOME` 指向临时目录，避免写入真实数据。用 `node plugin/bin/polaris.mjs doctor --home <临时目录>` 检查环境，再验证 `serve` 与 `mirror`。

本地更新流程：递增插件版本、重新构建并提交，然后运行 `claude plugin marketplace update polaris` 和 `claude plugin update polaris@polaris`，新开会话。

SessionStart 使用默认发现路径 `plugin/hooks/hooks.json`，命令中的 `${CLAUDE_PLUGIN_ROOT}` 由 Claude Code 替换。摘要通过标准输出注入上下文，无库、禁用或出错时静默退出。格式依据 [插件参考](https://code.claude.com/docs/en/plugins-reference) 和 [钩子参考](https://code.claude.com/docs/en/hooks)。超过三个系统时，后续系统摘要合并到第三行。

## CI 与发布核对

主仓库在 GitLab：`.gitlab-ci.yml` 在 Linux 上用 Node 22 和 24 跑 `pnpm check`、`pnpm build`，再检查 `plugin/` 是否有未提交变化。`.github/workflows/ci.yml` 是同一套检查，另外覆盖 macOS、Windows，供 GitHub 镜像使用。Windows 实机和 Claude Code 实际安装 / 更新链路需要在相应环境中补验。

截图在 `docs/images/`（用示例数据生成）。发版前递增 `plugin/.claude-plugin/plugin.json` 的版本、重新生成产物、更新 CHANGELOG。
