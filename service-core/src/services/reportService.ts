import { unlink } from 'fs/promises';
import { Op, fn, col } from 'sequelize';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { analyzeImage } from './aiService.js';

const REVIEWER_INCLUDE = {
  model: User,
  as: 'reviewer',
  attributes: ['id', 'name', 'role'],
};

const STAFF_NOTE_AUTHOR_INCLUDE = {
  model: User,
  as: 'staffNoteAuthor',
  attributes: ['id', 'name', 'role'],
};

interface CreateReportInput {
  userId: string;
  imagePath: string;
  userDescription?: string;
  userCategory?: string;
  latitude?: number;
  longitude?: number;
}

interface ReviewInput {
  staffNote?: string;
  staffNoteBy?: string;
  reviewStatus?: 'approved' | 'corrected' | 'rejected';
  rejectReason?: string;
  aiCategory?: string;
  aiPriority?: string;
  aiUnit?: string;
  reviewedBy?: string;
}

interface ListFilter {
  category?: string;
  priority?: string;
  unit?: string;
  reviewStatus?: string;
  status?: string;
  reviewedBy?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedReports {
  data: Report[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const maxResult = await Report.findOne({
    attributes: [[fn('MAX', col('reportNumber')), 'maxNum']],
    raw: true,
  }) as any;
  const nextNumber = (maxResult?.maxNum ?? 0) + 1;

  const report = await Report.create({
    userId: input.userId,
    imagePath: input.imagePath,
    userDescription: input.userDescription,
    userCategory: input.userCategory,
    latitude: input.latitude,
    longitude: input.longitude,
    reportNumber: nextNumber,
  });

  // Run AI analysis in the background — do not block the response
  runAiAnalysis(report);

  return report;
}

async function runAiAnalysis(report: Report): Promise<void> {
  await report.update({ aiError: false, status: 'pending' });
  analyzeImage(report.imagePath)
    .then((ai) => {
      if (ai.rejected) {
        return report.update({
          aiCategory: 'irrelevant',
          aiPriority: '0',
          aiPriorityLabel: 'Irrelevant',
          aiUnit: '-',
          aiConfidence: 0,
          aiDescription: '',
          rejectReason: ai.rejectReason,
          reviewStatus: 'rejected',
          status: 'rejected',
          aiError: false,
        });
      }
      return report.update({
        aiCategory: ai.category,
        aiPriority: String(ai.priority),
        aiPriorityLabel: ai.priorityLabel,
        aiUnit: ai.department,
        aiConfidence: ai.confidence,
        aiDescription: ai.description,
        status: 'in_review',
        aiError: false,
      });
    })
    .catch((err) => {
      console.error('AI retry error:', err);
      report.update({ aiError: true, status: 'pending' })
        .catch(e => console.error('Fallback update failed:', e));
    });
}

export async function retryAnalysis(id: string): Promise<Report> {
  const report = await getReportById(id);
  if (report.status !== 'pending') {
    throw Object.assign(new Error('Only pending reports can be retried'), { statusCode: 400 });
  }
  runAiAnalysis(report);
  return report;
}

export async function getMyReports(userId: string): Promise<Report[]> {
  return Report.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}

export async function getAllReports(filter: ListFilter): Promise<PaginatedReports> {
  const where: Record<string, unknown> = {};

  if (filter.category) where.aiCategory = filter.category;
  if (filter.priority) where.aiPriority = filter.priority;
  if (filter.unit) where.aiUnit = filter.unit;
  if (filter.reviewStatus !== undefined) where.reviewStatus = filter.reviewStatus;

  if (filter.reviewedBy) {
    where[Op.or as unknown as string] = [
      { status: filter.status ?? 'in_review' },
      { reviewedBy: filter.reviewedBy },
    ];
  } else if (filter.status) {
    where.status = filter.status;
  }

  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const { count, rows } = await Report.findAndCountAll({
    where,
    include: [REVIEWER_INCLUDE, STAFF_NOTE_AUTHOR_INCLUDE],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset,
    distinct: true,
  });

  return {
    data: rows,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

export async function clearAllReports(): Promise<void> {
  const reports = await Report.findAll({ attributes: ['imagePath'] });
  await Report.destroy({ where: {}, truncate: false });
  await Promise.allSettled(reports.map(r => unlink(r.imagePath)));
}

export async function getReportById(id: string): Promise<Report> {
  const report = await Report.findByPk(id, { include: [REVIEWER_INCLUDE, STAFF_NOTE_AUTHOR_INCLUDE] });
  if (!report) {
    throw Object.assign(new Error('Report not found'), { statusCode: 404 });
  }
  return report;
}

export async function reviewReport(id: string, input: ReviewInput): Promise<Report> {
  const report = await getReportById(id);
  const updates: Record<string, unknown> = {};

  if (input.staffNote !== undefined) {
    updates.staffNote = input.staffNote;
    updates.staffNoteBy = input.staffNoteBy ?? null;
  }
  if (input.reviewStatus !== undefined) updates.reviewStatus = input.reviewStatus;
  if (input.rejectReason !== undefined) updates.rejectReason = input.rejectReason;
  if (input.aiCategory !== undefined) updates.aiCategory = input.aiCategory;
  if (input.aiPriority !== undefined) updates.aiPriority = input.aiPriority;
  if (input.aiUnit !== undefined) updates.aiUnit = input.aiUnit;
  if (input.reviewedBy !== undefined) updates.reviewedBy = input.reviewedBy;

  const rs = input.reviewStatus;
  if (rs === 'rejected') updates.status = 'rejected';
  else if (rs === 'approved' || rs === 'corrected') updates.status = 'in_progress';

  if (rs === 'approved' || rs === 'corrected' || rs === 'rejected') {
    if (input.staffNote === undefined) updates.staffNote = null;
  }

  await report.update(updates);
  return report;
}



export async function changeStatus(id: string, status: 'in_review' | 'in_progress' | 'resolved', note?: string, userId?: string): Promise<Report> {
  const report = await getReportById(id);
  const allowed: Record<string, string[]> = {
    pending:     ['in_review'],
    in_review:   ['in_progress'],
    in_progress: ['resolved', 'in_review'],
    rejected:    ['in_review'],
  };
  if (!allowed[report.status]?.includes(status)) {
    throw Object.assign(
      new Error(`Cannot transition from '${report.status}' to '${status}'`),
      { statusCode: 400 }
    );
  }
  const updates: Record<string, unknown> = { status };
  if (status === 'in_review') {
    updates.reviewStatus = null;
    updates.rejectReason = null;
    updates.staffNote = note ?? null;
    updates.staffNoteBy = note ? (userId ?? null) : null;
  }
  if (status !== 'in_review' && note !== undefined) updates.staffNote = note;
  await report.update(updates);
  return report;
}

export async function deleteReport(id: string): Promise<void> {
  const report = await getReportById(id);
  const imagePath = report.imagePath;
  await report.destroy();
  await unlink(imagePath).catch(() => {});
}
