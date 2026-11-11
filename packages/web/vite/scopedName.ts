import { basename } from 'node:path';

export const scopedName = (name: string, filename: string) => `p-${basename(filename, '.module.css')}-${name}`;
