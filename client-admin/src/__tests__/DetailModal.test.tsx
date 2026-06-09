// =============================================================================
// DetailModal.test.tsx
// Verifies role-gated status transitions and the two-step status change flow.
//
// Key rules under test:
//   - Only admin role with onChangeStatus prop can see the status dropdown.
//   - Only statuses that have transitions (in_progress, rejected) show the
//     dropdown — pending/in_review/resolved do not.
//   - Selecting a transition shows a note textarea + Onayla/Vazgeç.
//   - Onayla calls onChangeStatus with the correct args.
// =============================================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DetailModal } from '../components/DetailModal';
import { makeReport } from './helpers';

vi.mock('../components/PhotoLightbox', () => ({
  PhotoLightbox: () => null,
}));

describe('DetailModal', () => {
  it('renders the report description', () => {
    const report = makeReport({ description: 'Test açıklaması' });
    render(<DetailModal report={report} onClose={vi.fn()} />);
    expect(screen.getByText('Test açıklaması')).toBeInTheDocument();
  });

  it('calls onClose when the "Kapat" button is clicked', async () => {
    const onClose = vi.fn();
    render(<DetailModal report={makeReport()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT show the status change dropdown for review_personnel role', () => {
    const report = makeReport({ status: 'in_progress' });
    render(
      <DetailModal report={report} role="review_personnel" onClose={vi.fn()} onChangeStatus={vi.fn()} />,
    );
    // The status badge should exist but without the ▾ dropdown indicator
    const badge = screen.getByText('İşlemde');
    expect(badge.textContent).not.toContain('▾');
  });

  it('does NOT show the dropdown for statuses with no defined transitions (pending)', () => {
    const report = makeReport({ status: 'pending' });
    render(
      <DetailModal report={report} role="admin" onClose={vi.fn()} onChangeStatus={vi.fn()} />,
    );
    expect(screen.queryByText(/▾/)).not.toBeInTheDocument();
  });

  it('shows the ▾ dropdown indicator for admin with in_progress report', () => {
    const report = makeReport({ status: 'in_progress' });
    render(
      <DetailModal report={report} role="admin" onClose={vi.fn()} onChangeStatus={vi.fn()} />,
    );
    expect(screen.getByText(/İşlemde.*▾/)).toBeInTheDocument();
  });

  it('reveals transition options when the status badge is clicked', async () => {
    const report = makeReport({ status: 'in_progress' });
    render(
      <DetailModal report={report} role="admin" onClose={vi.fn()} onChangeStatus={vi.fn()} />,
    );
    await userEvent.click(screen.getByText(/İşlemde.*▾/));
    expect(screen.getByText('Çözüldü')).toBeInTheDocument();
    expect(screen.getByText('Tekrar İncelemeye Al')).toBeInTheDocument();
  });

  it('shows note textarea and confirm/cancel buttons after selecting a transition', async () => {
    const report = makeReport({ status: 'rejected' });
    render(
      <DetailModal report={report} role="admin" onClose={vi.fn()} onChangeStatus={vi.fn()} />,
    );
    await userEvent.click(screen.getByText(/Reddedildi.*▾/));
    await userEvent.click(screen.getByText('Tekrar İncelemeye Al'));
    expect(screen.getByPlaceholderText(/Not ekle/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Onayla' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vazgeç' })).toBeInTheDocument();
  });

  it('calls onChangeStatus with the correct id, status, and note on confirm', async () => {
    const onChangeStatus = vi.fn();
    const report = makeReport({ status: 'in_progress', id: 'report-id-1' });
    render(
      <DetailModal report={report} role="admin" onClose={vi.fn()} onChangeStatus={onChangeStatus} />,
    );
    await userEvent.click(screen.getByText(/İşlemde.*▾/));
    await userEvent.click(screen.getByText('Çözüldü'));
    await userEvent.type(screen.getByPlaceholderText(/Not ekle/i), 'Sorun giderildi');
    await userEvent.click(screen.getByRole('button', { name: 'Onayla' }));
    expect(onChangeStatus).toHaveBeenCalledWith('report-id-1', 'resolved', 'Sorun giderildi');
  });

  it('dismisses the confirmation panel when "Vazgeç" is clicked', async () => {
    const report = makeReport({ status: 'in_progress' });
    render(
      <DetailModal report={report} role="admin" onClose={vi.fn()} onChangeStatus={vi.fn()} />,
    );
    await userEvent.click(screen.getByText(/İşlemde.*▾/));
    await userEvent.click(screen.getByText('Çözüldü'));
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    // Panel is gone — the original dropdown indicator should be visible again
    expect(screen.getByText(/İşlemde.*▾/)).toBeInTheDocument();
  });

  it('displays the rejectReason banner when the report is rejected', () => {
    const report = makeReport({ status: 'rejected', rejectReason: 'Alakasız görsel' });
    render(<DetailModal report={report} onClose={vi.fn()} />);
    expect(screen.getByText('Alakasız görsel')).toBeInTheDocument();
  });
});
