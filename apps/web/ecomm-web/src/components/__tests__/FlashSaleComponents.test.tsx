import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import CountdownTimer from '../CountdownTimer';
import FlashSaleBadge from '../FlashSaleBadge';
import '@testing-library/jest-dom';

describe('FlashSaleBadge', () => {
  it('renders correctly', () => {
    render(<FlashSaleBadge />);
    expect(screen.getByText(/Flash Sale/i)).toBeInTheDocument();
  });

  it('shows icon when showIcon is true', () => {
    const { container } = render(<FlashSaleBadge showIcon={true} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<FlashSaleBadge className="custom-test-class" />);
    expect(container.firstChild).toHaveClass('custom-test-class');
  });
});

describe('CountdownTimer', () => {
  it('renders time left correctly', async () => {
    const endTime = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(); // 2 hours from now
    render(<CountdownTimer endTime={endTime} mode="full" />);
    
    expect(await screen.findByText('02')).toBeInTheDocument(); // hours
  });

  it('calls onExpired when timer reaches zero', async () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    const endTime = new Date(Date.now() + 1000).toISOString(); // 1 second from now
    
    render(<CountdownTimer endTime={endTime} onExpired={onExpired} />);
    
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onExpired).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('shows compact mode correctly', async () => {
    const endTime = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 mins
    render(<CountdownTimer endTime={endTime} mode="compact" />);
    
    expect(await screen.findByText(/Ends In/i)).toBeInTheDocument();
  });
});
