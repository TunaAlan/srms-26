import { unlink } from 'fs/promises';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { analyzeImage } from './aiService.js';

const REVIEWER_INCLUDE = {
  model: User,
  as: 'reviewer',
  attributes: ['id', 'name'],
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
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const report = await Report.create({
    userId: input.userId,
    imagePath: input.imagePath,
    userDescription: input.userDescription,
    userCategory: input.userCategory,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  // Run AI analysis in the background — do not block the response
  analyzeImage(input.imagePath)
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
      });
    })
    .catch((err) => {
      console.error('AI analysis error:', err);
      report.update({
        aiCategory: '',
        aiPriority: '',
        aiPriorityLabel: '',
        aiUnit: '',
        aiConfidence: 0,
        aiDescription: '',
        status: 'pending',
      }).catch(e => console.error('Fallback update failed:', e));
    });

  return report;
}

export async function getMyReports(userId: string): Promise<Report[]> {
  return Report.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}

export async function getAllReports(filter: ListFilter): Promise<Report[]> {
  const where: Record<string, unknown> = {};

  if (filter.category) where.aiCategory = filter.category;
  if (filter.priority) where.aiPriority = filter.priority;
  if (filter.unit) where.aiUnit = filter.unit;
  if (filter.status) where.status = filter.status;
  if (filter.reviewStatus !== undefined) where.reviewStatus = filter.reviewStatus;

  return Report.findAll({
    where,
    include: [REVIEWER_INCLUDE],
    order: [['createdAt', 'DESC']],
  });
}

export async function getReportById(id: string): Promise<Report> {
  const report = await Report.findByPk(id, { include: [REVIEWER_INCLUDE] });
  if (!report) {
    throw Object.assign(new Error('Report not found'), { statusCode: 404 });
  }
  return report;
}

export async function reviewReport(id: string, input: ReviewInput): Promise<Report> {
  const report = await getReportById(id);
  const updates: Record<string, unknown> = {};

  if (input.staffNote !== undefined) updates.staffNote = input.staffNote;
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



export async function changeStatus(id: string, status: 'in_review' | 'in_progress' | 'resolved', note?: string): Promise<Report> {
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
  }
  if (note !== undefined) updates.staffNote = note;
  await report.update(updates);
  return report;
}

export async function deleteReport(id: string): Promise<void> {
  const report = await getReportById(id);
  const imagePath = report.imagePath;
  await report.destroy();
  await unlink(imagePath).catch(() => {});
}
