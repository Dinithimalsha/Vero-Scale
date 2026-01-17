/**
 * Database Seed Script
 * Creates sample data for development/testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding VeroScale database...');

    // Create test organization
    const org = await prisma.organization.upsert({
        where: { slug: 'acme-corp' },
        update: {},
        create: {
            name: 'Acme Corporation',
            slug: 'acme-corp',
            featureRatio: 60,
            bugRatio: 20,
            debtRatio: 20,
        },
    });

    console.log(`✓ Organization: ${org.name}`);

    // Create test users
    const owner = await prisma.user.upsert({
        where: { email: 'ceo@acme.com' },
        update: {},
        create: {
            email: 'ceo@acme.com',
            name: 'Alex CEO',
            role: 'OWNER',
            organizationId: org.id,
            preferredMode: 'MANAGER',
        },
    });

    const engineer = await prisma.user.upsert({
        where: { email: 'dev@acme.com' },
        update: {},
        create: {
            email: 'dev@acme.com',
            name: 'Jordan Developer',
            role: 'MEMBER',
            organizationId: org.id,
            preferredMode: 'MAKER',
        },
    });

    const contractor = await prisma.user.upsert({
        where: { email: 'contractor@external.com' },
        update: {},
        create: {
            email: 'contractor@external.com',
            name: 'Casey Contractor',
            role: 'CONTRACTOR',
            organizationId: org.id,
            preferredMode: 'MAKER',
        },
    });

    console.log(`✓ Users: ${owner.name}, ${engineer.name}, ${contractor.name}`);

    // Create system health (GREEN by default)
    await prisma.systemHealth.upsert({
        where: { organizationId: org.id },
        update: {},
        create: {
            organizationId: org.id,
            status: 'GREEN',
            activeIncidentCount: 0,
            mainBranchLocked: false,
        },
    });

    console.log('✓ System health initialized');

    // Create sample production pitches
    const now = new Date();
    const pitchStart = new Date(now);
    pitchStart.setDate(pitchStart.getDate() - 7);
    const pitchEnd = new Date(now);
    pitchEnd.setDate(pitchEnd.getDate() - 2);

    const completedPitch = await prisma.productionPitch.create({
        data: {
            organizationId: org.id,
            name: 'Sprint 1',
            startTime: pitchStart,
            endTime: pitchEnd,
            capacityPoints: 20,
            currentLoad: 18,
            featurePoints: 10,
            bugPoints: 4,
            debtPoints: 4,
            status: 'COMPLETED',
        },
    });

    const currentPitchStart = new Date(now);
    currentPitchStart.setDate(currentPitchStart.getDate() - 2);
    const currentPitchEnd = new Date(now);
    currentPitchEnd.setDate(currentPitchEnd.getDate() + 5);

    const currentPitch = await prisma.productionPitch.create({
        data: {
            organizationId: org.id,
            name: 'Sprint 2',
            startTime: currentPitchStart,
            endTime: currentPitchEnd,
            capacityPoints: 20,
            currentLoad: 8,
            featurePoints: 5,
            bugPoints: 3,
            debtPoints: 0,
            status: 'OPEN',
        },
    });

    console.log(`✓ Production pitches: ${completedPitch.name}, ${currentPitch.name}`);

    // Create sample tasks
    await prisma.task.createMany({
        data: [
            {
                organizationId: org.id,
                pitchId: completedPitch.id,
                assigneeId: engineer.id,
                title: 'Implement user authentication',
                taskType: 'FEATURE',
                storyPoints: 5,
                priorityScore: 8.5,
                status: 'DONE',
                createdAt: new Date(pitchStart),
                completedAt: new Date(pitchEnd),
            },
            {
                organizationId: org.id,
                pitchId: completedPitch.id,
                assigneeId: engineer.id,
                title: 'Fix login redirect bug',
                taskType: 'BUG',
                storyPoints: 2,
                priorityScore: 9.0,
                status: 'DONE',
                createdAt: new Date(pitchStart),
                completedAt: new Date(pitchEnd),
            },
            {
                organizationId: org.id,
                pitchId: currentPitch.id,
                assigneeId: engineer.id,
                title: 'Build dashboard UI',
                taskType: 'FEATURE',
                storyPoints: 5,
                priorityScore: 7.5,
                status: 'IN_PROGRESS',
                createdAt: new Date(),
                startedAt: new Date(),
            },
            {
                organizationId: org.id,
                pitchId: currentPitch.id,
                title: 'Update API documentation',
                taskType: 'DEBT',
                storyPoints: 3,
                priorityScore: 4.0,
                status: 'READY',
                createdAt: new Date(),
            },
            {
                organizationId: org.id,
                title: 'Implement notifications',
                taskType: 'FEATURE',
                storyPoints: 8,
                priorityScore: 6.0,
                status: 'BACKLOG',
                createdAt: new Date(),
            },
        ],
    });

    console.log('✓ Sample tasks created');

    // Create IP agreements
    await prisma.ipAgreement.upsert({
        where: { userId: engineer.id },
        update: {},
        create: {
            userId: engineer.id,
            organizationId: org.id,
            documentType: 'PIIAA',
            status: 'SIGNED',
            signedDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
    });

    await prisma.ipAgreement.upsert({
        where: { userId: contractor.id },
        update: {},
        create: {
            userId: contractor.id,
            organizationId: org.id,
            documentType: 'CONTRACTOR_IP',
            status: 'PENDING', // Contractor hasn't signed yet
        },
    });

    console.log('✓ IP agreements created');

    // Create vesting grants
    const grantDate = new Date(now);
    grantDate.setFullYear(grantDate.getFullYear() - 1);
    grantDate.setMonth(grantDate.getMonth() + 1); // 11 months ago

    const cliffDate = new Date(grantDate);
    cliffDate.setFullYear(cliffDate.getFullYear() + 1);

    const vestingEnd = new Date(grantDate);
    vestingEnd.setFullYear(vestingEnd.getFullYear() + 4);

    const election83bDeadline = new Date(grantDate);
    election83bDeadline.setDate(election83bDeadline.getDate() + 30);

    await prisma.vestingGrant.upsert({
        where: { userId: engineer.id },
        update: {},
        create: {
            userId: engineer.id,
            organizationId: org.id,
            grantType: 'ISO',
            totalShares: 10000,
            vestedShares: 0,
            strikePrice: 0.10,
            grantDate,
            cliffDate,
            vestingEndDate: vestingEnd,
            election83bDeadline,
            is83bFiled: true,
            cliffApproved: false, // Cliff approval pending!
            status: 'ACTIVE',
        },
    });

    console.log('✓ Vesting grants created');

    // Create sample unit economics
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.dailyUnitEconomics.upsert({
        where: {
            organizationId_date: {
                organizationId: org.id,
                date: yesterday,
            },
        },
        update: {},
        create: {
            organizationId: org.id,
            date: yesterday,
            salesMarketingExpense: 10000,
            newCustomersAcquired: 5,
            cacValue: 2000,
            arpa: 500,
            grossMarginPercent: 0.70,
            churnRate: 0.03,
            ltvValue: 11667,
            ltvCacRatio: 5.83,
            cacPaybackMonths: 5.71,
            cashBalance: 250000,
            burnRate: 50000,
            runwayMonths: 5,
            growthRatePercent: 15,
            profitMarginPercent: 20,
            ruleOf40Score: 35,
        },
    });

    console.log('✓ Unit economics snapshot created');

    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                     🌱 SEED COMPLETE 🌱                            ║
╠═══════════════════════════════════════════════════════════════════╣
║  Organization: ${org.name.padEnd(47)}║
║  Users: 3 (Owner, Engineer, Contractor)                           ║
║  Pitches: 2 (1 completed, 1 active)                               ║
║  Tasks: 5                                                         ║
║                                                                   ║
║  Test Scenarios:                                                  ║
║  • Contractor IP Airlock: contractor@external.com (PENDING)       ║
║  • Cliff Alert: dev@acme.com cliff in ~30 days                    ║
║  • LTV:CAC Ratio: 5.83 (GREEN)                                    ║
║  • Rule of 40: 35 (NEEDS_ATTENTION)                               ║
╚═══════════════════════════════════════════════════════════════════╝
`);
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
