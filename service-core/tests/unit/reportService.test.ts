import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReportById, changeStatus, createReport, reviewReport, deleteReport, getMyReports, getAllReports, retryAnalysis } from '../../src/services/reportService.js';

vi.mock('../../src/models/Report.js', () => ({
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../src/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
  },
}));

// Mock fs/promises to avoid real file system operations
vi.mock('fs/promises', () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/config/database.js', () => ({
  default: {},
}));

// AI service is mocked — we don't test its internals here
vi.mock('../../src/services/aiService.js', () => ({
  analyzeImage: vi.fn(),
}));

import Report from '../../src/models/Report.js';
import { analyzeImage } from '../../src/services/aiService.js';

const mockReport = (status: string) => ({
  id: 'report-uuid-123',
  status,
  imagePath: '/uploads/test.jpg',
  update: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getReportById ────────────────────────────────────────────────────────────

describe('reportService.getReportById', () => {
  it('returns report if found', async () => {
    const report = mockReport('pending');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    const result = await getReportById('report-uuid-123');

    expect(result).toBe(report);
  });

  it('throws 404 if report is not found', async () => {
    vi.mocked(Report.findByPk).mockResolvedValue(null);

    await expect(getReportById('nonexistent-id'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── createReport ────────────────────────────────────────────────────────────

describe('reportService.createReport', () => {
  it('creates report with incremented reportNumber', async () => {
    vi.mocked(Report.findOne).mockResolvedValue({ maxNum: 5 } as any);
    const report = mockReport('pending');
    vi.mocked(Report.create).mockResolvedValue(report as any);
    report.update.mockResolvedValue(undefined);
    vi.mocked(analyzeImage).mockResolvedValue({
      rejected: false,
      category: 'road_damage',
      priority: 3,
      priorityLabel: 'High',
      department: 'Roads',
      confidence: 0.9,
      description: 'Pothole detected',
    } as any);

    const result = await createReport({ userId: 'user-uuid', imagePath: '/uploads/test.jpg' });

    expect(Report.create).toHaveBeenCalledWith(expect.objectContaining({ reportNumber: 6 }));
    expect(result).toBe(report);
  });

  it('starts reportNumber from 1 if no reports exist', async () => {
    vi.mocked(Report.findOne).mockResolvedValue({ maxNum: null } as any);
    const report = mockReport('pending');
    vi.mocked(Report.create).mockResolvedValue(report as any);
    report.update.mockResolvedValue(undefined);
    vi.mocked(analyzeImage).mockResolvedValue({ rejected: false } as any);

    await createReport({ userId: 'user-uuid', imagePath: '/uploads/test.jpg' });

    expect(Report.create).toHaveBeenCalledWith(expect.objectContaining({ reportNumber: 1 }));
  });

  it('updates report as rejected when AI rejects the image', async () => {
    vi.mocked(Report.findOne).mockResolvedValue({ maxNum: 0 } as any);
    const report = mockReport('pending');
    vi.mocked(Report.create).mockResolvedValue(report as any);
    vi.mocked(analyzeImage).mockResolvedValue({ rejected: true, rejectReason: 'Indoor image' } as any);

    await createReport({ userId: 'user-uuid', imagePath: '/uploads/test.jpg' });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      reviewStatus: 'rejected',
      status: 'rejected',
    }));
  });

  it('sets aiError to true when AI analysis throws', async () => {
    vi.mocked(Report.findOne).mockResolvedValue({ maxNum: 0 } as any);
    const report = mockReport('pending');
    vi.mocked(Report.create).mockResolvedValue(report as any);
    vi.mocked(analyzeImage).mockRejectedValue(new Error('AI service unavailable'));

    await createReport({ userId: 'user-uuid', imagePath: '/uploads/test.jpg' });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({ aiError: true }));
  });

  it('silently swallows error when fallback update also fails', async () => {
    vi.mocked(Report.findOne).mockResolvedValue({ maxNum: 0 } as any);
    const report = mockReport('pending');
    report.update
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('DB down'));
    vi.mocked(Report.create).mockResolvedValue(report as any);
    vi.mocked(analyzeImage).mockRejectedValue(new Error('AI unavailable'));

    await createReport({ userId: 'user-uuid', imagePath: '/uploads/test.jpg' });
    await new Promise(resolve => setTimeout(resolve, 10));

    // fallback update throws — no unhandled rejection should propagate
    expect(report.update).toHaveBeenCalledTimes(2);
  });
});

// ─── reviewReport ────────────────────────────────────────────────────────────

describe('reportService.reviewReport', () => {
  it('sets status to in_progress when reviewStatus is approved', async () => {
    const report = mockReport('in_review');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await reviewReport('report-uuid-123', { reviewStatus: 'approved' });

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      reviewStatus: 'approved',
      status: 'in_progress',
    }));
  });

  it('updates staffNote and staffNoteBy when provided', async () => {
    const report = mockReport('in_review');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await reviewReport('report-uuid-123', { staffNote: 'Checked', staffNoteBy: 'user-uuid' });

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      staffNote: 'Checked',
      staffNoteBy: 'user-uuid',
    }));
  });

  it('sets status to in_progress when reviewStatus is corrected', async () => {
    const report = mockReport('in_review');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await reviewReport('report-uuid-123', { reviewStatus: 'corrected' });

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      reviewStatus: 'corrected',
      status: 'in_progress',
    }));
  });

  it('sets status to rejected when reviewStatus is rejected', async () => {
    const report = mockReport('in_review');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await reviewReport('report-uuid-123', { reviewStatus: 'rejected', rejectReason: 'Not relevant' });

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      reviewStatus: 'rejected',
      status: 'rejected',
    }));
  });

  it('updates aiCategory, aiPriority, aiUnit and reviewedBy when provided', async () => {
    const report = mockReport('in_review');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await reviewReport('report-uuid-123', {
      reviewStatus: 'corrected',
      aiCategory: 'road_damage',
      aiPriority: '3',
      aiUnit: 'Roads',
      reviewedBy: 'reviewer-uuid',
    });

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      aiCategory: 'road_damage',
      aiPriority: '3',
      aiUnit: 'Roads',
      reviewedBy: 'reviewer-uuid',
    }));
  });
});

// ─── deleteReport ────────────────────────────────────────────────────────────

describe('reportService.deleteReport', () => {
  it('destroys report and deletes image file', async () => {
    const report = mockReport('resolved');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await deleteReport('report-uuid-123');

    expect(report.destroy).toHaveBeenCalled();
  });

  it('throws 404 if report is not found', async () => {
    vi.mocked(Report.findByPk).mockResolvedValue(null);

    await expect(deleteReport('nonexistent-id'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── retryAnalysis ────────────────────────────────────────────────────────────

describe('reportService.retryAnalysis', () => {
  it('triggers AI analysis and returns report for pending reports', async () => {
    const report = mockReport('pending');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);
    vi.mocked(analyzeImage).mockResolvedValue({ rejected: false } as any);

    const result = await retryAnalysis('report-uuid-123');

    expect(result).toBe(report);
  });

  it('throws 400 if report status is not pending', async () => {
    vi.mocked(Report.findByPk).mockResolvedValue(mockReport('in_review') as any);

    await expect(retryAnalysis('report-uuid-123'))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── getMyReports ─────────────────────────────────────────────────────────────

describe('reportService.getMyReports', () => {
  it('returns reports for the given user', async () => {
    const reports = [mockReport('pending')];
    vi.mocked(Report.findAll).mockResolvedValue(reports as any);

    const result = await getMyReports('user-uuid');

    expect(Report.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-uuid' } }));
    expect(result).toBe(reports);
  });
});

// ─── getAllReports ────────────────────────────────────────────────────────────

describe('reportService.getAllReports', () => {
  it('returns all reports without filters', async () => {
    const reports = [mockReport('in_review')];
    vi.mocked(Report.findAll).mockResolvedValue(reports as any);

    const result = await getAllReports({});

    expect(result).toBe(reports);
  });

  it('applies category filter when provided', async () => {
    vi.mocked(Report.findAll).mockResolvedValue([] as any);

    await getAllReports({ category: 'road_damage' });

    expect(Report.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ aiCategory: 'road_damage' }),
    }));
  });

  it('applies priority filter when provided', async () => {
    vi.mocked(Report.findAll).mockResolvedValue([] as any);

    await getAllReports({ priority: '3' });

    expect(Report.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ aiPriority: '3' }),
    }));
  });

  it('applies unit filter when provided', async () => {
    vi.mocked(Report.findAll).mockResolvedValue([] as any);

    await getAllReports({ unit: 'Roads' });

    expect(Report.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ aiUnit: 'Roads' }),
    }));
  });

  it('applies reviewStatus filter when provided', async () => {
    vi.mocked(Report.findAll).mockResolvedValue([] as any);

    await getAllReports({ reviewStatus: 'approved' });

    expect(Report.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ reviewStatus: 'approved' }),
    }));
  });

  it('applies status filter when provided without reviewedBy', async () => {
    vi.mocked(Report.findAll).mockResolvedValue([] as any);

    await getAllReports({ status: 'in_progress' });

    expect(Report.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'in_progress' }),
    }));
  });

  it('calls findAll with a where clause when reviewedBy is provided', async () => {
    vi.mocked(Report.findAll).mockResolvedValue([] as any);

    await getAllReports({ reviewedBy: 'user-uuid' });

    const call = vi.mocked(Report.findAll).mock.calls[0][0] as any;
    expect(call.where).toBeDefined();
  });
});

// ─── changeStatus ─────────────────────────────────────────────────────────────

describe('reportService.changeStatus', () => {
  it('allows pending → in_review', async () => {
    const report = mockReport('pending');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await expect(changeStatus('report-uuid-123', 'in_review')).resolves.toBeDefined();
    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_review' }));
  });

  it('allows in_progress → resolved', async () => {
    const report = mockReport('in_progress');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await expect(changeStatus('report-uuid-123', 'resolved')).resolves.toBeDefined();
    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'resolved' }));
  });

  it('resets reviewStatus and rejectReason when transitioning to in_review', async () => {
    const report = mockReport('rejected');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await changeStatus('report-uuid-123', 'in_review');

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'in_review',
      reviewStatus: null,
      rejectReason: null,
    }));
  });

  it('allows in_progress → in_review', async () => {
    const report = mockReport('in_progress');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await expect(changeStatus('report-uuid-123', 'in_review')).resolves.toBeDefined();
    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'in_review',
      reviewStatus: null,
      rejectReason: null,
    }));
  });

  it('throws 400 for invalid transition from pending', async () => {
    vi.mocked(Report.findByPk).mockResolvedValue(mockReport('pending') as any);

    await expect(changeStatus('report-uuid-123', 'resolved'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 for invalid transition from in_review', async () => {
    vi.mocked(Report.findByPk).mockResolvedValue(mockReport('in_review') as any);

    await expect(changeStatus('report-uuid-123', 'resolved'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('attaches staffNote to in_review transition when note provided', async () => {
    const report = mockReport('pending');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await changeStatus('report-uuid-123', 'in_review', 'Re-opening for review', 'user-uuid');

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'in_review',
      staffNote: 'Re-opening for review',
      staffNoteBy: 'user-uuid',
    }));
  });

  it('sets staffNoteBy to null when note is absent on in_review transition', async () => {
    const report = mockReport('pending');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await changeStatus('report-uuid-123', 'in_review');

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      staffNote: null,
      staffNoteBy: null,
    }));
  });

  it('attaches note to resolved transition when note provided', async () => {
    const report = mockReport('in_progress');
    vi.mocked(Report.findByPk).mockResolvedValue(report as any);

    await changeStatus('report-uuid-123', 'resolved', 'Fixed the pothole');

    expect(report.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'resolved',
      staffNote: 'Fixed the pothole',
    }));
  });
});
