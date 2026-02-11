import { PrismaClient, Prisma } from '@prisma/product-client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface VariantData {
  sku: string;
  name: string;
  priceInCents: number | null;
  attributes: Prisma.InputJsonValue;
}

interface ProductData {
  name: string;
  slug: string;
  category: string;
  basePriceInCents: number;
  currency: string;
  description: string;
  tags: string[];
  images: string[];
  specifications: Prisma.InputJsonValue;
  isAvailable: boolean;
  weightInGrams: number;
  variants: VariantData[];
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (variants first due to FK)
  await prisma.flashSalePurchase.deleteMany();
  await prisma.flashSaleItem.deleteMany();
  await prisma.flashSale.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();

  // Load products from JSON file
  const seedDataPath = join(__dirname, 'seed-data.json');
  const products: ProductData[] = JSON.parse(
    readFileSync(seedDataPath, 'utf-8'),
  );

  const createdProducts = [];

  for (const productData of products) {
    const { variants, ...product } = productData;

    const createdProduct = await prisma.product.create({
      data: {
        ...product,
        variants: {
          create: variants.map((v) => ({
            sku: v.sku,
            name: v.name,
            priceInCents: v.priceInCents,
            attributes: v.attributes,
          })),
        },
      },
      include: { variants: true },
    });

    createdProducts.push(createdProduct);
    console.log(
      `  ✅ Created product: ${createdProduct.name} (${createdProduct.variants.length} variants)`,
    );
  }

  // Create Sample Flash Sale
  console.log('⚡ Seeding flash sales...');
  const flashSale = await prisma.flashSale.create({
    data: {
      name: 'Summer Flash Sale',
      startTime: new Date(Date.now() - 3600_000), // Started 1 hour ago
      endTime: new Date(Date.now() + 86400_000), // Ends in 24 hours
      isActive: true,
    },
  });

  // Find Nex Ace and Move 2
  const nexAce = createdProducts.find((p) => p.slug === 'nex-ace');
  const move2 = createdProducts.find((p) => p.slug === 'move-2');

  if (nexAce) {
    await prisma.flashSaleItem.create({
      data: {
        flashSaleId: flashSale.id,
        productId: nexAce.id,
        salePriceInCents: 29900, // Regular 44900
        maxQuantity: 10,
      },
    });
    console.log('  ✅ Added Nex Ace to Summer Flash Sale');
  }

  if (move2) {
    await prisma.flashSaleItem.create({
      data: {
        flashSaleId: flashSale.id,
        productId: move2.id,
        salePriceInCents: 34900, // Regular 44900
        maxQuantity: 5,
      },
    });
    console.log('  ✅ Added Move 2 to Summer Flash Sale');
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
