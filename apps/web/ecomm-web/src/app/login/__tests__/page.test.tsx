import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../page';
import * as AppContextPkg from '../../../context/AppContext';
import { useRouter } from 'next/navigation';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Image
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

describe('LoginPage', () => {
  const loginMock = vi.fn();
  const clearAuthErrorMock = vi.fn();
  const pushMock = vi.fn();

  const defaultContext = {
    cart: [],
    user: null,
    isCartOpen: false,
    isAuthLoading: false,
    authError: null,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    toggleCart: vi.fn(),
    clearCart: vi.fn(),
    login: loginMock,
    register: vi.fn(),
    logout: vi.fn(),
    clearAuthError: clearAuthErrorMock,
  };

  const useAppContextSpy = vi.spyOn(AppContextPkg, 'useAppContext');

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextSpy.mockReturnValue(defaultContext);
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: pushMock });
  });

  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('handles successful form submission', async () => {
    loginMock.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

    const signInBtn = screen.getByText('Sign In').closest('button');
    fireEvent.click(signInBtn!);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('test@test.com', 'password123');
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('displays auth error when present', () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      authError: 'Invalid credentials',
    });

    render(<LoginPage />);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows loading state when authenticating', () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      isAuthLoading: true,
    });

    render(<LoginPage />);

    // Inputs should be disabled during loading
    expect(screen.getByPlaceholderText('you@example.com')).toBeDisabled();
    expect(screen.getByPlaceholderText('••••••••')).toBeDisabled();
  });

  it('clears error when dismiss button clicked', () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      authError: 'Some error',
    });

    render(<LoginPage />);

    const dismissBtn = screen.getByText('×');
    fireEvent.click(dismissBtn);

    expect(clearAuthErrorMock).toHaveBeenCalled();
  });
});
