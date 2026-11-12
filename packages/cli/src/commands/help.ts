export const help = `北辰命令行（Node >= 22.13）
用法：polaris <命令> [操作] [ID] [选项]
全局选项：--home DIR --system KEY --actor NAME --json --help
system add|update [KEY] --name NAME [--constellation 北斗] [--note TEXT]；system list
req add [ID] --title TEXT [--source 用户] [--priority P1] [--accept TEXT ...]
req update ID [--title TEXT --body MD --scope TEXT --owner NAME --accept TEXT ... --refs URL ...]
req check ID --item N [--off]（逐条验收，N 从 1 开始）
req move ID --status 已确认；req link|unlink ID --task TASK；req list|show [ID]
task add [ID] --title TEXT [--code CODE --lane planned --status TEXT]
task update ID [--progress 50 --detail TEXT --needs TEXT --target-release VERSION --unverified TEXT]
task move ID --lane waiting [--status TEXT]；task step ID --seq 1 --name TEXT --state done
task link ID --req REQ；task list|show [ID]；task delete ID
release record --version VERSION [--tasks ID,ID ... --build BUILD --ref REF]
release next --version VERSION [--note TEXT]（只改下一版；--note "" 清空说明，省略则保留）
log add --text TEXT；status [--system KEY]；check；undo BATCH
backup；restore FILE.sql；import-json DIR [--artifact-export]
serve [--port 8790] [--readonly]；mirror [--out FILE.html]
doctor [--json]：检查运行环境、数据、备份和端口（只读）
hook session-start：会话摘要（POLARIS_HOOK=off 关闭）
其他写入可用 --note TEXT 指定本次动态；更新时空字符串可清空可选字段。
步骤 --seq 从 1 开始；需求 --accept/--refs 替换对应完整列表。`;
