import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LineChart } from '@/components/charts/LineChart';

describe('LineChart', () => {
  const mockData = [
    { month: 'Jan', value: 100 },
    { month: 'Feb', value: 150 },
    { month: 'Mar', value: 120 },
  ];

  const mockLines = [
    { dataKey: 'value', stroke: '#3b82f6', name: 'Value' },
  ];

  it('renders chart with title', () => {
    render(
      <LineChart
        title="Test Chart"
        data={mockData}
        lines={mockLines}
        xAxisKey="month"
      />
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders chart with description', () => {
    render(
      <LineChart
        title="Test Chart"
        description="Test Description"
        data={mockData}
        lines={mockLines}
        xAxisKey="month"
      />
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders export button when onExport is provided', () => {
    const mockExport = jest.fn();
    render(
      <LineChart
        title="Test Chart"
        data={mockData}
        lines={mockLines}
        xAxisKey="month"
        onExport={mockExport}
      />
    );

    const exportButton = screen.getByRole('button');
    expect(exportButton).toBeInTheDocument();
  });
});
