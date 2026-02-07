import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterPage from '../page';
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

describe('RegisterPage', () => {
  const registerMock = vi.fn();
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
    login: vi.fn(),
    register: registerMock,
    logout: vi.fn(),
    clearAuthError: clearAuthErrorMock,
  };

  const useAppContextSpy = vi.spyOn(AppContextPkg, 'useAppContext');

  beforeEach(() => {
    vi.clearAllMocks();
    useAppContextSpy.mockReturnValue(defaultContext);
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: pushMock });
  });

  it('renders registration form correctly', () => {
    render(<RegisterPage />);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('handles successful form submission', async () => {
    registerMock.mockResolvedValueOnce(undefined);
    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText('John Doe');
    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByText('Sign Up');

    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith('jane@example.com', 'password123', 'Jane Doe');
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
    });
  });

  it('displays auth error when present', () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      authError: 'Email already registered',
    });

    render(<RegisterPage />);

    expect(screen.getByText('Email already registered')).toBeInTheDocument();
  });

  it('shows loading state when authenticating', () => {
    useAppContextSpy.mockReturnValue({
      ...defaultContext,
      isAuthLoading: true,
    });

    render(<RegisterPage />);

    // Inputs should be disabled during loading
    expect(screen.getByPlaceholderText('you@example.com')).toBeDisabled();
    expect(screen.getByPlaceholderText('••••••••')).toBeDisabled();
  });
});
