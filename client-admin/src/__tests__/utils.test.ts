// =============================================================================
// utils.test.ts
// Unit tests for all pure helper functions exported from utils.ts.
// No network calls, no DOM — every function here is a deterministic transform
// from input to output. Date.now() is the only external dependency; it is
// frozen via vi.setSystemTime so results never depend on wall-clock time.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTimeAgo,
  getStatusLabel,
  getCriticalityLabel,
  getCategoryLabel,
  CATEGORY_LABEL_MAP,
  mapReport,
  getConfidenceColor,
  getConfidenceLabel,
  getReviewStatusLabel,
  getRoleLabel,
} from '../utils';

// =============================================================================
// getTimeAgo
// Converts a Unix-ms timestamp to a Turkish relative-time string.
// The function computes elapsed seconds from Date.now(), so we freeze time to
// get reproducible assertions.
// =============================================================================
describe('getTimeAgo', () => {
  const FROZEN_NOW = new Date('2026-05-23T12:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Az önce" when the timestamp is the current moment', () => {
    expect(getTimeAgo(FROZEN_NOW)).toBe('Az önce');
  });

  it('returns "Az önce" for any elapsed time under 60 seconds', () => {
    expect(getTimeAgo(FROZEN_NOW - 59_000)).toBe('Az önce');
  });

  it('returns minutes for elapsed time between 1 and 59 minutes', () => {
    expect(getTimeAgo(FROZEN_NOW - 1 * 60_000)).toBe('1 dk önce');
    expect(getTimeAgo(FROZEN_NOW - 45 * 60_000)).toBe('45 dk önce');
    // 59 minutes is still within the minute bucket — not yet "1 saat önce"
    expect(getTimeAgo(FROZEN_NOW - 59 * 60_000)).toBe('59 dk önce');
  });

  it('returns hours for elapsed time between 1 and 23 hours', () => {
    expect(getTimeAgo(FROZEN_NOW - 1 * 3_600_000)).toBe('1 saat önce');
    expect(getTimeAgo(FROZEN_NOW - 23 * 3_600_000)).toBe('23 saat önce');
  });

  it('returns days for elapsed time of 24 hours or more', () => {
    // Exactly 24 hours crosses into the day bucket
    expect(getTimeAgo(FROZEN_NOW - 24 * 3_600_000)).toBe('1 gün önce');
    expect(getTimeAgo(FROZEN_NOW - 7 * 24 * 3_600_000)).toBe('7 gün önce');
  });
});

// =============================================================================
// getStatusLabel
// Maps internal English status keys to Turkish display strings.
// An unrecognised key should pass through unchanged so the UI never shows
// a silent blank — the caller can then decide how to handle it.
// =============================================================================
describe('getStatusLabel', () => {
  it('maps every known status key to its Turkish label', () => {
    expect(getStatusLabel('pending')).toBe('Beklemede');
    expect(getStatusLabel('in_review')).toBe('İncelemede');
    expect(getStatusLabel('in_progress')).toBe('İşlemde');
    expect(getStatusLabel('resolved')).toBe('Çözüldü');
    expect(getStatusLabel('rejected')).toBe('Reddedildi');
  });

  it('returns the raw string for any unrecognised status key', () => {
    // Unknown values pass through so the UI has something to display and the
    // developer can see the actual value rather than an empty string.
    expect(getStatusLabel('unknown_status')).toBe('unknown_status');
    expect(getStatusLabel('')).toBe('');
  });
});

// =============================================================================
// getCriticalityLabel
// Maps internal criticality keys to Turkish display strings.
// =============================================================================
describe('getCriticalityLabel', () => {
  it('maps every known criticality key to its Turkish label', () => {
    expect(getCriticalityLabel('kritik')).toBe('Kritik');
    expect(getCriticalityLabel('yuksek')).toBe('Yüksek');
    expect(getCriticalityLabel('orta')).toBe('Orta');
    expect(getCriticalityLabel('dusuk')).toBe('Düşük');
    expect(getCriticalityLabel('belirsiz')).toBe('—');
  });

  it('returns the raw string for any unrecognised criticality key', () => {
    expect(getCriticalityLabel('high')).toBe('high');
  });
});

// =============================================================================
// getCategoryLabel
// Looks up a human-readable Turkish label from CATEGORY_LABEL_MAP.
// Unknown keys fall back to the raw ID so category values are never lost.
// =============================================================================
describe('getCategoryLabel', () => {
  it('returns the Turkish label for every key present in CATEGORY_LABEL_MAP', () => {
    // Spot-check a representative subset rather than duplicating the entire map.
    expect(getCategoryLabel('road_damage')).toBe('Yol Hasarı');
    expect(getCategoryLabel('waste')).toBe('Çöp / Atık');
    expect(getCategoryLabel('stray_animal')).toBe('Başıboş Hayvan');
    expect(getCategoryLabel('natural_disaster')).toBe('Doğal Afet');
    expect(getCategoryLabel('irrelevant')).toBe('İlgisiz');
  });

  it('returns the raw key for an unrecognised category ID', () => {
    expect(getCategoryLabel('graffiti')).toBe('graffiti');
  });
});

// =============================================================================
// CATEGORY_LABEL_MAP
// The map is used by both getCategoryLabel and mapReport. We verify that it
// covers the full set of categories the AI service can return so that new AI
// categories added without updating the map are immediately visible in tests.
// =============================================================================
describe('CATEGORY_LABEL_MAP', () => {
  const EXPECTED_KEYS = [
    'road_damage', 'sidewalk_damage', 'waste', 'pollution', 'green_space',
    'lighting', 'traffic_sign', 'sewage_water', 'infrastructure', 'vandalism',
    'stray_animal', 'natural_disaster', 'normal', 'irrelevant',
  ];

  it('contains an entry for every expected AI category key', () => {
    EXPECTED_KEYS.forEach((key) => {
      expect(CATEGORY_LABEL_MAP).toHaveProperty(key);
      // Each label must be a non-empty string — an empty label would render
      // as a blank cell in the reports table.
      expect(CATEGORY_LABEL_MAP[key].length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// mapReport
// Transforms a raw API response object into the shape the UI consumes.
// Most of the complexity lives in the optional-field fallbacks and the
// aiUnit normalisation map, so those branches are exercised explicitly.
// =============================================================================
describe('mapReport', () => {
  // Minimal raw report that satisfies the happy path.
  const baseRaw = {
    id: 'abc-123',
    reportNumber: 42,
    imagePath: '/uploads/foto.jpg',
    aiDescription: 'Yolda büyük bir çukur var.',
    userDescription: 'Çukur var',
    aiCategory: 'road_damage',
    userCategory: 'road_damage',
    latitude: 39.9,
    longitude: 32.8,
    address: 'Atatürk Cad. No:1',
    aiUnit: 'Fen İşleri',
    createdAt: '2026-05-23T10:00:00.000Z',
    status: 'in_review',
    aiPriority: 'critical',
    staffNote: 'Ekip yönlendirildi.',
    staffNoteBy: 'user-id-99',
    staffNoteAuthor: { name: 'Ali Veli', role: 'admin' },
    aiError: false,
    reviewStatus: 'approved',
    rejectReason: null,
    reviewer: { name: 'Zeynep', role: 'review_personnel' },
    aiConfidence: 0.87,
  };

  it('maps all fields correctly for a fully populated report', () => {
    const mapped = mapReport(baseRaw);

    expect(mapped.id).toBe('abc-123');
    expect(mapped.reportNumber).toBe(42);
    // imagePath is converted to an API URL using only the filename portion
    expect(mapped.image).toBe('/api/reports/images/foto.jpg');
    expect(mapped.description).toBe('Yolda büyük bir çukur var.');
    expect(mapped.userDescription).toBe('Çukur var');
    expect(mapped.category).toBe('road_damage');
    expect(mapped.categoryLabel).toBe('Yol Hasarı');
    expect(mapped.latitude).toBe(39.9);
    expect(mapped.longitude).toBe(32.8);
    expect(mapped.address).toBe('Atatürk Cad. No:1');
    expect(mapped.aiUnit).toBe('Fen İşleri');
    expect(mapped.timestamp).toBe(new Date('2026-05-23T10:00:00.000Z').getTime());
    expect(mapped.status).toBe('in_review');
    expect(mapped.criticality).toBe('kritik'); // 'critical' → 'kritik'
    expect(mapped.resolution).toBe('Ekip yönlendirildi.');
    expect(mapped.staffNoteBy).toBe('user-id-99');
    expect(mapped.staffNoteAuthorName).toBe('Ali Veli');
    expect(mapped.staffNoteAuthorRole).toBe('admin');
    expect(mapped.aiError).toBe(false);
    expect(mapped.reviewStatus).toBe('approved');
    expect(mapped.rejectReason).toBeNull();
    expect(mapped.reviewedByName).toBe('Zeynep');
    expect(mapped.reviewedByRole).toBe('review_personnel');
    expect(mapped.aiConfidence).toBe(0.87);
  });

  it('sets image to null when imagePath is absent', () => {
    const mapped = mapReport({ ...baseRaw, imagePath: null });
    expect(mapped.image).toBeNull();
  });

  it('falls back to rejectReason for description when aiDescription is empty', () => {
    // Reports rejected by AI have no aiDescription but do have a rejectReason.
    const mapped = mapReport({ ...baseRaw, aiDescription: '', rejectReason: 'Alakasız içerik' });
    expect(mapped.description).toBe('Alakasız içerik');
  });

  it('shows "Analiz Bekleniyor" as categoryLabel when aiCategory is missing', () => {
    const mapped = mapReport({ ...baseRaw, aiCategory: '' });
    expect(mapped.categoryLabel).toBe('Analiz Bekleniyor');
  });

  it('normalises legacy aiUnit spelling variants to their canonical Turkish form', () => {
    // The AI service occasionally returns ASCII-only unit names (no diacritics).
    // mapReport must normalise them so filter dropdowns match correctly.
    expect(mapReport({ ...baseRaw, aiUnit: 'Fen Isleri' }).aiUnit).toBe('Fen İşleri');
    expect(mapReport({ ...baseRaw, aiUnit: 'Zabita' }).aiUnit).toBe('Zabıta');
    expect(mapReport({ ...baseRaw, aiUnit: 'Cevre Koruma' }).aiUnit).toBe('Çevre Koruma');
    expect(mapReport({ ...baseRaw, aiUnit: 'Park ve Bahceler' }).aiUnit).toBe('Park ve Bahçeler');
  });

  it('maps aiPriority strings to internal criticality keys', () => {
    expect(mapReport({ ...baseRaw, aiPriority: 'critical' }).criticality).toBe('kritik');
    expect(mapReport({ ...baseRaw, aiPriority: 'high' }).criticality).toBe('yuksek');
    expect(mapReport({ ...baseRaw, aiPriority: 'medium' }).criticality).toBe('orta');
    expect(mapReport({ ...baseRaw, aiPriority: 'low' }).criticality).toBe('dusuk');
    // A missing priority results in 'belirsiz' so the UI renders "—" instead of blank.
    expect(mapReport({ ...baseRaw, aiPriority: undefined }).criticality).toBe('belirsiz');
  });

  it('handles missing optional join fields gracefully', () => {
    // When the reviewer or staffNoteAuthor JOINs are absent the mapped
    // fields should be null, not undefined, to avoid rendering "undefined".
    const mapped = mapReport({
      ...baseRaw,
      staffNoteAuthor: null,
      reviewer: null,
      staffNoteBy: null,
    });
    expect(mapped.staffNoteAuthorName).toBeNull();
    expect(mapped.staffNoteAuthorRole).toBeNull();
    expect(mapped.reviewedByName).toBeNull();
    expect(mapped.reviewedByRole).toBeNull();
    expect(mapped.staffNoteBy).toBeNull();
  });

  it('defaults latitude, longitude, and address to safe values when absent', () => {
    const mapped = mapReport({ ...baseRaw, latitude: null, longitude: null, address: null });
    expect(mapped.latitude).toBe(0);
    expect(mapped.longitude).toBe(0);
    expect(mapped.address).toBe('');
  });
});

// =============================================================================
// getConfidenceColor
// Returns a CSS variable string for colour-coding confidence scores in the UI.
// The thresholds (0.8 for green, 0.6 for amber) align with CONFIDENCE_THRESHOLD
// used in ReviewQueue.tsx.
// =============================================================================
describe('getConfidenceColor', () => {
  it('returns the tertiary text colour when confidence is null', () => {
    // Null means the AI has not yet returned a score — neutral colour avoids
    // misleading the reviewer into thinking the score is low.
    expect(getConfidenceColor(null)).toBe('var(--text-tertiary)');
  });

  it('returns success colour for confidence >= 0.8', () => {
    expect(getConfidenceColor(0.8)).toBe('var(--success)');
    expect(getConfidenceColor(1.0)).toBe('var(--success)');
  });

  it('returns warning colour for confidence between 0.6 and 0.79', () => {
    expect(getConfidenceColor(0.6)).toBe('var(--warning)');
    expect(getConfidenceColor(0.79)).toBe('var(--warning)');
  });

  it('returns danger colour for confidence below 0.6', () => {
    expect(getConfidenceColor(0.59)).toBe('var(--danger)');
    expect(getConfidenceColor(0.0)).toBe('var(--danger)');
  });
});

// =============================================================================
// getConfidenceLabel
// Formats a raw 0–1 confidence float as a percentage string for display.
// =============================================================================
describe('getConfidenceLabel', () => {
  it('returns "—" when confidence is null', () => {
    expect(getConfidenceLabel(null)).toBe('—');
  });

  it('formats a float as a rounded integer percentage', () => {
    expect(getConfidenceLabel(0.87)).toBe('87%');
    expect(getConfidenceLabel(0.6)).toBe('60%');
    expect(getConfidenceLabel(1.0)).toBe('100%');
    expect(getConfidenceLabel(0.0)).toBe('0%');
  });

  it('rounds to the nearest integer without decimal places', () => {
    // 0.876 should round to 88, not 87.6
    expect(getConfidenceLabel(0.876)).toBe('88%');
    expect(getConfidenceLabel(0.874)).toBe('87%');
  });
});

// =============================================================================
// getReviewStatusLabel
// Maps reviewer decision keys to Turkish labels for display in modals and
// the reports list.
// =============================================================================
describe('getReviewStatusLabel', () => {
  it('returns "—" when the review status is null (report not yet reviewed)', () => {
    expect(getReviewStatusLabel(null)).toBe('—');
  });

  it('maps every known review status to its Turkish label', () => {
    expect(getReviewStatusLabel('approved')).toBe('Onaylandı');
    expect(getReviewStatusLabel('corrected')).toBe('Düzeltildi');
    expect(getReviewStatusLabel('rejected')).toBe('Reddedildi');
  });

  it('returns the raw string for an unrecognised review status key', () => {
    expect(getReviewStatusLabel('forwarded')).toBe('forwarded');
  });
});

// =============================================================================
// getRoleLabel
// Maps internal role identifiers to human-readable Turkish strings shown in
// the personnel panel and modal author lines.
// =============================================================================
describe('getRoleLabel', () => {
  it('returns "Admin" for the admin role', () => {
    expect(getRoleLabel('admin')).toBe('Admin');
  });

  it('returns the full Turkish title for review_personnel', () => {
    expect(getRoleLabel('review_personnel')).toBe('İnceleme Personeli');
  });

  it('returns the raw role string for any unrecognised role', () => {
    // Future roles added to the backend will display their raw key rather
    // than silently showing a blank.
    expect(getRoleLabel('super_admin')).toBe('super_admin');
    expect(getRoleLabel('')).toBe('');
  });
});
