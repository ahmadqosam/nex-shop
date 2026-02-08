import { PrismaClient } from '@prisma/inventory-client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface InventorySeed {
  sku: string;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
}

async function main() {
  console.log('🌱 Seeding inventory...');

  // Clear existing data
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.inventory.deleteMany();

  // Load from JSON
  const seedDataPath = join(__dirname, 'seed-data.json');
  const inventoryItems: InventorySeed[] = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

  for (const item of inventoryItems) {
    const inventory = await prisma.inventory.create({
      data: {
        sku: item.sku,
        quantity: item.quantity,
        reserved: item.reserved,
        lowStockThreshold: item.lowStockThreshold,
      },
    });

    console.log(`  ✅ Created inventory for SKU: ${inventory.sku} (Qty: ${inventory.quantity})`);

    // Create initial adjustment record
    await prisma.inventoryAdjustment.create({
      data: {
        inventoryId: inventory.id,
        adjustmentType: 'initial_stock',
        quantity: item.quantity,
        reason: 'Initial seed',
      },
    });
  }

  console.log('✨ Inventory seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
