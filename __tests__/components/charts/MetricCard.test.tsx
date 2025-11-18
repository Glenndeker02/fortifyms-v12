import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricCard } from '@/components/charts/MetricCard';
import { Activity } from 'lucide-react';

describe('MetricCard', () => {
  it('renders metric card with title and value', () => {
    render(
      <MetricCard
        title="Total Output"
        value="2450K kg"
      />
    );

    expect(screen.getByText('Total Output')).toBeInTheDocument();
    expect(screen.getByText('2450K kg')).toBeInTheDocument();
  });

  it('displays positive change indicator', () => {
    render(
      <MetricCard
        title="Total Output"
        value="2450K kg"
        change={8.5}
      />
    );

    expect(screen.getByText('8.5%')).toBeInTheDocument();
  });

  it('displays negative change indicator', () => {
    render(
      <MetricCard
        title="Total Output"
        value="2450K kg"
        change={-3.2}
      />
    );

    expect(screen.getByText('3.2%')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const mockClick = jest.fn();
    render(
      <MetricCard
        title="Total Output"
        value="2450K kg"
        onClick={mockClick}
      />
    );

    const card = screen.getByText('Total Output').closest('div')?.parentElement;
    if (card) {
      fireEvent.click(card);
      expect(mockClick).toHaveBeenCalledTimes(1);
    }
  });

  it('renders with icon', () => {
    render(
      <MetricCard
        title="Total Output"
        value="2450K kg"
        icon={Activity}
        iconColor="blue"
      />
    );

    // Icon is rendered as SVG
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
