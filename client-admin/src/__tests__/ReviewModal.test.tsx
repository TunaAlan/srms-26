// =============================================================================
// ReviewModal.test.tsx
// Verifies the AI correction form: category/priority selection, automatic unit
// derivation, and the two-step confirm flow.
// PhotoLightbox is mocked because it renders an <img> tag that would cause
// network errors in jsdom.
// =============================================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ReviewModal } from '../components/ReviewModal';
import { makeReport } from './helpers';

vi.mock('../components/PhotoLightbox', () => ({
  PhotoLightbox: () => null,
}));

describe('ReviewModal', () => {
  const report = makeReport({
    id: 'report-id-1',
    category: 'road_damage',
    criticality: 'orta',
    aiConfidence: 0.72,
  });

  it('pre-selects the category from the report', () => {
    render(<ReviewModal report={report} onClose={vi.fn()} onSave={vi.fn()} />);
    const select = screen.getByDisplayValue('Yol Hasarı');
    expect(select).toBeInTheDocument();
  });

  it('derives the responsible unit automatically from the selected category', () => {
    render(<ReviewModal report={report} onClose={vi.fn()} onSave={vi.fn()} />);
    // road_damage → Fen İşleri (from CATEGORY_TO_UNIT map inside the component)
    expect(screen.getByText(/Fen İşleri/i)).toBeInTheDocument();
  });

  it('updates the unit when the category is changed', async () => {
    render(<ReviewModal report={report} onClose={vi.fn()} onSave={vi.fn()} />);
    const categorySelect = screen.getByDisplayValue('Yol Hasarı');
    await userEvent.selectOptions(categorySelect, 'waste');
    // waste → Temizlik İşleri
    expect(screen.getByText(/Temizlik İşleri/i)).toBeInTheDocument();
  });

  it('shows the confirmation screen when "Düzeltmeyi Kaydet" is clicked', async () => {
    render(<ReviewModal report={report} onClose={vi.fn()} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Düzeltmeyi Kaydet' }));
    expect(screen.getByText('Düzeltmeyi Kaydet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '✏️ Düzeltmeyi Onayla' })).toBeInTheDocument();
  });

  it('returns to the form when "← Geri Dön" is clicked on the confirm screen', async () => {
    render(<ReviewModal report={report} onClose={vi.fn()} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Düzeltmeyi Kaydet' }));
    await userEvent.click(screen.getByRole('button', { name: '← Geri Dön' }));
    // The form select should be visible again
    expect(screen.getByDisplayValue('Yol Hasarı')).toBeInTheDocument();
  });

  it('calls onSave with correct arguments when the correction is confirmed', async () => {
    const onSave = vi.fn();
    render(<ReviewModal report={report} onClose={vi.fn()} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Düzeltmeyi Kaydet' }));
    await userEvent.click(screen.getByRole('button', { name: '✏️ Düzeltmeyi Onayla' }));
    expect(onSave).toHaveBeenCalledWith(
      'report-id-1',
      'road_damage',
      expect.any(String), // priority
      'Fen İşleri',
      undefined,          // note is empty → undefined
    );
  });
});
