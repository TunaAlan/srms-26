import sequelize from '../config/database.js';
import User from './User.js';

const db = {
  sequelize,
  User,
};

export default db;
