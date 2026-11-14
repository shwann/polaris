---
description: 看北辰现状：需要你、下一版候选、已知未验证、完成比例
argument-hint: '[系统 key]'
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" *)
---

**插件根目录回退**：Claude Code 会自动替换 `${CLAUDE_PLUGIN_ROOT}`；Codex 等平台若原样保留它，就用本 `skills/status/SKILL.md` 往上两级的目录作为插件根目录，执行 `node "<插件根>/bin/polaris.mjs"`，不要依赖这个 shell 变量。写入时 `--actor <actor>` 按所在平台填 `claude` 或 `codex`。

运行下面的命令（`$ARGUMENTS` 非空时加 `--system $ARGUMENTS`；为空时先用 `system list --json` 看有几个系统，只有一个就用它，有多个就分系统各看一遍）：

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" status --json
```

按 polaris skill 第 6 节用中文回答：先说需要用户做的事（按等待天数，超过 3 天的点出来），再说下一版候选、已知未验证，最后一句完成比例。数据库里还没有系统时，按 polaris skill 第 1 节询问系统名称、说明、星座和 key，再新建。
