import 'dotenv/config';
import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';


async function main() {
  const count = await prisma.user.count();
  if (count === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@domain.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin#123456';
    const adminName = process.env.ADMIN_NAME || 'Super Administrator';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
      },
    });

    console.log(`✅ Admin user seeded: ${admin.email}`);
    console.log(`🔑 Password: ${adminPassword} (Disarankan untuk diubah setelah login pertama kali)`);
  } else {
    console.log('ℹ️ User sudah ada di database, lewati seeding.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
