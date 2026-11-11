import { it, expect, vi, afterEach } from 'vitest';
import { readPreference, writePreference } from './persist';
afterEach(() => vi.restoreAllMocks());
it('keeps working when embedded storage access or writes are denied', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full');
  });
  expect(readPreference('board-system')).toBe('');
  expect(() => writePreference('board-input', 'pad')).not.toThrow();
});
