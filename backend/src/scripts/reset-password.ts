import { prisma } from '../db/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'migueldp4@gmail.com';
  const newPassword = 'Password2026!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        isVerified: true,
        role: 'ADMIN',
      },
    });
    console.log(`✅ Contraseña restablecida exitosamente para ${updated.email}`);
    console.log(`Rol: ${updated.role}`);
    console.log(`Nueva contraseña: ${newPassword}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Miguel Dubois',
        phone: '+502 5406-6217',
        company: 'Kroma Lab',
        taxId: 'CF',
        address: 'San José el Placer, Villa Nueva',
        department: 'Dirección General',
        role: 'ADMIN',
        isVerified: true,
      },
    });
    console.log(`✅ Usuario creado y contraseña asignada para ${created.email}`);
    console.log(`Rol: ${created.role}`);
    console.log(`Nueva contraseña: ${newPassword}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
