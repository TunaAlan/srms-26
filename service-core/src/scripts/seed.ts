import db from '../models/index.js';

export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Sync database
    await db.sequelize.sync({ alter: true });
    console.log('✓ Database synced');

    // Seed test users only if they don't exist yet
    const testUsers = [
      { name: 'Admin User',      email: 'admin@ankara.bel.tr',      password: 'admin123', role: 'admin' as const },
      { name: 'Department User', email: 'department@ankara.bel.tr', password: 'dept123',  role: 'department' as const },
      { name: 'Regular User 1', email: 'user1@ankara.bel.tr',      password: 'user123',  role: 'user' as const },
      { name: 'Regular User 2', email: 'user2@ankara.bel.tr',      password: 'user123',  role: 'user' as const },
      { name: 'Regular User 3', email: 'user3@ankara.bel.tr',      password: 'user123',  role: 'user' as const },
    ];

    let created = 0;
    for (const u of testUsers) {
      const exists = await db.User.findOne({ where: { email: u.email } });
      if (!exists) {
        await db.User.create(u as any, { hooks: true } as any);
        created++;
      }
    }
    console.log(`✓ Seeded ${created} new users (skipped existing)`);

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
