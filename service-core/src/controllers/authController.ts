import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import { addToBlacklist } from '../services/tokenBlacklist.js';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const logout = (req: Request, res: Response): void => {
  const token = req.headers.authorization!.split(' ')[1];
  addToBlacklist(token);
  res.json({ message: 'Çıkış başarılı' });
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.getProfile(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
};
