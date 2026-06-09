// =============================================================================
// LoginScreen.test.tsx
// Verifies form validation, disabled states, and the onLogin callback.
// The logo asset is mocked because jsdom cannot load binary files.
//
// Note: LoginScreen labels have no htmlFor/id association, so we query
// inputs by placeholder text instead of label text.
// =============================================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginScreen } from '../components/LoginScreen';

vi.mock('../assets/srms_logo.png', () => ({ default: 'mocked-logo.png' }));

describe('LoginScreen', () => {
  it('renders the email and password inputs', () => {
    render(<LoginScreen onLogin={vi.fn()} loading={false} error={null} />);
    expect(screen.getByPlaceholderText('ad.soyad@ankara.bel.tr')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('disables the submit button when both fields are empty', () => {
    render(<LoginScreen onLogin={vi.fn()} loading={false} error={null} />);
    expect(screen.getByRole('button', { name: 'Giriş Yap' })).toBeDisabled();
  });

  it('disables the submit button when only email is filled', async () => {
    render(<LoginScreen onLogin={vi.fn()} loading={false} error={null} />);
    await userEvent.type(screen.getByPlaceholderText('ad.soyad@ankara.bel.tr'), 'admin@test.com');
    expect(screen.getByRole('button', { name: 'Giriş Yap' })).toBeDisabled();
  });

  it('disables the submit button when only password is filled', async () => {
    render(<LoginScreen onLogin={vi.fn()} loading={false} error={null} />);
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    expect(screen.getByRole('button', { name: 'Giriş Yap' })).toBeDisabled();
  });

  it('enables the submit button when both fields are filled', async () => {
    render(<LoginScreen onLogin={vi.fn()} loading={false} error={null} />);
    await userEvent.type(screen.getByPlaceholderText('ad.soyad@ankara.bel.tr'), 'admin@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    expect(screen.getByRole('button', { name: 'Giriş Yap' })).not.toBeDisabled();
  });

  it('calls onLogin with email and password when the form is submitted', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginScreen onLogin={onLogin} loading={false} error={null} />);
    await userEvent.type(screen.getByPlaceholderText('ad.soyad@ankara.bel.tr'), 'admin@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
    expect(onLogin).toHaveBeenCalledWith('admin@test.com', 'password123');
  });

  it('does not call onLogin when submitted with empty fields', async () => {
    const onLogin = vi.fn();
    render(<LoginScreen onLogin={onLogin} loading={false} error={null} />);
    await userEvent.keyboard('{Enter}');
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('disables the submit button and shows loading text when loading is true', () => {
    render(<LoginScreen onLogin={vi.fn()} loading={true} error={null} />);
    expect(screen.getByRole('button', { name: 'Giriş yapılıyor...' })).toBeDisabled();
  });

  it('displays the error message when an error prop is provided', () => {
    render(<LoginScreen onLogin={vi.fn()} loading={false} error="Bu panele erişim yetkiniz yok." />);
    expect(screen.getByText('Bu panele erişim yetkiniz yok.')).toBeInTheDocument();
  });

  it('does not render an error element when error is null', () => {
    const { container } = render(<LoginScreen onLogin={vi.fn()} loading={false} error={null} />);
    // The .login-error div is hidden via display:none when error is null — it should be empty
    expect(container.querySelector('.login-error')).not.toBeInTheDocument();
  });
});
