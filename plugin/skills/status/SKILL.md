---
description: 看北辰现状：需要你、下一版候选、已知未验证、完成比例
argument-hint: '[系统 key]'
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" *)
---

运行下面的命令（`$ARGUMENTS` 非空时加 `--system $ARGUMENTS`；为空时先用 `system list --json` 看有几个系统，只有一个就用它，有多个就分系统各看一遍）：

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/polaris.mjs" status --json
```

按 polaris skill 第 6 节用中文回答：先说需要用户做的事（按等待天数，超过 3 天的点出来），再说下一版候选、已知未验证，最后一句完成比例。数据库里还没有系统时，按 polaris skill 第 1 节询问系统名称、说明、星座和 key，再新建。
