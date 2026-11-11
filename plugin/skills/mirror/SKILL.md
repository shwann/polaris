---
description: 生成北辰线上镜像并发布到 claude.ai（只读，给手机等设备看）
argument-hint: '[已有镜像链接]'
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" *)
---

按 polaris skill 第 5 节更新线上镜像：

1. 生成：`node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" mirror --out <可发布目录>/polaris-mirror.html`。输出目录要在 Artifact 工具允许发布的位置（工作目录或草稿目录）。
2. 发布：用 Artifact 工具发布这个文件。
   - 用户给了已有镜像链接（$ARGUMENTS），或记忆 / 项目 CLAUDE.md 里记着链接：发布到那个链接（这个会话没发布过它时，先按 Artifact 工具要求读一次）。
   - 都没有：新建，带 `icon: "chart"` 和一句 `description`，并把新链接记进记忆或项目 CLAUDE.md。
3. 告诉用户链接和镜像生成时间，并提醒：镜像在 claude.ai 上，能打开链接的人都能看到需求和任务内容；它不会自动更新。
