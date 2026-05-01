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

    let adminUser: any = null;
    let usersCreated = 0;
    for (const u of testUsers) {
      let user: any = await db.User.findOne({ where: { email: u.email } });
      if (!user) {
        const hashedPassword = await bcrypt.hash(u.password, 12);
        user = await db.User.create({ ...u, password: hashedPassword } as any, { hooks: false } as any);
        usersCreated++;
      }
      if (u.role === 'admin') adminUser = user;
    }
    console.log(`✓ Seeded ${usersCreated} new users (skipped existing)`);

    // ── Mock Reports ───────────────────────────────────────
    const existingReports = await db.Report.count();
    if (existingReports === 0) {
      if (!adminUser) adminUser = await db.User.findOne({ where: { email: 'admin@ankara.bel.tr' } });
      const uid = adminUser.id;

      const mockReports = [
        // 1 — pending
        {
          userId: uid,
          imagePath: 'uploads/IMG_0410.JPG',
          userDescription: 'Yol kenarı çökmüş, asfalt yarılmış ve su sızıyor.',
          userCategory: 'road_damage',
          latitude: 39.9208, longitude: 32.8541,
          aiCategory: 'road_damage', aiPriority: '4', aiPriorityLabel: 'High',
          aiUnit: 'Fen Isleri', aiConfidence: 0.91,
          aiDescription: 'cracked asphalt road edge water seepage near curb',
          status: 'pending' as const, reviewStatus: null,
        },
        // 2 — in_review
        {
          userId: uid,
          imagePath: 'uploads/IMG_0411.JPG',
          userDescription: 'Kaldırım taşları dağılmış, etraf kirli ve tehlikeli.',
          userCategory: 'sidewalk_damage',
          latitude: 39.9334, longitude: 32.8597,
          aiCategory: 'sidewalk_damage', aiPriority: '3', aiPriorityLabel: 'Moderate',
          aiUnit: 'Fen Isleri', aiConfidence: 0.85,
          aiDescription: 'broken sidewalk tiles displaced debris scattered near residential building',
          status: 'in_review' as const, reviewStatus: null,
        },
        // 3 — in_review (düşük güven)
        {
          userId: uid,
          imagePath: 'uploads/IMG_0412.PNG',
          userDescription: 'Su borusu patlamış, yüksek basınçla su fışkırıyor.',
          userCategory: 'sewage_water',
          latitude: 39.9112, longitude: 32.8223,
          aiCategory: 'sewage_water', aiPriority: '5', aiPriorityLabel: 'Critical',
          aiUnit: 'Su ve Kanalizasyon', aiConfidence: 0.56,
          aiDescription: 'burst water pipe spraying forcefully near residential wall',
          status: 'in_review' as const, reviewStatus: null,
        },
        // 4 — in_review
        {
          userId: uid,
          imagePath: 'uploads/IMG_0413.PNG',
          userDescription: 'Kaldırım taşları çökmüş, rögar kapağı açıkta kalmış.',
          userCategory: 'sidewalk_damage',
          latitude: 39.9451, longitude: 32.8712,
          aiCategory: 'sidewalk_damage', aiPriority: '4', aiPriorityLabel: 'High',
          aiUnit: 'Fen Isleri', aiConfidence: 0.89,
          aiDescription: 'displaced cobblestones collapsed sidewalk near open manhole cover',
          status: 'in_review' as const, reviewStatus: null,
        },
        // 5 — in_review (düşük güven)
        {
          userId: uid,
          imagePath: 'uploads/IMG_0414.PNG',
          userDescription: 'Ağaç dibine çöp dökülmüş, kaldırım kirletilmiş.',
          userCategory: 'waste',
          latitude: 39.9289, longitude: 32.8401,
          aiCategory: 'waste', aiPriority: '3', aiPriorityLabel: 'Moderate',
          aiUnit: 'Temizlik Isleri', aiConfidence: 0.58,
          aiDescription: 'waste garbage scattered around tree base on urban sidewalk',
          status: 'in_review' as const, reviewStatus: null,
        },
        // 6 — in_progress / approved
        {
          userId: uid,
          imagePath: 'uploads/IMG_0415.PNG',
          userDescription: 'Yol asfaltlanmamış, çamurlu ve araç geçişi zor.',
          userCategory: 'road_damage',
          latitude: 39.9178, longitude: 32.8634,
          aiCategory: 'road_damage', aiPriority: '3', aiPriorityLabel: 'Moderate',
          aiUnit: 'Fen Isleri', aiConfidence: 0.80,
          aiDescription: 'unpaved dirt road with potholes near residential apartment buildings',
          status: 'in_progress' as const, reviewStatus: 'approved' as const,
        },
        // 7 — in_progress / corrected
        {
          userId: uid,
          imagePath: 'uploads/IMG_0416.JPG',
          userDescription: 'Kazı alanında su birikmiş, boru kırılmış.',
          userCategory: 'sewage_water',
          latitude: 39.9367, longitude: 32.8489,
          aiCategory: 'sewage_water', aiPriority: '5', aiPriorityLabel: 'Critical',
          aiUnit: 'Su ve Kanalizasyon', aiConfidence: 0.63,
          aiDescription: 'broken underground pipe water pooling in excavated ground near road',
          status: 'in_progress' as const, reviewStatus: 'corrected' as const,
          staffNote: 'Kategori düzeltildi: altyapı değil, su/kanalizasyon sorunu.',
        },
        // 8 — resolved / approved
        {
          userId: uid,
          imagePath: 'uploads/IMG_0417.WEBP',
          userDescription: 'Çöp konteynerleri taşmış, etraf kirletilmiş.',
          userCategory: 'waste',
          latitude: 39.9523, longitude: 32.8301,
          aiCategory: 'waste', aiPriority: '4', aiPriorityLabel: 'High',
          aiUnit: 'Temizlik Isleri', aiConfidence: 0.92,
          aiDescription: 'overflowing garbage bins waste bags scattered on residential street',
          status: 'resolved' as const, reviewStatus: 'approved' as const,
          staffNote: 'Temizlik ekibi görevlendirildi, alan temizlendi.',
        },
        // 9 — resolved / approved
        {
          userId: uid,
          imagePath: 'uploads/IMG_0418.JPG',
          userDescription: 'Duvar boydan boya grafiti ile kaplanmış.',
          userCategory: 'vandalism',
          latitude: 39.9150, longitude: 32.8750,
          aiCategory: 'vandalism', aiPriority: '2', aiPriorityLabel: 'Minor',
          aiUnit: 'Zabita', aiConfidence: 0.88,
          aiDescription: 'extensive graffiti vandalism covering long public wall at night',
          status: 'resolved' as const, reviewStatus: 'approved' as const,
          staffNote: 'Zabita ekibi yönlendirildi.',
        },
        // 10 — in_review
        {
          userId: uid,
          imagePath: 'uploads/mock-1.jpg',
          userDescription: 'Yağmur sonrası yol su altında kaldı, araç geçişi tehlikeli.',
          userCategory: 'road_damage',
          latitude: 39.9400, longitude: 32.8100,
          aiCategory: 'road_damage', aiPriority: '4', aiPriorityLabel: 'High',
          aiUnit: 'Fen Isleri', aiConfidence: 0.77,
          aiDescription: 'flooded road surface water accumulation near parked cars at night',
          status: 'in_review' as const, reviewStatus: null,
        },
        // 11 — in_review (düşük güven)
        {
          userId: uid,
          imagePath: 'uploads/mock-2.jpg',
          userDescription: 'Kaldırım kazılmış bırakılmış, etrafta taş ve çamur var.',
          userCategory: 'infrastructure',
          latitude: 39.9050, longitude: 32.8900,
          aiCategory: 'infrastructure', aiPriority: '3', aiPriorityLabel: 'Moderate',
          aiUnit: 'Fen Isleri', aiConfidence: 0.55,
          aiDescription: 'excavated sidewalk abandoned construction site broken stones near road',
          status: 'in_review' as const, reviewStatus: null,
        },
        // 12 — in_progress / approved
        {
          userId: uid,
          imagePath: 'uploads/mock-3.jpg',
          userDescription: 'Yol tamamen su altında, bölgeye girilemiyor.',
          userCategory: 'road_damage',
          latitude: 39.9600, longitude: 32.8200,
          aiCategory: 'road_damage', aiPriority: '5', aiPriorityLabel: 'Critical',
          aiUnit: 'Fen Isleri', aiConfidence: 0.86,
          aiDescription: 'heavily flooded road surface blocking traffic near buildings',
          status: 'in_progress' as const, reviewStatus: 'approved' as const,
        },
        // 13 — resolved / approved
        {
          userId: uid,
          imagePath: 'uploads/mock-4.jpg',
          userDescription: 'Çöp konteynerleri taşmış, kötü koku yayılıyor.',
          userCategory: 'waste',
          latitude: 39.9250, longitude: 32.8650,
          aiCategory: 'waste', aiPriority: '3', aiPriorityLabel: 'Moderate',
          aiUnit: 'Temizlik Isleri', aiConfidence: 0.90,
          aiDescription: 'overflowing garbage containers waste scattered on street corner',
          status: 'resolved' as const, reviewStatus: 'approved' as const,
          staffNote: 'Temizlik ekibi müdahale etti.',
        },
        // 14 — in_progress / corrected
        {
          userId: uid,
          imagePath: 'uploads/mock-5.jpg',
          userDescription: 'Boş araziye kaçak çöp dökülmüş.',
          userCategory: 'waste',
          latitude: 39.9350, longitude: 32.8350,
          aiCategory: 'waste', aiPriority: '3', aiPriorityLabel: 'Moderate',
          aiUnit: 'Temizlik Isleri', aiConfidence: 0.66,
          aiDescription: 'illegal waste dumping debris scattered on vacant land near road',
          status: 'in_progress' as const, reviewStatus: 'corrected' as const,
          staffNote: 'Kategori kaçak döküm olarak güncellendi.',
        },
        // 15 — pending
        {
          userId: uid,
          imagePath: 'uploads/mock-6.jpg',
          userDescription: 'İstinat duvarı yıkılmış, çamurlu su akıyor.',
          userCategory: 'infrastructure',
          latitude: 39.9480, longitude: 32.8480,
          aiCategory: 'sewage_water', aiPriority: '4', aiPriorityLabel: 'High',
          aiUnit: 'Su ve Kanalizasyon', aiConfidence: 0.72,
          aiDescription: 'muddy water overflow near damaged retaining wall along road',
          status: 'pending' as const, reviewStatus: null,
        },
        // 16 — in_review
        {
          userId: uid,
          imagePath: 'uploads/mock-7.jpg',
          userDescription: 'Sokak lambası yanmıyor, bölge gece karanlık kalıyor.',
          userCategory: 'lighting',
          latitude: 39.9150, longitude: 32.8550,
          aiCategory: 'lighting', aiPriority: '3', aiPriorityLabel: 'Moderate',
          aiUnit: 'Elektrik Birimi', aiConfidence: 0.83,
          aiDescription: 'streetlight not working dark urban road at night near buildings',
          status: 'in_review' as const, reviewStatus: null,
        },
        // 17 — rejected / rejected
        {
          userId: uid,
          imagePath: 'uploads/mock-8.jpg',
          userDescription: 'İşyeri kepengi grafiti ile kaplanmış.',
          userCategory: 'vandalism',
          latitude: 39.9320, longitude: 32.8420,
          aiCategory: 'vandalism', aiPriority: '2', aiPriorityLabel: 'Minor',
          aiUnit: 'Zabita', aiConfidence: 0.44,
          aiDescription: 'graffiti vandalism covering shop shutters on commercial street',
          status: 'rejected' as const, reviewStatus: 'rejected' as const,
          rejectReason: 'Fotoğraf bulanık, sorun net tespit edilemedi.',
        },
      ];

      for (const r of mockReports) {
        await db.Report.create(r as any);
      }
      console.log(`✓ Seeded ${mockReports.length} mock reports`);
    } else {
      console.log(`✓ Skipping reports — ${existingReports} already exist`);
    }

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
