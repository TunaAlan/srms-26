import sequelize from '../config/database.js';
import User from './User.js';
import Report from './Report.js';
import RefreshToken from './RefreshToken.js';

Report.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });
Report.belongsTo(User, { foreignKey: 'staffNoteBy', as: 'staffNoteAuthor' });

RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });

const db = {
  sequelize,
  User,
  Report,
  RefreshToken,
};

export default db;
