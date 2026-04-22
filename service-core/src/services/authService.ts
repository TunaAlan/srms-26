import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';
import User from '../models/User.js';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const generateToken = (user: User): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

export const register = async ({ name, email, password }: RegisterInput) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const err = Object.assign(new Error('Bu e-posta adresi zaten kayıtlı'), { statusCode: 409 });
    throw err;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'user',
  });
  const token = generateToken(user);
  return { user: user.toSafeJSON(), token };
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

  const token = generateToken(user);
  return { user: user.toSafeJSON(), token };
};

export const getProfile = async (userId: string) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
    throw err;
  }
  return user.toSafeJSON();
};
