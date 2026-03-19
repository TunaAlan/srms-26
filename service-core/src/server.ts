import app from './app.js';
import { PORT } from './config/env.js';
import db from './models/index.js';
import { seedDatabase } from './scripts/seed.js';

const start = async (): Promise<void> => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected');

    await db.sequelize.sync();
    console.log('Models synced');

    // Seed database in development
    if (process.env.NODE_ENV === 'development') {
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(`service-core running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to start server:', err);
    process.exit(1);
  }
};

start();
