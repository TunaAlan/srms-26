import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import sequelize from '../config/database.js';

class Report extends Model<
  InferAttributes<Report>,
  InferCreationAttributes<Report>
> {
  declare id: CreationOptional<string>;
  declare userId: string;

  // Submitted by user
  declare imagePath: string;
  declare userDescription: CreationOptional<string>;
  declare userCategory: CreationOptional<string>;
  declare latitude: CreationOptional<number>;
  declare longitude: CreationOptional<number>;

  // Returned by AI
  declare aiCategory: CreationOptional<string>;
  declare aiPriority: CreationOptional<string>;
  declare aiPriorityLabel: CreationOptional<string>;
  declare aiUnit: CreationOptional<string>;
  declare aiConfidence: CreationOptional<number>;
  declare aiDescription: CreationOptional<string>;

  // Workflow
  declare status: CreationOptional<'pending' | 'in_review' | 'in_progress' | 'resolved' | 'rejected'>;
  declare reviewStatus: CreationOptional<'approved' | 'corrected' | 'rejected'>;
  declare rejectReason: CreationOptional<string | null>;
  declare staffNote: CreationOptional<string>;
  declare aiError: CreationOptional<boolean>;
  declare reviewedBy: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Report.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    userCategory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    aiCategory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aiPriority: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aiPriorityLabel: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aiUnit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aiConfidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    aiDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_review', 'in_progress', 'resolved', 'rejected'),
      defaultValue: 'pending',
    },
    reviewStatus: {
      type: DataTypes.ENUM('approved', 'corrected', 'rejected'),
      allowNull: true,
    },
    rejectReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    staffNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    aiError: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Report',
  }
);

export default Report;
