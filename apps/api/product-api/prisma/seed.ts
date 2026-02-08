import { PrismaClient, Prisma } from '@prisma/client';
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
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();

  // Load products from JSON file
  const seedDataPath = join(__dirname, 'seed-data.json');
  const products: ProductData[] = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

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
    
    console.log(`  ✅ Created product: ${createdProduct.name} (${createdProduct.variants.length} variants)`);
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
