import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService.js';

export const listStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await userService.listStaff());
  } catch (err) { next(err); }
};

export const createStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;
    if (role !== 'review_personnel') {
      res.status(400).json({ message: 'Sadece inceleme personeli oluşturulabilir' });
      return;
    }
    const user = await userService.createStaff({ name, email, password, role });
    res.status(201).json(user);
  } catch (err) { next(err); }
};

export const setActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ message: 'Kendi hesabınızı askıya alamazsınız' });
      return;
    }
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ message: 'isActive boolean olmalı' });
      return;
    }
    const user = await userService.setActive(String(req.params.id), isActive);
    res.json(user);
  } catch (err) { next(err); }
};

export const deleteStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ message: 'Kendi hesabınızı silemezsiniz' });
      return;
    }
    await userService.deleteStaff(String(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
};
