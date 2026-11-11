let tooltip: ((text: string, detail: string, x: number, y: number) => void) | null = null;
export const bindTooltip = (callback: typeof tooltip) => {
  tooltip = callback;
};
export const showTooltip = (text: string, detail: string, x: number, y: number) => tooltip?.(text, detail, x, y);
