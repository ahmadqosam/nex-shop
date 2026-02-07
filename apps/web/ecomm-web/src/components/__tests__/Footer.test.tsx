
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Footer } from '../Footer';

describe('Footer', () => {
  it('renders footer content', () => {
    render(<Footer />);
    expect(screen.getByText(/Future of Sound/)).toBeInTheDocument();
    expect(screen.getByText(/Santa Barbara/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
  });
});
