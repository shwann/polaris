import '../../../../tests/support';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Telemetry } from './Telemetry';
import { dataStore } from '../../../store/dataStore';
import { uiStore } from '../../../store/uiStore';

it('uses the full snapshot task count and the selected formal App version', () => {
  const snapshot = structuredClone(dataStore.getState().snapshot!);
  snapshot.systems[0]!.app = { version: '2.8.3', build: 'different-build', next: '2.9.0' };
  snapshot.tasks.push({ ...snapshot.tasks[0]!, id: 'other-task', systemKey: 'other' });
  dataStore.setState({ snapshot });
  const { rerender } = render(<Telemetry />);
  const telemetry = screen.getByLabelText('系统遥测');
  expect(telemetry.textContent).toContain(`NODES ${snapshot.tasks.length} · BUILD 2.8.3`);
  expect(telemetry.textContent).toContain('RA 02h31m DEC +89°15′');
  expect(telemetry.textContent).not.toMatch(/LAT|different-build|2\.9\.0/);
  uiStore.setState({ system: 'all', query: 'nothing matches', mineOnly: true });
  rerender(<Telemetry />);
  expect(telemetry.textContent).toContain(`NODES ${snapshot.tasks.length} · BUILD 2.8.3`);
  snapshot.systems.push({ ...snapshot.systems[0]!, key: 'other', app: { version: '3.0.1' } });
  dataStore.setState({ snapshot: { ...snapshot } });
  uiStore.setState({ system: 'other' });
  rerender(<Telemetry />);
  expect(telemetry.textContent).toContain(`NODES ${snapshot.tasks.length} · BUILD 3.0.1`);
});

it.each(['mirror', 'local', 'db'] as const)('labels the read-only %s source MIRROR', (origin) => {
  dataStore.setState({ origin, credentials: null });
  render(<Telemetry />);
  expect(screen.getByLabelText('系统遥测').textContent).toContain('SYS ONLINE · UPLINK ● MIRROR');
});

it.each([
  ['18798', '18798'],
  ['', 'LOCAL'],
])('uses the writable local port %s or LOCAL', (port, expected) => {
  vi.stubGlobal('window', { location: { port } });
  // Synthetic credentials mark a writable source; no request is made by this component.
  dataStore.setState({ origin: 'local', credentials: { token: 'test-only', page: 'test-only' } });
  render(<Telemetry />);
  expect(screen.getByLabelText('系统遥测').textContent).toContain(`UPLINK ● ${expected}`);
});

it('shows unknown data and connection state without inventing readings', () => {
  dataStore.setState({ snapshot: null, origin: null, connected: false });
  render(<Telemetry />);
  expect(screen.getByLabelText('系统遥测').textContent).toContain('SYS OFFLINE · UPLINK ○ —');
  expect(screen.getByLabelText('系统遥测').textContent).toContain('NODES — · BUILD —');
});
