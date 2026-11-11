import type { CSSProperties } from 'react';
export type Style = CSSProperties & Record<`--${string}`, string | number | undefined>;
export const vars = (style: Style) => style;
