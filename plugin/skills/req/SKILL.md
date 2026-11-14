---
description: 往北辰记一条需求（标题、来源、优先级、验收标准）
argument-hint: '需求描述'
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" *)
---

**插件根目录回退**：Claude Code 会自动替换 `${CLAUDE_PLUGIN_ROOT}`；Codex 等平台若原样保留它，就用本 `skills/req/SKILL.md` 往上两级的目录作为插件根目录，执行 `node "<插件根>/bin/polaris.mjs"`，不要依赖这个 shell 变量。写入时 `--actor <actor>` 按所在平台填 `claude` 或 `codex`。

用户要记的需求：$ARGUMENTS

按 polaris skill 第 2 节记录，命令行是 `node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs"`：

1. 从描述里整理出标题（一句话）、来源（客户 / 用户 / 评审 / 缺陷，没说就是“用户”）、优先级（P0 / P1 / P2，没说就问）、验收标准（能拆出几条就几条，拆不出就先空着）。
2. 系统：当前项目有 `.polaris.json` 就用它；否则 `system list` 只有一个就用它；有多个就问用户；没有系统时，先按 polaris skill 第 1 节询问系统名称并新建。
3. 编号：先 `req list --json` 看已有编号的规律，沿用同样的前缀和递增；没有规律就用 `R-001` 起。
4. 写入：`req add <编号> --system <key> --title … --source … --priority … --accept … --actor <actor>`。
5. 回复用户：编号、标题、优先级、验收标准，以及下一步建议（例如“确认后用 req move 改为已确认，再拆任务”）。
