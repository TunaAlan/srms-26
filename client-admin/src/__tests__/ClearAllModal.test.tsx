// =============================================================================
// ClearAllModal.test.tsx
// Verifies the bulk-delete confirmation dialog including its loading state.
// =============================================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ClearAllModal } from '../components/ClearAllModal';

describe('ClearAllModal', () => {
  it('renders the warning text about irreversibility', () => {
    render(<ClearAllModal onClose={vi.fn()} onConfirm={vi.fn().mockResolvedValue(undefined)} />);
    expect(screen.getByText(/geri alınamaz/i)).toBeInTheDocument();
  });

  it('calls onClose when the ✕ header button is clicked', async () => {
    const onClose = vi.fn();
    render(<ClearAllModal onClose={onClose} onConfirm={vi.fn().mockResolvedValue(undefined)} />);
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the "İptal" button is clicked', async () => {
    const onClose = vi.fn();
    render(<ClearAllModal onClose={onClose} onConfirm={vi.fn().mockResolvedValue(undefined)} />);
    await userEvent.click(screen.getByRole('button', { name: 'İptal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when the "Tümünü Sil" button is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ClearAllModal onClose={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tümünü Sil' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons and shows "Siliniyor..." while onConfirm is in flight', async () => {
    // onConfirm never resolves so the loading state stays active throughout the assertion.
    const onConfirm = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<ClearAllModal onClose={vi.fn()} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Tümünü Sil' }));

    expect(screen.getByRole('button', { name: 'Siliniyor...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'İptal' })).toBeDisabled();
  });

  it('re-enables buttons after onConfirm resolves', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<ClearAllModal onClose={vi.fn()} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Tümünü Sil' }));

    // After the promise resolves the buttons should return to their normal state.
    expect(screen.getByRole('button', { name: 'Tümünü Sil' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'İptal' })).not.toBeDisabled();
  });
});
