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
  declare description: CreationOptional<string>;
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
  declare status: CreationOptional<'pending' | 'approved' | 'rejected' | 'redirected'>;
  declare reviewFlag: CreationOptional<boolean>;
  declare staffNote: CreationOptional<string>;

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
    description: {
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
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'redirected'),
      defaultValue: 'pending',
    },
    reviewFlag: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    staffNote: {
      type: DataTypes.TEXT,
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
