// =============================================================================
// DeleteModal.test.tsx
// Verifies the single-report deletion confirmation dialog.
// =============================================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DeleteModal } from '../components/DeleteModal';
import { makeReport } from './helpers';

describe('DeleteModal', () => {
  const report = makeReport({ description: 'Kaldırımda büyük bir çukur mevcut.', id: 'report-id-1' });

  it('renders the report description (truncated to 60 characters)', () => {
    render(<DeleteModal report={report} onClose={vi.fn()} onConfirm={vi.fn()} />);
    // The modal quotes the first 60 chars of the description followed by "..."
    expect(screen.getByText(/Kaldırımda büyük bir çukur/i)).toBeInTheDocument();
  });

  it('calls onClose when the ✕ header button is clicked', async () => {
    const onClose = vi.fn();
    render(<DeleteModal report={report} onClose={onClose} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the "İptal" button is clicked', async () => {
    const onClose = vi.fn();
    render(<DeleteModal report={report} onClose={onClose} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'İptal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with the report id when the "Sil" button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<DeleteModal report={report} onClose={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sil' }));
    expect(onConfirm).toHaveBeenCalledWith('report-id-1');
  });
});
