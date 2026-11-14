---
description: 生成北辰只读镜像（Claude Code 可发布到 claude.ai，Codex 只生成文件）
argument-hint: '[已有镜像链接]'
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" *)
---

**插件根目录回退**：Claude Code 会自动替换 `${CLAUDE_PLUGIN_ROOT}`；Codex 等平台若原样保留它，就用本 `skills/mirror/SKILL.md` 往上两级的目录作为插件根目录，执行 `node "<插件根>/bin/polaris.mjs"`，不要依赖这个 shell 变量。写入时 `--actor <actor>` 按所在平台填 `claude` 或 `codex`。

按 polaris skill 第 5 节更新线上镜像：

1. 生成：`node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" mirror --out <工作区目录>/polaris-mirror.html`。在 Codex 中，只生成 HTML 文件，告诉用户文件绝对路径和镜像生成时间，并说明“要发布到 claude.ai 请在 Claude Code 里运行 /polaris:mirror”，到此结束。
2. Claude Code 中发布：输出目录要在 Artifact 工具允许发布的位置（工作目录或草稿目录），用 Artifact 工具发布这个文件。
   - 用户给了已有镜像链接（$ARGUMENTS），或记忆 / 项目 CLAUDE.md 或 AGENTS.md 里记着链接：发布到那个链接（这个会话没发布过它时，先按 Artifact 工具要求读一次）。
   - 都没有：新建，带 `icon: "chart"` 和一句 `description`，并把新链接记进记忆、项目 CLAUDE.md 或 AGENTS.md。
3. 告诉用户链接和镜像生成时间，并提醒：镜像在 claude.ai 上，能打开链接的人都能看到需求和任务内容；它不会自动更新。
