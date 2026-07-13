import { render, screen } from '@testing-library/react';
import { Dashboard } from '../pages/Dashboard';
import { describe, it, expect, vi } from 'vitest';

// Mock the child components and external libraries
vi.mock('../components/DigitalTwin', () => ({
  DigitalTwin: () => <div data-testid="mock-digital-twin">Digital Twin Mock</div>
}));

vi.mock('../components/ModelMetrics', () => ({
  ModelMetrics: () => <div data-testid="mock-model-metrics">Model Metrics Mock</div>
}));

vi.mock('../components/MachineHistoryModal', () => ({
  MachineHistoryModal: () => <div data-testid="mock-history-modal">History Modal Mock</div>
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}));

// Mock ResizeObserver for Recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('Executive Dashboard Component', () => {
  it('renders the Executive Command Center header', () => {
    render(<Dashboard />);
    expect(screen.getByText('Executive Command Center')).toBeInTheDocument();
  });

  it('renders all key financial and AI KPIs', () => {
    render(<Dashboard />);
    expect(screen.getByText('Fleet OEE Score')).toBeInTheDocument();
    expect(screen.getByText('Revenue at Risk')).toBeInTheDocument();
    expect(screen.getByText('AI Energy Savings')).toBeInTheDocument();
  });

  it('renders the AI Prescriptive Action Center', () => {
    render(<Dashboard />);
    expect(screen.getByText('AI Prescriptive Actions')).toBeInTheDocument();
    expect(screen.getByText('Reroute Conveyor B')).toBeInTheDocument();
  });

  it('renders mocked sub-components', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('mock-digital-twin')).toBeInTheDocument();
    expect(screen.getByTestId('mock-model-metrics')).toBeInTheDocument();
  });
});
