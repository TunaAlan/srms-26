import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/reportService.js';


//USER (MOBILE)
export const createReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Image is required' });
      return;
    }

    const { userDescription, userCategory, latitude, longitude } = req.body;

    let parsedLat: number | undefined;
    let parsedLng: number | undefined;

    if (latitude !== undefined) {
      parsedLat = parseFloat(latitude);
      if (isNaN(parsedLat)) {
        res.status(400).json({ message: 'Invalid latitude value' });
        return;
      }
    }

    if (longitude !== undefined) {
      parsedLng = parseFloat(longitude);
      if (isNaN(parsedLng)) {
        res.status(400).json({ message: 'Invalid longitude value' });
        return;
      }
    }

    const report = await reportService.createReport({
      userId: req.user!.id,
      imagePath: req.file.path,
      userDescription,
      userCategory,
      latitude: parsedLat,
      longitude: parsedLng,
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
    const { category, priority, unit, status, reviewStatus } = req.query;

    const str = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined;

    const reports = await reportService.getAllReports({
      category: str(category),
      priority: str(priority),
      unit: str(unit),
      status: str(status),
      reviewStatus: str(reviewStatus),
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


//ADMIN ONLY
export const deleteReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await reportService.deleteReport(String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};


//REVIEW ROLE ONLY
export const reviewReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { staffNote, reviewStatus, rejectReason, aiCategory, aiPriority, aiUnit } = req.body;

    if (reviewStatus !== undefined && !['approved', 'corrected', 'rejected'].includes(reviewStatus)) {
      res.status(400).json({ message: 'Invalid reviewStatus value' });
      return;
    }

    const report = await reportService.reviewReport(String(req.params.id), {
      staffNote, reviewStatus, rejectReason, aiCategory, aiPriority, aiUnit,
    });
    res.json(report);
  } catch (err) {
    next(err);
  }
};

//EMERGENCY ROLE ONLY
export const forwardReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { forwardStatus, forwardNote } = req.body;

    if (!forwardStatus || !['forwarded', 'acknowledged', 'in_progress', 'completed'].includes(forwardStatus)) {
      res.status(400).json({ message: 'Invalid forwardStatus value' });
      return;
    }

    const report = await reportService.forwardReport(String(req.params.id), {
      forwardStatus, forwardNote,
    });
    res.json(report);
  } catch (err) {
    next(err);
  }
};
