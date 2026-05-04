import sequelize from '../config/database.js';
import User from './User.js';
import Report from './Report.js';

Report.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });
Report.belongsTo(User, { foreignKey: 'staffNoteBy', as: 'staffNoteAuthor' });

const db = {
  sequelize,
  User,
  Report,
};

export default db;
