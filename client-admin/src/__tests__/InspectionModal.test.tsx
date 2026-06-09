// =============================================================================
// InspectionModal.test.tsx
// Verifies the reviewer action flow: approve (with confirm screen), correct,
// and reject. Each action must call the correct callback and close the modal.
// =============================================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InspectionModal } from '../components/InspectionModal';
import { makeReport } from './helpers';

vi.mock('../components/PhotoLightbox', () => ({
  PhotoLightbox: () => null,
}));

const defaultProps = {
  role: 'review_personnel',
  onClose: vi.fn(),
  onApprove: vi.fn(),
  onCorrect: vi.fn(),
  onReject: vi.fn(),
};

describe('InspectionModal', () => {
  it('renders the AI category label', () => {
    // userCategory is set to 'waste' so "Yol Hasarı" (road_damage) appears only once.
    const report = makeReport({ category: 'road_damage', categoryLabel: 'Yol Hasarı', userCategory: 'waste' });
    render(<InspectionModal report={report} {...defaultProps} />);
    expect(screen.getByText('Yol Hasarı')).toBeInTheDocument();
  });

  it('shows action buttons for review_personnel role', () => {
    render(<InspectionModal report={makeReport()} {...defaultProps} role="review_personnel" />);
    expect(screen.getByRole('button', { name: /✓ Onayla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Düzelt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reddet/i })).toBeInTheDocument();
  });

  it('shows action buttons for admin role', () => {
    render(<InspectionModal report={makeReport()} {...defaultProps} role="admin" />);
    expect(screen.getByRole('button', { name: /✓ Onayla/i })).toBeInTheDocument();
  });

  it('clicking "✓ Onayla" opens the confirmation screen', async () => {
    render(<InspectionModal report={makeReport()} {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /✓ Onayla/i }));
    expect(screen.getByText('Raporu Onayla')).toBeInTheDocument();
  });

  it('"← Geri Dön" on the confirm screen returns to the main view', async () => {
    render(<InspectionModal report={makeReport()} {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /✓ Onayla/i }));
    await userEvent.click(screen.getByRole('button', { name: '← Geri Dön' }));
    expect(screen.getByRole('button', { name: /Reddet/i })).toBeInTheDocument();
  });

  it('calls onApprove with the report id when confirmed on the approval screen', async () => {
    const onApprove = vi.fn();
    const onClose = vi.fn();
    render(
      <InspectionModal
        report={makeReport({ id: 'report-id-1' })}
        {...defaultProps}
        onApprove={onApprove}
        onClose={onClose}
      />,
    );
    // First click opens the confirm screen, second click confirms.
    await userEvent.click(screen.getByRole('button', { name: /✓ Onayla/i }));
    await userEvent.click(screen.getByRole('button', { name: /✓ Onayla/i }));
    expect(onApprove).toHaveBeenCalledWith('report-id-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onCorrect with the report and closes the modal when "Düzelt" is clicked', async () => {
    const onCorrect = vi.fn();
    const onClose = vi.fn();
    const report = makeReport();
    render(<InspectionModal report={report} {...defaultProps} onCorrect={onCorrect} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /Düzelt/i }));
    expect(onCorrect).toHaveBeenCalledWith(report);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onReject with the report and closes the modal when "Reddet" is clicked', async () => {
    const onReject = vi.fn();
    const onClose = vi.fn();
    const report = makeReport();
    render(<InspectionModal report={report} {...defaultProps} onReject={onReject} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /Reddet/i }));
    expect(onReject).toHaveBeenCalledWith(report);
    expect(onClose).toHaveBeenCalled();
  });
});
