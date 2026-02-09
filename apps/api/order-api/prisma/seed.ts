import { PrismaClient, OrderStatus } from '@prisma/order-api-client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface SeedOrderItem {
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  unitPriceInCents: number;
  currency: string;
  productName: string;
  variantName: string;
  imageUrl?: string;
}

interface SeedOrder {
  orderNumber: string;
  userId: string;
  email: string;
  status: string;
  shippingAddress: Record<string, string>;
  notes?: string | null;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  items: SeedOrderItem[];
}

async function main() {
  console.log('🌱 Seeding order-api database...');

  // Clear existing data (items first due to FK)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  const seedDataPath = join(__dirname, 'seed-data.json');
  const orders: SeedOrder[] = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

  for (const orderData of orders) {
    const { items, ...order } = orderData;

    const subtotalInCents = items.reduce(
      (sum, item) => sum + item.unitPriceInCents * item.quantity,
      0,
    );

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber: order.orderNumber,
        userId: order.userId,
        email: order.email,
        status: order.status as OrderStatus,
        shippingAddress: order.shippingAddress,
        subtotalInCents,
        shippingCostInCents: 0,
        totalInCents: subtotalInCents,
        notes: order.notes,
        paidAt: order.paidAt ? new Date(order.paidAt) : null,
        shippedAt: order.shippedAt ? new Date(order.shippedAt) : null,
        deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : null,
        cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : null,
        cancellationReason: order.cancellationReason,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
            totalPriceInCents: item.unitPriceInCents * item.quantity,
            currency: item.currency,
            productName: item.productName,
            variantName: item.variantName,
            imageUrl: item.imageUrl,
          })),
        },
      },
      include: { items: true },
    });

    console.log(
      `  ✅ Created order: ${createdOrder.orderNumber} (${createdOrder.status}, ${createdOrder.items.length} items)`,
    );
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
