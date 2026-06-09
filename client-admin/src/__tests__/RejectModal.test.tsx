// =============================================================================
// RejectModal.test.tsx
// Verifies form validation and callback behaviour for the reject dialog.
// The rejection reason field is mandatory — the submit button must stay
// disabled until the user enters a non-whitespace string.
// =============================================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RejectModal } from '../components/RejectModal';
import { makeReport } from './helpers';

describe('RejectModal', () => {
  const report = makeReport({ id: 'report-id-1', categoryLabel: 'Yol Hasarı' });

  it('renders the report category label in the confirmation text', () => {
    render(<RejectModal report={report} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/Yol Hasarı/i)).toBeInTheDocument();
  });

  it('has the "Reddet" submit button disabled when the reason field is empty', () => {
    render(<RejectModal report={report} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Reddet' })).toBeDisabled();
  });

  it('keeps the button disabled when the field contains only whitespace', async () => {
    render(<RejectModal report={report} onClose={vi.fn()} onConfirm={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox'), '   ');
    expect(screen.getByRole('button', { name: 'Reddet' })).toBeDisabled();
  });

  it('enables the "Reddet" button when a non-empty reason is entered', async () => {
    render(<RejectModal report={report} onClose={vi.fn()} onConfirm={vi.fn()} />);
    await userEvent.type(screen.getByRole('textbox'), 'Geçersiz içerik');
    expect(screen.getByRole('button', { name: 'Reddet' })).not.toBeDisabled();
  });

  it('calls onConfirm with the report id and trimmed reason on submit', async () => {
    const onConfirm = vi.fn();
    render(<RejectModal report={report} onClose={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.type(screen.getByRole('textbox'), '  İçerik alakasız  ');
    await userEvent.click(screen.getByRole('button', { name: 'Reddet' }));
    expect(onConfirm).toHaveBeenCalledWith('report-id-1', 'İçerik alakasız');
  });

  it('calls onClose when "İptal" is clicked and no onBack is provided', async () => {
    const onClose = vi.fn();
    render(<RejectModal report={report} onClose={onClose} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'İptal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onBack instead of onClose when onBack prop is provided', async () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    render(<RejectModal report={report} onClose={onClose} onBack={onBack} onConfirm={vi.fn()} />);
    // When onBack is present the button label changes to "← Geri"
    await userEvent.click(screen.getByRole('button', { name: '← Geri' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
