/**
 * SEED: PEACETIME (Hydration for Chaos Testing)
 * Populates the DB with "Healthy" economics so there is something to break.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Peacetime Data...');

    // 1. Clean Slate (for sandbox)
    await prisma.budgetRequest.deleteMany();
    await prisma.productionPitch.deleteMany();

    // 2. Healthy Unit Economics Data (Mock for DTO/Service)
    // (In a real app, we might write to a 'FinancialMetrics' table, but here our services read live inputs)
    // We will assume the service tests will input their own data, but we can seed some Budget Requests that are "Approved"

    const marketingOrg = await prisma.organization.findFirst({ where: { name: 'VeroScale' } });

    if (marketingOrg) {
        // Seed Approved Marketing Budget
        await prisma.budgetRequest.create({
            data: {
                organizationId: marketingOrg.id,
                amount: 50000,
                category: 'MARKETING',
                justification: 'Q3 Ad Spend',
                status: 'APPROVED',
                requesterId: 'system-seed'
            }
        });
        console.log('✅ Seeded Approved Marketing Budget');
    }

    // 3. Peacetime Heijunka Pitch
    // ...

    console.log('✨ Peacetime Environment Hydrated.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
