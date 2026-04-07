import 'dotenv/config';

export const PORT: number = Number(process.env.PORT) || 3000;
export const NODE_ENV: string = process.env.NODE_ENV || 'development';
export const JWT_SECRET: string = process.env.JWT_SECRET || 'change-this-secret-in-production';
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
export const AI_SERVICE_URL: string = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
