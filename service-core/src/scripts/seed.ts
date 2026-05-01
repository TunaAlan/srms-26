import db from '../models/index.js';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    await db.sequelize.sync({ alter: true });
    console.log('✓ Database synced');

    // ── Users ──────────────────────────────────────────────
    const testUsers = [
      { name: 'Admin',            email: 'admin@ankara.bel.tr',  password: 'admin123',  role: 'admin' as const },
      { name: 'Review Personnel', email: 'review@ankara.bel.tr', password: 'review123', role: 'review_personnel' as const },
    ];

    let usersCreated = 0;
    for (const u of testUsers) {
      const existing = await db.User.findOne({ where: { email: u.email } });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(u.password, 12);
        await db.User.create({ ...u, password: hashedPassword } as any, { hooks: false } as any);
        usersCreated++;
      }
    }
    console.log(`✓ Seeded ${usersCreated} new users (skipped existing)`);

    console.log('\n📋 Test Accounts:');
    console.log('================');
    testUsers.forEach((user) => {
      console.log(`\nRole: ${user.role.toUpperCase()}`);
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
    });

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}
