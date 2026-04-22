import sequelize from '../config/database.js';
import User from './User.js';
import Report from './Report.js';

const db = {
  sequelize,
  User,
  Report,
};

export default db;
