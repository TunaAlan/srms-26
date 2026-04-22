import Report from '../models/Report.js';
import { analyzeImage } from './aiService.js';

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
}

interface ForwardInput {
  forwardStatus: 'forwarded' | 'completed';
  forwardNote?: string;
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
      return report.update({
        aiCategory: ai.category,
        aiPriority: String(ai.priority),
        aiPriorityLabel: ai.priorityLabel,
        aiUnit: ai.department,
        aiConfidence: ai.confidence,
        aiDescription: ai.description,
        reviewStatus: 'pending',
      });
    })
    .catch((err) => {
      console.error('AI analysis error:', err);
      // Set a fallback state to prevent the report from remaining in an invisible zombie state if the AI analysis fails
      report.update({
        aiCategory: 'unclassified',
        aiPriority: '0',
        aiPriorityLabel: 'Service Error',
        aiUnit: '-',
        aiConfidence: 0,
        aiDescription: 'Error occurred during AI analysis.',
        reviewStatus: 'pending',
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
    order: [['createdAt', 'DESC']],
  });
}

export async function getReportById(id: string): Promise<Report> {
  const report = await Report.findByPk(id);
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

  const rs = input.reviewStatus;
  if (rs === 'rejected') updates.status = 'rejected';
  else if (rs === 'approved' || rs === 'corrected') updates.status = 'in_progress';
  else if (rs === 'pending') updates.status = 'pending';

  await report.update(updates);
  return report;
}

export async function forwardReport(id: string, input: ForwardInput): Promise<Report> {
  const report = await getReportById(id);
  const updates: Record<string, unknown> = {
    forwardStatus: input.forwardStatus,
  };

  if (input.forwardNote !== undefined) updates.forwardNote = input.forwardNote;

  updates.status = input.forwardStatus === 'completed' ? 'resolved' : 'in_progress';

  await report.update(updates);
  return report;
}

export async function deleteReport(id: string): Promise<void> {
  const report = await getReportById(id);
  await report.destroy();
}
