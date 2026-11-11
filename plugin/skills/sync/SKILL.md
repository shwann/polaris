---
description: 把这次对话里的进展同步到北辰（任务状态、需要你、发版、动态）
argument-hint: '[补充说明]'
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" *)
---

把这次对话里已经发生、但还没记进北辰的变化同步进去。补充说明：$ARGUMENTS

命令行是 `node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs"`，规则按 polaris skill 第 3、4 节：

1. 先 `status --json` 和 `task list --json` 看现状。
2. 对照对话找出变化：开工、完成、合入等发版、发版、新出现的“需要你”、用户已经答复的事、新需求。只记确实发生了的事，不猜。
3. 逐条用命令写入（`task move`、`task update`、`task step`、`req add`、`release record`、`log add`），每条带 `--actor claude`，需要时用 `--note` 写一句清楚的动态。
4. 跑 `check`，有错误就修正或 `undo`。
5. 回复用户：列出写了哪些（任务编号 → 新状态），以及“需要你”现在有几项。不确定该不该记的，列出来问用户，不要擅自写。
