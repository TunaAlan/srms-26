// Environment configuration
export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export type EnvironmentType = typeof ENV;
