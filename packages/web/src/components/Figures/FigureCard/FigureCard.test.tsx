import '../../../../tests/support';
import { it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Figures } from '../Figures';
import { sample } from '../../../../tests/fixtures/sample';
import { dataStore } from '../../../store/dataStore';
import { uiStore } from '../../../store/uiStore';
it('lights a card and its Dipper star, toggles off, and supports keyboard activation', () => {
  render(<Figures />);
  const card = screen.getByRole('button', { name: /正式 App/ });
  fireEvent.click(card);
  expect(card.getAttribute('aria-pressed')).toBe('true');
  expect(uiStore.getState().pinned).toBe(0);
  fireEvent.click(card);
  expect(uiStore.getState().pinned).toBe(-1);
  fireEvent.keyDown(card, { key: 'Enter' });
  expect(uiStore.getState().pinned).toBe(0);
});

it.each([
  [{ version: '.42', build: '0.2.2-rc.1.20261120.42', releasedAt: '2026-11-20T16:16:00+08:00' }, '.42', '2026-11-20'],
  [{ version: '.43', releasedAt: '2026-11-24T15:40:00+08:00' }, '.43', '2026-11-24'],
  [{ version: '0.2.2-rc.1.20261125.46', releasedAt: '2026-11-25T22:23:00+08:00' }, '.46', '2026-11-25'],
])(
  'shows desktop release $version and its date in the presence of newer server deployments',
  (release, version, date) => {
    const system = sample.systems[0]!;
    const server = {
      version: '29-481b62ad-20261120',
      build: 'bm-web:shaue-29-1117-481b62ad-20261120',
      releasedAt: '2026-11-26T17:37:00+08:00',
    };
    dataStore.setState({
      snapshot: {
        ...sample,
        systems: [
          {
            ...system,
            app: { ...server, backend: '.36', skill: '第 8 版', model: 'deepseek' },
            releases: [
              release,
              server,
              { version: '.39', build: '0.2.2-rc.1.20261112.39', releasedAt: '2026-11-12T15:24:00+08:00' },
            ],
          },
        ],
      },
    });
    render(<Figures />);
    const card = within(screen.getByRole('button', { name: /正式 App/ }));
    expect(card.getByText(version)).toBeTruthy();
    expect(card.getByText(date)).toBeTruthy();
    expect(card.queryByText(/481b62ad|后端|Skill|deepseek/)).toBeNull();
  },
);
