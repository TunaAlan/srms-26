import Report from '../models/Report.js';
import { analyzeImage } from './aiService.js';

interface CreateReportInput {
  userId: string;
  imagePath: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

interface ReviewInput {
  status: 'approved' | 'rejected' | 'redirected';
  staffNote?: string;
}

interface ListFilter {
  category?: string;
  priority?: string;
  unit?: string;
  reviewFlag?: boolean;
  status?: string;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const report = await Report.create({
    userId: input.userId,
    imagePath: input.imagePath,
    description: input.description,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  // Run AI analysis in the background — do not block the response
  analyzeImage(input.imagePath)
    .then((ai) => {
      if (ai.rejected) {
        return report.update({ status: 'rejected', staffNote: ai.rejectReason });
      }
      return report.update({
        aiCategory: ai.category,
        aiPriority: String(ai.priority),
        aiUnit: ai.department,
        aiConfidence: ai.confidence,
        aiDescription: ai.description,
        reviewFlag: ai.needsReview,
      });
    })
    .catch((err) => {
      console.error('AI analysis error:', err);
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
  if (filter.reviewFlag !== undefined) where.reviewFlag = filter.reviewFlag;

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
  await report.update({
    status: input.status,
    staffNote: input.staffNote,
  });
  return report;
}

export async function deleteReport(id: string): Promise<void> {
  const report = await getReportById(id);
  await report.destroy();
}
