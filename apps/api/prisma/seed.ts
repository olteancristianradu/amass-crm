import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── TENANT ───
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'amass-romania' },
    update: {},
    create: {
      name: 'AMASS Romania',
      slug: 'amass-romania',
      plan: 'pro',
      settings: {
        accentColor: '#C8102E',
        accentDark: '#9B0D23',
        defaultLanguage: 'ro',
        roundRobinIndex: 0,
      },
    },
  });
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // ─── USERS ───
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const adminPin = await bcrypt.hash('1234', 10);
  const sellerPin = await bcrypt.hash('0000', 10);
  const managerPin = await bcrypt.hash('5678', 10);

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@amass.ro' } },
    update: { passwordHash, pinHash: adminPin },
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      email: 'admin@amass.ro',
      pinHash: adminPin,
      passwordHash,
      role: 'ADMIN',
      avatar: '\uD83D\uDC51',
    },
  });
  console.log(`Admin: ${admin.name} (${admin.id}) - PIN: 1234 / Password: Admin123!`);

  const manager = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'manager@amass.ro' } },
    update: { passwordHash: await bcrypt.hash('Manager123!', 10), pinHash: managerPin },
    create: {
      tenantId: tenant.id,
      name: 'Manager Demo',
      email: 'manager@amass.ro',
      pinHash: managerPin,
      passwordHash: await bcrypt.hash('Manager123!', 10),
      role: 'MANAGER',
      avatar: '\uD83D\uDCBC',
    },
  });
  console.log(`Manager: ${manager.name} (${manager.id}) - PIN: 5678`);

  const seller = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'agent@amass.ro' } },
    update: { passwordHash: await bcrypt.hash('Agent123!', 10), pinHash: sellerPin },
    create: {
      tenantId: tenant.id,
      name: 'Agent Demo',
      email: 'agent@amass.ro',
      pinHash: sellerPin,
      passwordHash: await bcrypt.hash('Agent123!', 10),
      role: 'SELLER',
      avatar: '\uD83D\uDE80',
    },
  });
  console.log(`Seller: ${seller.name} (${seller.id}) - PIN: 0000`);

  const seller2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'agent2@amass.ro' } },
    update: { passwordHash: await bcrypt.hash('Agent123!', 10), pinHash: sellerPin },
    create: {
      tenantId: tenant.id,
      name: 'Maria Agent',
      email: 'agent2@amass.ro',
      pinHash: sellerPin,
      passwordHash: await bcrypt.hash('Agent123!', 10),
      role: 'SELLER',
      avatar: '\uD83C\uDF1F',
    },
  });
  console.log(`Seller2: ${seller2.name} (${seller2.id})`);

  // ─── DEFAULT PIPELINE ───
  let defaultPipeline = await prisma.pipeline.findFirst({ where: { tenantId: tenant.id, isDefault: true } });
  if (!defaultPipeline) {
    defaultPipeline = await prisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: 'Sales Pipeline',
        isDefault: true,
        stages: {
          create: [
            { name: 'Lead Nou', sortOrder: 0, probability: 10, color: '#6B7280' },
            { name: 'Calificat', sortOrder: 1, probability: 25, color: '#3B82F6' },
            { name: 'Propunere', sortOrder: 2, probability: 50, color: '#8B5CF6' },
            { name: 'Negociere', sortOrder: 3, probability: 75, color: '#F59E0B' },
            { name: 'Castigat', sortOrder: 4, probability: 100, color: '#10B981', isWon: true },
            { name: 'Pierdut', sortOrder: 5, probability: 0, color: '#EF4444', isLost: true },
          ],
        },
      },
      include: { stages: true },
    });
    console.log(`Pipeline: ${defaultPipeline.name} with ${defaultPipeline.stages.length} stages`);
  }

  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: defaultPipeline.id },
    orderBy: { sortOrder: 'asc' },
  });

  // ─── COMPANIES ───
  const companies = [
    { name: 'TechVision SRL', domain: 'techvision.ro', industry: 'IT', size: '11-50', city: 'Bucuresti', phone: '021-300-1234', email: 'office@techvision.ro' },
    { name: 'BuildPro SA', domain: 'buildpro.ro', industry: 'Constructii', size: '51-200', city: 'Cluj-Napoca', phone: '0264-500-567', email: 'contact@buildpro.ro' },
    { name: 'GreenEnergy SRL', domain: 'greenenergy.ro', industry: 'Energie', size: '1-10', city: 'Timisoara', phone: '0256-200-890', email: 'info@greenenergy.ro' },
    { name: 'MedPlus Clinica', domain: 'medplus.ro', industry: 'Sanatate', size: '51-200', city: 'Iasi', phone: '0232-100-456', email: 'receptie@medplus.ro' },
    { name: 'AgroFarm SRL', domain: 'agrofarm.ro', industry: 'Agricultura', size: '11-50', city: 'Constanta', phone: '0241-600-789', email: 'office@agrofarm.ro' },
  ];

  const createdCompanies: Array<{ id: string; name: string }> = [];
  for (const c of companies) {
    const existing = await prisma.company.findFirst({ where: { tenantId: tenant.id, name: c.name } });
    if (!existing) {
      const co = await prisma.company.create({ data: { tenantId: tenant.id, ...c } });
      createdCompanies.push(co);
    } else {
      createdCompanies.push(existing);
    }
  }
  console.log(`Companies: ${createdCompanies.length} created`);

  // ─── CONTACTS ───
  const contacts = [
    { firstName: 'Ion', lastName: 'Popescu', email: 'ion.popescu@techvision.ro', phone: '0722123456', jobTitle: 'CEO', companyId: createdCompanies[0].id, source: 'website' },
    { firstName: 'Maria', lastName: 'Ionescu', email: 'maria.ionescu@buildpro.ro', phone: '0733456789', jobTitle: 'Director Achizitii', companyId: createdCompanies[1].id, source: 'referral' },
    { firstName: 'Andrei', lastName: 'Vasilescu', email: 'andrei@greenenergy.ro', phone: '0744789012', jobTitle: 'Fondator', companyId: createdCompanies[2].id, source: 'event' },
    { firstName: 'Elena', lastName: 'Dumitrescu', email: 'elena.d@medplus.ro', phone: '0755012345', jobTitle: 'Manager Operatiuni', companyId: createdCompanies[3].id, source: 'cold_call' },
    { firstName: 'Gheorghe', lastName: 'Marin', email: 'gheorghe@agrofarm.ro', phone: '0766345678', jobTitle: 'Director General', companyId: createdCompanies[4].id, source: 'website' },
    { firstName: 'Ana', lastName: 'Teodorescu', email: 'ana.t@techvision.ro', phone: '0777890123', jobTitle: 'CTO', companyId: createdCompanies[0].id, source: 'linkedin' },
    { firstName: 'Mihai', lastName: 'Popa', email: 'mihai.popa@gmail.com', phone: '0788012345', jobTitle: 'Consultant', source: 'website' },
    { firstName: 'Cristina', lastName: 'Stan', email: 'cristina.stan@yahoo.com', phone: '0799123456', jobTitle: 'Antreprenor', source: 'referral' },
  ];

  const createdContacts: Array<{ id: string; firstName: string; lastName: string }> = [];
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const existing = await prisma.contact.findFirst({ where: { tenantId: tenant.id, email: c.email } });
    if (!existing) {
      const ct = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          assignedToId: i % 2 === 0 ? seller.id : seller2.id,
          ...c,
        },
      });
      createdContacts.push(ct);
    } else {
      createdContacts.push(existing);
    }
  }
  console.log(`Contacts: ${createdContacts.length} created`);

  // ─── PRODUCTS ───
  const products = [
    { name: 'Pompa de caldura 12kW', sku: 'PC-12KW', unitPrice: 15000, description: 'Pompa de caldura aer-apa 12kW' },
    { name: 'Pompa de caldura 16kW', sku: 'PC-16KW', unitPrice: 22000, description: 'Pompa de caldura aer-apa 16kW' },
    { name: 'Panouri solare 10kW', sku: 'PS-10KW', unitPrice: 25000, description: 'Sistem fotovoltaic 10kW cu invertor' },
    { name: 'Instalare standard', sku: 'INST-STD', unitPrice: 3500, description: 'Manopera instalare standard' },
    { name: 'Mentenanta anuala', sku: 'MNT-AN', unitPrice: 800, description: 'Contract mentenanta anuala' },
  ];

  const createdProducts: Array<{ id: string }> = [];
  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { tenantId: tenant.id, sku: p.sku } });
    if (!existing) {
      const pr = await prisma.product.create({ data: { tenantId: tenant.id, ...p } });
      createdProducts.push(pr);
    } else {
      createdProducts.push(existing);
    }
  }
  console.log(`Products: ${createdProducts.length} created`);

  // ─── DEALS ───
  const dealData = [
    { title: 'Pompa caldura TechVision', value: 25000, stageIdx: 0, companyIdx: 0, contactIdx: 0, assignee: seller },
    { title: 'Sistem solar BuildPro', value: 45000, stageIdx: 1, companyIdx: 1, contactIdx: 1, assignee: seller2 },
    { title: 'Retrofit GreenEnergy', value: 18000, stageIdx: 2, companyIdx: 2, contactIdx: 2, assignee: seller },
    { title: 'Incalzire MedPlus', value: 65000, stageIdx: 3, companyIdx: 3, contactIdx: 3, assignee: seller2 },
    { title: 'Ferma solara AgroFarm', value: 120000, stageIdx: 4, companyIdx: 4, contactIdx: 4, assignee: seller },
    { title: 'Upgrade PC TechVision', value: 12000, stageIdx: 0, companyIdx: 0, contactIdx: 5, assignee: seller2 },
    { title: 'Consulta energetica Popa', value: 5000, stageIdx: 1, contactIdx: 6, assignee: seller },
    { title: 'Panouri Stan', value: 28000, stageIdx: 5, contactIdx: 7, assignee: seller, lost: true },
  ];

  for (const d of dealData) {
    const existing = await prisma.deal.findFirst({ where: { tenantId: tenant.id, title: d.title } });
    if (!existing) {
      const stage = stages[d.stageIdx];
      const expectedClose = new Date();
      expectedClose.setDate(expectedClose.getDate() + 30 + d.stageIdx * 15);

      const deal = await prisma.deal.create({
        data: {
          tenantId: tenant.id,
          pipelineId: defaultPipeline.id,
          stageId: stage.id,
          title: d.title,
          value: d.value,
          currency: 'RON',
          probability: stage.probability,
          expectedCloseDate: expectedClose,
          companyId: d.companyIdx !== undefined ? createdCompanies[d.companyIdx]?.id : undefined,
          assignedToId: d.assignee.id,
          source: 'seed',
          lostAt: d.lost ? new Date() : undefined,
          lossReason: d.lost ? 'Pret prea mare' : '',
        },
      });

      // Link contact to deal
      if (d.contactIdx !== undefined && createdContacts[d.contactIdx]) {
        await prisma.dealContact.create({
          data: { dealId: deal.id, contactId: createdContacts[d.contactIdx].id, role: 'primary' },
        });
      }

      // Add line items for some deals
      if (d.stageIdx >= 2 && createdProducts.length > 0) {
        await prisma.dealLineItem.create({
          data: {
            dealId: deal.id,
            productId: createdProducts[0].id,
            name: products[0].name,
            quantity: 1,
            unitPrice: products[0].unitPrice,
            total: products[0].unitPrice,
          },
        });
        await prisma.dealLineItem.create({
          data: {
            dealId: deal.id,
            productId: createdProducts[3].id,
            name: products[3].name,
            quantity: 1,
            unitPrice: products[3].unitPrice,
            total: products[3].unitPrice,
          },
        });
      }
    }
  }
  console.log(`Deals: ${dealData.length} created`);

  // ─── LEGACY CLIENTS (for solar pipeline) ───
  const sampleClients = [
    { name: 'Ion Popescu', phone: '0722123456', location: 'Bucuresti', area: '120', stage: 'T1' as const, currentSystem: ['CT gaz'] },
    { name: 'Maria Ionescu', phone: '0733456789', location: 'Cluj-Napoca', area: '95', stage: 'T2' as const, currentSystem: ['CT lemne'], hasSolarPanels: true },
    { name: 'Andrei Vasilescu', phone: '0744789012', location: 'Timisoara', area: '150', stage: 'T3' as const, currentSystem: ['Pompa caldura'] },
    { name: 'Elena Dumitrescu', phone: '0755012345', location: 'Iasi', area: '80', stage: 'CONTRACTED' as const, currentSystem: ['CT gaz'] },
    { name: 'Gheorghe Marin', phone: '0766345678', location: 'Constanta', area: '110', stage: 'LOST' as const, currentSystem: ['Sobe'], lossReason: 'Pret prea mare' },
  ];

  for (const c of sampleClients) {
    const existing = await prisma.client.findFirst({ where: { tenantId: tenant.id, phone: c.phone } });
    if (!existing) {
      await prisma.client.create({
        data: {
          tenantId: tenant.id,
          assignedToId: seller.id,
          name: c.name, phone: c.phone, location: c.location, area: c.area,
          stage: c.stage, currentSystem: c.currentSystem,
          hasSolarPanels: c.hasSolarPanels || false,
          lossReason: c.lossReason || '', source: 'seed',
        },
      });
    }
  }

  // ─── MESSAGE TEMPLATES ───
  const templates = [
    { key: 'T1', body: 'Buna ziua {nume}, va multumim ca ati completat formularul pe amass.ro. In scurt timp un consultant va va contacta.' },
    { key: 'T2', body: 'Buna ziua {nume}, revenind cu solutia tehnica pentru locuinta dvs. de {suprafata}.' },
    { key: 'T3', body: 'Buna ziua {nume}, am finalizat oferta. As vrea sa programam o discutie pentru variantele financiare.' },
    { key: 'followUp', body: 'Buna ziua {nume}, revin cu un mesaj scurt. Ati avut timp sa va ganditi la propunerea noastra?' },
  ];
  for (const tpl of templates) {
    await prisma.messageTemplate.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: tpl.key } },
      update: { body: tpl.body },
      create: { tenantId: tenant.id, key: tpl.key, body: tpl.body },
    });
  }

  // ─── TAGS ───
  const tags = [
    { name: 'VIP', color: '#F59E0B', entityType: 'contact' },
    { name: 'Hot Lead', color: '#EF4444', entityType: 'contact' },
    { name: 'Referral', color: '#8B5CF6', entityType: 'contact' },
    { name: 'Enterprise', color: '#3B82F6', entityType: 'company' },
    { name: 'SMB', color: '#10B981', entityType: 'company' },
    { name: 'Urgent', color: '#EF4444', entityType: 'deal' },
    { name: 'Strategic', color: '#6366F1', entityType: 'deal' },
  ];
  for (const t of tags) {
    await prisma.tag.upsert({
      where: { tenantId_name_entityType: { tenantId: tenant.id, name: t.name, entityType: t.entityType } },
      update: {},
      create: { tenantId: tenant.id, ...t },
    });
  }

  // ─── CUSTOM FIELD DEFINITIONS ───
  const customFields = [
    { entityType: 'contact', fieldName: 'linkedin_url', fieldLabel: 'LinkedIn URL', fieldType: 'url', sortOrder: 0 },
    { entityType: 'contact', fieldName: 'preferred_language', fieldLabel: 'Limba preferata', fieldType: 'dropdown', options: ['Romana', 'Engleza', 'Maghiara'], sortOrder: 1 },
    { entityType: 'company', fieldName: 'cui', fieldLabel: 'CUI', fieldType: 'text', sortOrder: 0 },
    { entityType: 'company', fieldName: 'nr_angajati', fieldLabel: 'Nr. angajati', fieldType: 'number', sortOrder: 1 },
    { entityType: 'deal', fieldName: 'contract_type', fieldLabel: 'Tip contract', fieldType: 'dropdown', options: ['Standard', 'Custom', 'Framework'], sortOrder: 0 },
  ];
  for (const cf of customFields) {
    const existing = await prisma.customFieldDefinition.findFirst({
      where: { tenantId: tenant.id, entityType: cf.entityType, fieldName: cf.fieldName },
    });
    if (!existing) {
      await prisma.customFieldDefinition.create({ data: { tenantId: tenant.id, ...cf } });
    }
  }

  // ─── SAMPLE ACTIVITIES ───
  const deals = await prisma.deal.findMany({ where: { tenantId: tenant.id }, take: 5 });
  for (const deal of deals) {
    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        userId: seller.id,
        dealId: deal.id,
        type: 'note',
        subject: 'Nota initiala',
        body: `Deal creat: ${deal.title}`,
      },
    });
  }

  // ─── SAMPLE TASKS ───
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);

  const sampleTasks = [
    { title: 'Follow-up cu TechVision', type: 'call', priority: 'high', dueDate: tomorrow, userId: seller.id, contactId: createdContacts[0]?.id, dealId: deals[0]?.id },
    { title: 'Trimite oferta BuildPro', type: 'email', priority: 'medium', dueDate: nextWeek, userId: seller2.id, contactId: createdContacts[1]?.id, dealId: deals[1]?.id },
    { title: 'Review contract GreenEnergy', type: 'todo', priority: 'urgent', dueDate: yesterday, userId: seller.id, dealId: deals[2]?.id },
    { title: 'Meeting MedPlus', type: 'meeting', priority: 'high', dueDate: tomorrow, userId: seller2.id, contactId: createdContacts[3]?.id },
    { title: 'Update CRM data', type: 'todo', priority: 'low', dueDate: nextWeek, userId: admin.id },
  ];

  for (const t of sampleTasks) {
    const existing = await prisma.task.findFirst({ where: { tenantId: tenant.id, title: t.title } });
    if (!existing) {
      await prisma.task.create({
        data: {
          tenantId: tenant.id,
          createdById: admin.id,
          ...t,
        },
      });
    }
  }

  // ─── SUBSCRIPTION ───
  const existingSub = await prisma.subscription.findFirst({ where: { tenantId: tenant.id } });
  if (!existingSub) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'pro',
        status: 'active',
        seats: 5,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  // ─── SAMPLE WORKFLOW ───
  const existingWf = await prisma.workflow.findFirst({ where: { tenantId: tenant.id } });
  if (!existingWf) {
    await prisma.workflow.create({
      data: {
        tenantId: tenant.id,
        name: 'Auto-assign new leads',
        description: 'Assigns new deals to agents in round-robin order',
        trigger: { type: 'deal_created', conditions: {} },
        actions: [
          { type: 'assign_user', config: { method: 'round_robin' }, delay: 0 },
          { type: 'create_task', config: { title: 'Contact new lead', type: 'call', priority: 'high', dueInHours: 2 }, delay: 0 },
        ],
        isActive: true,
      },
    });
  }

  console.log('\nSeed complete! Login credentials:');
  console.log('  Admin:   admin@amass.ro / PIN: 1234 / Password: Admin123!');
  console.log('  Manager: manager@amass.ro / PIN: 5678 / Password: Manager123!');
  console.log('  Agent 1: agent@amass.ro / PIN: 0000 / Password: Agent123!');
  console.log('  Agent 2: agent2@amass.ro / PIN: 0000 / Password: Agent123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
