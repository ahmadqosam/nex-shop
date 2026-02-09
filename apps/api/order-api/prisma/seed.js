"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_api_client_1 = require("@prisma/order-api-client");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new order_api_client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding order-api database...');
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    const seedDataPath = (0, path_1.join)(__dirname, 'seed-data.json');
    const orders = JSON.parse((0, fs_1.readFileSync)(seedDataPath, 'utf-8'));
    for (const orderData of orders) {
        const { items, ...order } = orderData;
        const subtotalInCents = items.reduce((sum, item) => sum + item.unitPriceInCents * item.quantity, 0);
        const createdOrder = await prisma.order.create({
            data: {
                orderNumber: order.orderNumber,
                userId: order.userId,
                email: order.email,
                status: order.status,
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
        console.log(`  ✅ Created order: ${createdOrder.orderNumber} (${createdOrder.status}, ${createdOrder.items.length} items)`);
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
//# sourceMappingURL=seed.js.map