import type { DispatchEngine, DispatchSpec, SystemInfo } from '@polaris/core';

export const DISPATCH_DEFAULTS: Record<DispatchEngine, DispatchSpec> = {
  codex: { engine: 'codex', model: 'gpt-6.1-sol', effort: 'xhigh' },
  claude: { engine: 'claude', model: 'opus', effort: 'medium' },
};
const PRESETS: Record<DispatchEngine, string[]> = {
  codex: ['gpt-6.1-sol'],
  claude: ['opus', 'sonnet', 'haiku'],
};

export function dispatchModels(system: SystemInfo, engine: DispatchEngine): string[] {
  const settings = system.dispatch ? [system.dispatch.current, ...system.dispatch.history] : [];
  return [
    ...new Set([
      ...PRESETS[engine],
      ...(system.dispatch?.models?.[engine] ?? []),
      ...settings.filter((d) => d.engine === engine).map((d) => d.model),
    ]),
  ];
}
