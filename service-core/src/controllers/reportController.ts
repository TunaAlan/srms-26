import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/reportService.js';


//USER (MOBILE)
export const createReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image is required' });
      return;
    }

    const { description, latitude, longitude } = req.body;

    const report = await reportService.createReport({
      userId: req.user!.id,
      imagePath: req.file.path,
      description,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
    });

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
};


//USER (MOBILE)
export const getMyReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reports = await reportService.getMyReports(req.user!.id);
    const sanitized = reports.map(r => {
      const data = r.toJSON() as Record<string, unknown>;
      delete data.staffNote;
      return data;
    });
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
};


//ADMIN (DESKTOP) + DEPARTMENT (EMPLOYEE)
export const getAllReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, priority, unit, status, reviewFlag } = req.query;

    const str = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined;

    const reports = await reportService.getAllReports({
      category: str(category),
      priority: str(priority),
      unit: str(unit),
      status: str(status),
      reviewFlag: reviewFlag === 'true' ? true : reviewFlag === 'false' ? false : undefined,
    });

    res.json(reports);
  } catch (err) {
    next(err);
  }
};


//ALL ROLES (regular users can only view their own reports)
export const getReportById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const report = await reportService.getReportById(String(req.params.id));
    if (req.user!.role === 'user' && report.userId !== req.user!.id) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
};


//ADMIN (DESKTOP) + DEPARTMENT (EMPLOYEE)
export const reviewReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, staffNote } = req.body;

    if (!['approved', 'rejected', 'redirected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }

    const report = await reportService.reviewReport(String(req.params.id), { status, staffNote });
    res.json(report);
  } catch (err) {
    next(err);
  }
};
