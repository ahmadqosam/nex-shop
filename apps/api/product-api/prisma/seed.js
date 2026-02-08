"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const product_client_1 = require("@prisma/product-client");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new product_client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    await prisma.variant.deleteMany();
    await prisma.product.deleteMany();
    const seedDataPath = (0, path_1.join)(__dirname, 'seed-data.json');
    const products = JSON.parse((0, fs_1.readFileSync)(seedDataPath, 'utf-8'));
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
//# sourceMappingURL=seed.js.map