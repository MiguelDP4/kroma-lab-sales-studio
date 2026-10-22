import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export async function seedDatabase() {
  console.log('🌱 Inicializando configuración y datos de Kroma Lab...');

  // 1. Configuración de Taller Audley UV DTF
  await prisma.workshopConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      printableRollWidthCm: 28.0,
      rollWidthCm: 30.0,
      rateTier1: 130.0,
      rateTier2: 120.0,
      rateTier3: 115.0,
      rateTier4: 105.0,
      rateTier5: 95.0,
      cuttingFeePerPieceQ: 0.08,
      bankBiAccount: '5371667253',
      bankBacAccount: null,
      bankGytAccount: null,
      bankBanruralAccount: null,
      whatsappNumber: '+502 5406-6217',
      filmACostPerM: 6.30,
      filmBCostPerM: 4.08,
      inkCostPerM: 8.25,
      monthlyNetTargetQ: 20000.0,
    },
  });

  // 2. Usuario Administrador Oficial
  const adminPassword = await bcrypt.hash('Admin2026!', 10);
  await prisma.user.upsert({
    where: { email: 'miguel@kromalab.gt' },
    update: {
      password: adminPassword,
      name: 'Miguel Dubois',
      phone: '+502 5406-6217',
      role: 'ADMIN',
      isVerified: true,
    },
    create: {
      email: 'miguel@kromalab.gt',
      password: adminPassword,
      name: 'Miguel Dubois',
      phone: '+502 5406-6217',
      company: 'Kroma Lab',
      taxId: '8932451-9',
      address: 'San José El Placer, Villa Nueva, Guatemala',
      department: 'Dirección General',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  // 3. Insumos de Inventario de Taller UV DTF (7 insumos clave)
  const items = [
    {
      code: 'FILM_A',
      name: 'Film A Base PET (30cm / 28cm útiles)',
      category: 'FILMS',
      unit: 'm',
      currentStock: 120.0,
      minStockThreshold: 30.0,
      unitCostQ: 6.00,
    },
    {
      code: 'FILM_B',
      name: 'Film B Transfer Calandrado',
      category: 'FILMS',
      unit: 'm',
      currentStock: 95.0,
      minStockThreshold: 30.0,
      unitCostQ: 4.00,
    },
    {
      code: 'INK_CMYK',
      name: 'Tinta UV Industrial CMYK',
      category: 'INKS',
      unit: 'ml',
      currentStock: 1400.0,
      minStockThreshold: 500.0,
      unitCostQ: 0.55,
    },
    {
      code: 'INK_WHITE',
      name: 'Tinta UV Blanca (Cama Fotográfica)',
      category: 'INKS',
      unit: 'ml',
      currentStock: 1800.0,
      minStockThreshold: 600.0,
      unitCostQ: 0.55,
    },
    {
      code: 'VARNISH_3D',
      name: 'Barniz UV Glossy 3D (Relieve Táctil)',
      category: 'INKS',
      unit: 'ml',
      currentStock: 950.0,
      minStockThreshold: 400.0,
      unitCostQ: 0.55,
    },
    {
      code: 'BLADES_CUT',
      name: 'Navajas de Corte de Precisión',
      category: 'CONSUMABLES',
      unit: 'uds',
      currentStock: 8.0,
      minStockThreshold: 2.0,
      unitCostQ: 25.00,
    },
    {
      code: 'SOLVENT_FLUSH',
      name: 'Líquido Solvente UV Flush',
      category: 'SPARES',
      unit: 'ml',
      currentStock: 850.0,
      minStockThreshold: 300.0,
      unitCostQ: 0.20,
    },
  ];

  for (const item of items) {
    await prisma.inventoryItem.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  // Si estamos en producción, asegurar que la base de datos esté libre de cualquier registro falso/demo
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prduction' || process.env.NODE_ENV?.includes('prod')) {
    console.log('🧹 Producción detectada: Garantizando base de datos 100% limpia de datos de prueba...');
    try {
      await prisma.dispatchNote.deleteMany({
        where: { folio: { in: ['REM-2026-001', 'REM-2026-002', 'REM-2026-003'] } },
      });
      await prisma.payment.deleteMany({
        where: { paymentCode: { in: ['PAY-2026-001', 'PAY-2026-002', 'PAY-2026-003'] } },
      });
      await prisma.order.deleteMany({
        where: { code: { in: ['KL-2026-001', 'KL-00042', 'KL-00041', 'KL-00040'] } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: ['rodrigo@promoguate.gt', 'taller@kromalab.gt'] } },
      });
      await prisma.customer.deleteMany({
        where: { email: { in: ['rodrigo@promoguate.gt', 'pedidos@cafesanjose.gt'] } },
      });
    } catch (cleanupErr) {
      console.warn('Nota de limpieza:', cleanupErr);
    }
    console.log('✅ Base de datos de producción inicializada y limpia.');
    return;
  }

  // 4. Clientes B2B iniciales (para pruebas locales y tests automatizados)
  const promoGuate = await prisma.customer.upsert({
    where: { email: 'rodrigo@promoguate.gt' },
    update: {},
    create: {
      companyName: 'PromoGuate',
      managerName: 'Rodrigo Castillo',
      phone: '+502 5555-1234',
      email: 'rodrigo@promoguate.gt',
      address: 'Zona 10, Edificio Design Center, Oficina 402, Ciudad de Guatemala',
      taxId: '7845129-4',
      tier: 'VIP',
      sector: 'ARTICULOS_PROMO',
      notes: 'Cliente de alto volumen de artículos promocionales y pachones metálicos.',
    },
  });

  await prisma.customer.upsert({
    where: { email: 'pedidos@cafesanjose.gt' },
    update: {},
    create: {
      companyName: 'Café San José',
      managerName: 'Mariana López',
      phone: '+502 5555-5678',
      email: 'pedidos@cafesanjose.gt',
      address: 'San José El Placer, Villa Nueva, Guatemala',
      taxId: '9823145-2',
      tier: 'RECURRENTE',
      sector: 'CAFETERIAS',
      notes: 'Stickers para tazas y vasos térmicos de café de especialidad.',
    },
  });

  // Usuarios del Sistema para tests
  const employeePassword = await bcrypt.hash('Taller2026!', 10);
  const customerPassword = await bcrypt.hash('Cliente2026!', 10);

  await prisma.user.upsert({
    where: { email: 'taller@kromalab.gt' },
    update: {},
    create: {
      email: 'taller@kromalab.gt',
      password: employeePassword,
      name: 'Carlos Méndez',
      phone: '+502 5555-0200',
      company: 'Kroma Lab Taller',
      taxId: '4512789-0',
      address: 'Taller de Producción San José El Placer',
      department: 'Operador Audley UV DTF',
      role: 'EMPLOYEE',
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'rodrigo@promoguate.gt' },
    update: {},
    create: {
      email: 'rodrigo@promoguate.gt',
      password: customerPassword,
      name: 'Rodrigo Castillo',
      phone: '+502 5555-1234',
      company: 'PromoGuate',
      taxId: '7845129-4',
      address: 'Zona 10, Edificio Design Center, Oficina 402, Ciudad de Guatemala',
      department: 'Compras B2B',
      role: 'CUSTOMER',
      customerId: promoGuate.id,
      isVerified: true,
    },
  });

  // 5. Órdenes iniciales de demostración para tests
  let order1 = await prisma.order.findUnique({ where: { code: 'KL-2026-001' } });
  if (!order1) {
    order1 = await prisma.order.create({
      data: {
        code: 'KL-2026-001',
        status: 'PRINTING',
        paymentStatus: 'PARTIAL',
        customerId: promoGuate.id,
        customerName: 'Rodrigo Castillo',
        customerPhone: '+502 5555-1234',
        customerEmail: 'rodrigo@promoguate.gt',
        customerTaxId: '7845129-4',
        customerAddress: 'Zona 10, Edificio Design Center, Oficina 402, Ciudad de Guatemala',
        widthCm: 8.0,
        heightCm: 5.0,
        qty: 150,
        linearMeters: 2.68,
        unitRateQ: 115.0,
        materialPriceQ: 308.20,
        withCutting: true,
        cuttingPriceQ: 12.00,
        totalAmountQ: 320.20,
        amountPaidQ: 160.00,
        finishType: 'GLOSSY_VARNISH',
        stickersPerRow: 3,
        rows: 50,
        notes: 'Logotipos promocionales para termos de acero inoxidable.',
      },
    });
  }

  // Remisión inicial para tests
  const existingDispatch = await prisma.dispatchNote.findUnique({ where: { folio: 'REM-2026-001' } });
  if (!existingDispatch) {
    await prisma.dispatchNote.create({
      data: {
        folio: 'REM-2026-001',
        orderId: order1.id,
        customerName: 'Rodrigo Castillo',
        customerPhone: '+502 5555-1234',
        customerAddress: 'Zona 10, Edificio Design Center, Oficina 402, Ciudad de Guatemala',
        customerTaxId: '7845129-4',
        deliveryMethod: 'MOTO_LOCAL',
        packagesCount: 1,
        linearMeters: 2.68,
        totalAmountQ: 320.20,
        balanceDueQ: 160.20,
        status: 'PREPARED',
        checklistPassed: true,
        notes: 'Entregar en recepción con comprobante de anticipo verificado.',
      },
    });
  }

  // Abono parcial inicial para tests
  const existingPayment = await prisma.payment.findUnique({ where: { paymentCode: 'PAY-2026-001' } });
  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        paymentCode: 'PAY-2026-001',
        orderId: order1.id,
        customerName: 'Rodrigo Castillo',
        customerTaxId: '7845129-4',
        amountPaidQ: 160.00,
        method: 'TRANSFER',
        bankName: 'BI',
        bankReference: 'TR-894125',
        notes: 'Anticipo del 50% vía Banco Industrial para inicio de tiraje.',
      },
    });
  }

  console.log('✅ Base de datos inicializada exitosamente.');
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error al ejecutar seed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
