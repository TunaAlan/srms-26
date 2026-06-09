// =============================================================================
// Dashboard.test.tsx
// Verifies role-based rendering and KPI count correctness.
//
// Note: Status labels like "Beklemede" appear in both the stat cards AND in
// the "SON 5 RAPOR" table badges, so we use container.querySelectorAll to
// count stat cards, and parentElement traversal to read counts from specific
// cards without ambiguity.
// =============================================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from '../components/Dashboard';
import { makeReport } from './helpers';
import type { Report } from '../types';

function makeReports(): Report[] {
  return [
    makeReport({ id: '1', status: 'pending',     criticality: 'kritik' }),
    makeReport({ id: '2', status: 'in_review',   criticality: 'kritik', reviewStatus: null }),
    makeReport({ id: '3', status: 'in_progress', criticality: 'orta' }),
    makeReport({ id: '4', status: 'resolved',    criticality: 'dusuk', reviewStatus: 'approved' }),
    makeReport({ id: '5', status: 'rejected',    criticality: 'dusuk', reviewStatus: 'rejected' }),
    makeReport({ id: '6', status: 'in_review',   criticality: 'yuksek', reviewStatus: 'corrected',
                 aiConfidence: 0.45 }),
  ];
}

describe('Dashboard — admin role', () => {
  const reports = makeReports();

  it('renders exactly 7 stat cards', () => {
    const { container } = render(
      <Dashboard reports={reports} role="admin" onViewReport={vi.fn()} />,
    );
    // Count .stat-card elements directly — avoids ambiguity with table badges.
    expect(container.querySelectorAll('.stat-card')).toHaveLength(7);
  });

  it('shows the correct total report count (6)', () => {
    render(<Dashboard reports={reports} role="admin" onViewReport={vi.fn()} />);
    // "Toplam" label is unique — find its stat-card and read the number.
    const totalCard = screen.getByText('Toplam').closest('.stat-card');
    expect(totalCard).toHaveTextContent('6');
  });

  it('shows the correct "İncelemede" count (2)', () => {
    const { container } = render(
      <Dashboard reports={reports} role="admin" onViewReport={vi.fn()} />,
    );
    // "İncelemede" label appears in both the stat card and the table badge.
    // We target the stat-label span specifically and navigate to its card.
    const statLabels = container.querySelectorAll('.stat-label');
    const inReviewLabel = Array.from(statLabels).find((el) => el.textContent === 'İncelemede');
    expect(inReviewLabel?.closest('.stat-card')).toHaveTextContent('2');
  });

  it('shows critical count excluding resolved and rejected reports (2)', () => {
    render(<Dashboard reports={reports} role="admin" onViewReport={vi.fn()} />);
    // Only pending (kritik) + in_review (kritik) count — resolved/rejected are excluded.
    const critCard = screen.getByText('Kritik Öncelikli').closest('.stat-card');
    expect(critCard).toHaveTextContent('2');
  });

  it('renders the "SON 5 RAPOR" table heading', () => {
    render(<Dashboard reports={reports} role="admin" onViewReport={vi.fn()} />);
    expect(screen.getByText('SON 5 RAPOR')).toBeInTheDocument();
  });

  it('calls onTabChange("review") when the review queue shortcut card is clicked', async () => {
    const onTabChange = vi.fn();
    render(
      <Dashboard reports={reports} role="admin" onViewReport={vi.fn()} onTabChange={onTabChange} />,
    );
    await userEvent.click(screen.getByText('İNCELEME KUYRUĞU').closest('div')!);
    expect(onTabChange).toHaveBeenCalledWith('review');
  });
});

describe('Dashboard — review_personnel role', () => {
  const reports = makeReports();

  it('renders the hero banner with the correct pending count', () => {
    render(<Dashboard reports={reports} role="review_personnel" onViewReport={vi.fn()} />);
    // 2 in_review reports
    expect(screen.getByText(/2 raporunuz var/i)).toBeInTheDocument();
  });

  it('renders 4 KPI cards specific to the reviewer role', () => {
    render(<Dashboard reports={reports} role="review_personnel" onViewReport={vi.fn()} />);
    expect(screen.getByText('İnceleme Bekliyor')).toBeInTheDocument();
    expect(screen.getByText('Onayladıklarım')).toBeInTheDocument();
    expect(screen.getByText('Düzelttiklerim')).toBeInTheDocument();
    expect(screen.getByText('Reddettiklerim')).toBeInTheDocument();
  });

  it('does NOT render the admin-only "Toplam" KPI card', () => {
    render(<Dashboard reports={reports} role="review_personnel" onViewReport={vi.fn()} />);
    expect(screen.queryByText('Toplam')).not.toBeInTheDocument();
  });

  it('calls onTabChange("review") when "İncelemeye Başla" is clicked', async () => {
    const onTabChange = vi.fn();
    render(
      <Dashboard reports={reports} role="review_personnel" onViewReport={vi.fn()} onTabChange={onTabChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /İncelemeye Başla/i }));
    expect(onTabChange).toHaveBeenCalledWith('review');
  });

  it('shows the correct low-confidence pending count (1)', () => {
    render(<Dashboard reports={reports} role="review_personnel" onViewReport={vi.fn()} />);
    // The label "DÜŞÜK GÜVEN SKORLU" is in a div; its parentElement contains the count.
    const labelEl = screen.getByText('DÜŞÜK GÜVEN SKORLU');
    // parentElement is the inner <div> that wraps: label + count + subtext
    expect(labelEl.parentElement).toHaveTextContent('1');
  });
});
