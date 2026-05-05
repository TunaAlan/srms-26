import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '../config/env.js';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const generateAccessToken = (user: User): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

const getRefreshExpiryDate = (): Date => {
  const unit = JWT_REFRESH_EXPIRES_IN.slice(-1);
  const value = parseInt(JWT_REFRESH_EXPIRES_IN.slice(0, -1), 10);
  const units: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + value * (units[unit] ?? 86400000));
};

export const register = async ({ name, email, password }: RegisterInput) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const err = Object.assign(new Error('Bu e-posta adresi zaten kayıtlı'), { statusCode: 409 });
    throw err;
  }

  const user = await User.create({ name, email, password, role: 'user' });
  const accessToken = generateAccessToken(user);
  const refreshTokenValue = generateRefreshToken();

  await RefreshToken.create({
    userId: user.id,
    token: refreshTokenValue,
    expiresAt: getRefreshExpiryDate(),
  });

  return { user: user.toSafeJSON(), accessToken, refreshToken: refreshTokenValue };
};

export const login = async ({ email, password }: LoginInput) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    const err = Object.assign(new Error('E-posta veya şifre hatalı'), { statusCode: 401 });
    throw err;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = Object.assign(new Error('E-posta veya şifre hatalı'), { statusCode: 401 });
    throw err;
  }

  if (!user.isActive) {
    const err = Object.assign(new Error('Hesabınız askıya alınmıştır. Yöneticinizle iletişime geçin.'), { statusCode: 403 });
    throw err;
  }

  const accessToken = generateAccessToken(user);
  const refreshTokenValue = generateRefreshToken();

  await RefreshToken.create({
    userId: user.id,
    token: refreshTokenValue,
    expiresAt: getRefreshExpiryDate(),
  });

  return { user: user.toSafeJSON(), accessToken, refreshToken: refreshTokenValue };
};

export const refresh = async (token: string) => {
  const record = await RefreshToken.findOne({ where: { token } });

  if (!record || record.revoked || record.expiresAt < new Date()) {
    const err = Object.assign(new Error('Geçersiz veya süresi dolmuş refresh token'), { statusCode: 401 });
    throw err;
  }

  const user = await User.findByPk(record.userId);
  if (!user || !user.isActive) {
    await record.update({ revoked: true });
    const err = Object.assign(new Error('Hesabınız askıya alınmıştır. Yöneticinizle iletişime geçin.'), { statusCode: 403 });
    throw err;
  }

  // Rotation: eski token iptal edilir, yeni token verilir
  await record.update({ revoked: true });

  const newRefreshTokenValue = generateRefreshToken();
  await RefreshToken.create({
    userId: user.id,
    token: newRefreshTokenValue,
    expiresAt: getRefreshExpiryDate(),
  });

  const accessToken = generateAccessToken(user);
  return { accessToken, refreshToken: newRefreshTokenValue };
};

export const logout = async (token: string) => {
  await RefreshToken.update({ revoked: true }, { where: { token } });
};

export const getProfile = async (userId: string) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
    throw err;
  }
  return user.toSafeJSON();
};
