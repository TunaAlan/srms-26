// =============================================================================
// helpers.ts
// Shared test factory for Report objects.
// Provides a fully typed base fixture so individual tests only override the
// fields relevant to the scenario under test.
// =============================================================================

import type { Report } from '../types';

export function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'report-id-1',
    reportNumber: 42,
    image: null,
    description: 'Kaldırımda büyük bir çukur mevcut.',
    userDescription: 'Çukur var',
    category: 'road_damage',
    categoryLabel: 'Yol Hasarı',
    userCategory: 'road_damage',
    latitude: 39.9,
    longitude: 32.8,
    address: 'Atatürk Cad. No:1',
    timestamp: new Date('2026-05-23T10:00:00.000Z').getTime(),
    status: 'in_review',
    criticality: 'orta',
    resolution: '',
    reviewStatus: null,
    rejectReason: null,
    reviewedByName: null,
    reviewedByRole: null,
    aiConfidence: 0.75,
    aiUnit: 'Fen İşleri',
    aiError: false,
    staffNoteBy: null,
    staffNoteAuthorName: null,
    staffNoteAuthorRole: null,
    ...overrides,
  };
}
