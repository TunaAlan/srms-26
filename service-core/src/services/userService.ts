import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export async function listStaff() {
  return User.findAll({
    where: { role: ['admin', 'review_personnel'] },
    attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
}

export async function createStaff(input: { name: string; email: string; password: string; role: 'admin' | 'review_personnel' }) {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('Bu e-posta zaten kayıtlı'), { statusCode: 409 });
  }
  const user = await User.create({ ...input, isActive: true });
  return user.toSafeJSON();
}

export async function setActive(id: string, isActive: boolean) {
  const user = await User.findByPk(id);
  if (!user) throw Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
  if (user.role === 'user') throw Object.assign(new Error('Sadece personel yönetilebilir'), { statusCode: 400 });
  await user.update({ isActive });
  return user.toSafeJSON();
}

export async function deleteStaff(id: string) {
  const user = await User.findByPk(id);
  if (!user) throw Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
  if (user.role === 'user') throw Object.assign(new Error('Sadece personel silinebilir'), { statusCode: 400 });
  await user.destroy();
}
