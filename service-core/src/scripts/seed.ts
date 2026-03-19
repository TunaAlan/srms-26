import db from '../models/index.js';

export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Sync database
    await db.sequelize.sync({ alter: true });
    console.log('✓ Database synced');

    // Clear existing data
    await db.User.destroy({ where: {} });
    console.log('✓ Cleared existing user data');

    // Seed test users
    const testUsers: Array<{
      name: string;
      email: string;
      password: string;
      role: 'user' | 'admin' | 'department';
    }> = [
      {
        name: 'Admin User',
        email: 'admin@ankara.bel.tr',
        password: 'admin123',
        role: 'admin',
      },
      {
        name: 'Department User',
        email: 'department@ankara.bel.tr',
        password: 'dept123',
        role: 'department',
      },
      {
        name: 'Regular User 1',
        email: 'user1@ankara.bel.tr',
        password: 'user123',
        role: 'user',
      },
      {
        name: 'Regular User 2',
        email: 'user2@ankara.bel.tr',
        password: 'user123',
        role: 'user',
      },
      {
        name: 'Regular User 3',
        email: 'user3@ankara.bel.tr',
        password: 'user123',
        role: 'user',
      },
    ];

    const createdUsers = await db.User.bulkCreate(testUsers);
    console.log(`✓ Created ${createdUsers.length} test users`);

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
