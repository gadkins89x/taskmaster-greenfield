import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // =============================================================================
  // PERMISSIONS
  // =============================================================================
  console.log('Creating permissions...');

  const permissionData = [
    // Work Orders
    { resource: 'work_orders', action: 'create', description: 'Create new work orders' },
    { resource: 'work_orders', action: 'read', description: 'View assigned work orders' },
    { resource: 'work_orders', action: 'read_all', description: 'View all work orders' },
    { resource: 'work_orders', action: 'update', description: 'Update work orders' },
    { resource: 'work_orders', action: 'delete', description: 'Delete work orders' },
    { resource: 'work_orders', action: 'assign', description: 'Assign work orders to users' },

    // Assets
    { resource: 'assets', action: 'create', description: 'Create new assets' },
    { resource: 'assets', action: 'read', description: 'View assets' },
    { resource: 'assets', action: 'update', description: 'Update assets' },
    { resource: 'assets', action: 'delete', description: 'Delete assets' },

    // Locations
    { resource: 'locations', action: 'create', description: 'Create new locations' },
    { resource: 'locations', action: 'read', description: 'View locations' },
    { resource: 'locations', action: 'update', description: 'Update locations' },
    { resource: 'locations', action: 'delete', description: 'Delete locations' },

    // Inventory
    { resource: 'inventory', action: 'create', description: 'Create inventory items' },
    { resource: 'inventory', action: 'read', description: 'View inventory' },
    { resource: 'inventory', action: 'update', description: 'Update inventory items' },
    { resource: 'inventory', action: 'delete', description: 'Delete inventory items' },
    { resource: 'inventory', action: 'issue', description: 'Issue stock from inventory' },
    { resource: 'inventory', action: 'receive', description: 'Receive stock into inventory' },
    { resource: 'inventory', action: 'adjust', description: 'Adjust inventory stock counts' },

    // Scheduling
    { resource: 'schedules', action: 'create', description: 'Create maintenance schedules' },
    { resource: 'schedules', action: 'read', description: 'View maintenance schedules' },
    { resource: 'schedules', action: 'update', description: 'Update maintenance schedules' },
    { resource: 'schedules', action: 'delete', description: 'Delete maintenance schedules' },
    { resource: 'schedules', action: 'generate', description: 'Manually generate work orders from schedules' },

    // Users
    { resource: 'users', action: 'read', description: 'View users' },
    { resource: 'users', action: 'manage', description: 'Create, update, delete users' },

    // Roles
    { resource: 'roles', action: 'read', description: 'View roles' },
    { resource: 'roles', action: 'manage', description: 'Create, update, delete roles' },

    // Settings
    { resource: 'settings', action: 'manage', description: 'Manage tenant settings' },
  ];

  for (const perm of permissionData) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  console.log(`  ✓ Created ${allPermissions.length} permissions`);

  // =============================================================================
  // DEMO TENANT
  // =============================================================================
  console.log('Creating demo tenant...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        workOrderPrefix: 'WO',
      },
      isActive: true,
    },
  });

  console.log(`  ✓ Created tenant: ${tenant.name}`);

  // =============================================================================
  // DEFAULT ROLES
  // =============================================================================
  console.log('Creating default roles...');

  // Admin role - all permissions
  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Full system access',
      isSystem: true,
    },
  });

  // Assign all permissions to admin
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Supervisor role
  const supervisorPermissions = allPermissions.filter((p) =>
    ['work_orders', 'assets', 'locations', 'inventory', 'users'].includes(p.resource) &&
    !['delete', 'manage'].includes(p.action)
  );
  supervisorPermissions.push(...allPermissions.filter(p =>
    p.resource === 'work_orders' && p.action === 'assign'
  ));

  const supervisorRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Supervisor' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Supervisor',
      description: 'Team lead with elevated permissions',
      isSystem: true,
    },
  });

  for (const perm of supervisorPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: supervisorRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: supervisorRole.id, permissionId: perm.id },
    });
  }

  // Technician role
  const technicianPermissions = allPermissions.filter((p) =>
    (p.resource === 'work_orders' && ['read', 'update'].includes(p.action)) ||
    (p.resource === 'assets' && p.action === 'read') ||
    (p.resource === 'locations' && p.action === 'read') ||
    (p.resource === 'inventory' && ['read', 'issue'].includes(p.action))
  );

  const technicianRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Technician' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Technician',
      description: 'Field maintenance staff',
      isSystem: true,
    },
  });

  for (const perm of technicianPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: technicianRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: technicianRole.id, permissionId: perm.id },
    });
  }

  // Requester role
  const requesterPermissions = allPermissions.filter((p) =>
    p.resource === 'work_orders' && ['create', 'read'].includes(p.action)
  );

  const requesterRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Requester' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Requester',
      description: 'Can submit and track work requests',
      isSystem: true,
    },
  });

  for (const perm of requesterPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: requesterRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: requesterRole.id, permissionId: perm.id },
    });
  }

  console.log('  ✓ Created 4 default roles');

  // =============================================================================
  // DEMO USERS
  // =============================================================================
  console.log('Creating demo users...');

  const passwordHash = await argon2.hash('password123');

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Technician user
  const techUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'tech@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'tech@demo.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Technician',
      phone: '+1-555-0101',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: techUser.id, roleId: technicianRole.id } },
    update: {},
    create: { userId: techUser.id, roleId: technicianRole.id },
  });

  console.log('  ✓ Created 2 demo users');
  console.log('    - admin@demo.com / password123');
  console.log('    - tech@demo.com / password123');

  // =============================================================================
  // DEMO LOCATIONS
  // =============================================================================
  console.log('Creating demo locations...');

  const mainCampus = await prisma.location.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MC' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Main Campus',
      code: 'MC',
      type: 'site',
      address: '123 Main Street, Anytown, USA 12345',
      isActive: true,
    },
  });

  const buildingA = await prisma.location.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MC-A' } },
    update: {},
    create: {
      tenantId: tenant.id,
      parentId: mainCampus.id,
      name: 'Building A',
      code: 'MC-A',
      type: 'building',
      isActive: true,
    },
  });

  const floor1 = await prisma.location.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MC-A-1' } },
    update: {},
    create: {
      tenantId: tenant.id,
      parentId: buildingA.id,
      name: 'Floor 1',
      code: 'MC-A-1',
      type: 'floor',
      isActive: true,
    },
  });

  const floor2 = await prisma.location.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MC-A-2' } },
    update: {},
    create: {
      tenantId: tenant.id,
      parentId: buildingA.id,
      name: 'Floor 2',
      code: 'MC-A-2',
      type: 'floor',
      isActive: true,
    },
  });

  console.log('  ✓ Created 4 demo locations');

  // =============================================================================
  // DEMO ASSETS
  // =============================================================================
  console.log('Creating demo assets...');

  const hvacUnit = await prisma.asset.upsert({
    where: { tenantId_assetTag: { tenantId: tenant.id, assetTag: 'HVAC-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      locationId: floor1.id,
      name: 'HVAC Unit #1',
      assetTag: 'HVAC-001',
      serialNumber: 'HV-2024-12345',
      manufacturer: 'Carrier',
      model: 'Infinity 21',
      category: 'HVAC',
      status: 'operational',
      purchaseDate: new Date('2022-06-15'),
      warrantyExpires: new Date('2027-06-15'),
      specifications: {
        btu: 60000,
        refrigerant: 'R-410A',
        voltage: '240V',
      },
    },
  });

  const elevator = await prisma.asset.upsert({
    where: { tenantId_assetTag: { tenantId: tenant.id, assetTag: 'ELEV-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      locationId: buildingA.id,
      name: 'Elevator #1',
      assetTag: 'ELEV-001',
      serialNumber: 'EL-2023-98765',
      manufacturer: 'Otis',
      model: 'Gen2',
      category: 'Elevator',
      status: 'operational',
      purchaseDate: new Date('2023-01-10'),
      warrantyExpires: new Date('2028-01-10'),
      specifications: {
        capacity: '2500 lbs',
        floors: 5,
        speed: '500 fpm',
      },
    },
  });

  console.log('  ✓ Created 2 demo assets');

  // =============================================================================
  // DEMO WORK ORDERS
  // =============================================================================
  console.log('Creating demo work orders...');

  await prisma.workOrder.upsert({
    where: { tenantId_workOrderNumber: { tenantId: tenant.id, workOrderNumber: 'WO-2024-0001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      workOrderNumber: 'WO-2024-0001',
      title: 'HVAC not cooling properly',
      description: 'Unit on floor 1 is blowing warm air. Needs inspection and potential refrigerant recharge.',
      type: 'reactive',
      priority: 'high',
      status: 'open',
      assetId: hvacUnit.id,
      locationId: floor1.id,
      createdById: adminUser.id,
      assignedToId: techUser.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      estimatedHours: 2,
      steps: {
        create: [
          { tenantId: tenant.id, stepOrder: 1, title: 'Check thermostat settings', isRequired: true },
          { tenantId: tenant.id, stepOrder: 2, title: 'Inspect air filters', isRequired: true },
          { tenantId: tenant.id, stepOrder: 3, title: 'Check refrigerant levels', isRequired: true },
          { tenantId: tenant.id, stepOrder: 4, title: 'Test cooling output', isRequired: true },
          { tenantId: tenant.id, stepOrder: 5, title: 'Document findings', isRequired: false },
        ],
      },
    },
  });

  await prisma.workOrder.upsert({
    where: { tenantId_workOrderNumber: { tenantId: tenant.id, workOrderNumber: 'WO-2024-0002' } },
    update: {},
    create: {
      tenantId: tenant.id,
      workOrderNumber: 'WO-2024-0002',
      title: 'Elevator monthly inspection',
      description: 'Perform routine monthly inspection and safety checks.',
      type: 'preventive',
      priority: 'medium',
      status: 'open',
      assetId: elevator.id,
      locationId: buildingA.id,
      createdById: adminUser.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      estimatedHours: 3,
      steps: {
        create: [
          { tenantId: tenant.id, stepOrder: 1, title: 'Visual inspection of cab', isRequired: true },
          { tenantId: tenant.id, stepOrder: 2, title: 'Check door operations', isRequired: true },
          { tenantId: tenant.id, stepOrder: 3, title: 'Test emergency phone', isRequired: true },
          { tenantId: tenant.id, stepOrder: 4, title: 'Inspect cables and pulleys', isRequired: true },
          { tenantId: tenant.id, stepOrder: 5, title: 'Lubricate moving parts', isRequired: true },
          { tenantId: tenant.id, stepOrder: 6, title: 'Complete inspection checklist', isRequired: true },
        ],
      },
    },
  });

  console.log('  ✓ Created 2 demo work orders');

  // =============================================================================
  // DEMO INVENTORY ITEMS
  // =============================================================================
  console.log('Creating demo inventory items...');

  await prisma.inventoryItem.upsert({
    where: { tenantId_itemNumber: { tenantId: tenant.id, itemNumber: 'INV-000001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      itemNumber: 'INV-000001',
      name: 'Oil Filter XL-100',
      description: 'Heavy duty oil filter for industrial machinery',
      category: 'Filters',
      unit: 'each',
      currentStock: 45,
      minimumStock: 10,
      reorderPoint: 20,
      reorderQuantity: 50,
      unitCost: 15.99,
      manufacturer: 'FilterCo',
      partNumber: 'FC-XL100',
      barcode: '1234567890123',
      locationId: floor1.id,
      isActive: true,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { tenantId_itemNumber: { tenantId: tenant.id, itemNumber: 'INV-000002' } },
    update: {},
    create: {
      tenantId: tenant.id,
      itemNumber: 'INV-000002',
      name: 'R-410A Refrigerant',
      description: 'Refrigerant for HVAC systems',
      category: 'HVAC Supplies',
      unit: 'lb',
      currentStock: 25,
      minimumStock: 5,
      reorderPoint: 10,
      reorderQuantity: 25,
      unitCost: 45.00,
      manufacturer: 'CoolGas Inc',
      partNumber: 'CG-R410A-25',
      barcode: '9876543210123',
      locationId: floor1.id,
      isActive: true,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { tenantId_itemNumber: { tenantId: tenant.id, itemNumber: 'INV-000003' } },
    update: {},
    create: {
      tenantId: tenant.id,
      itemNumber: 'INV-000003',
      name: 'LED Light Bulb 60W',
      description: '60W equivalent LED bulb, warm white',
      category: 'Electrical',
      unit: 'each',
      currentStock: 120,
      minimumStock: 20,
      reorderPoint: 40,
      reorderQuantity: 100,
      unitCost: 4.99,
      manufacturer: 'BrightLight',
      partNumber: 'BL-LED60W',
      barcode: '5551234567890',
      locationId: floor1.id,
      isActive: true,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { tenantId_itemNumber: { tenantId: tenant.id, itemNumber: 'INV-000004' } },
    update: {},
    create: {
      tenantId: tenant.id,
      itemNumber: 'INV-000004',
      name: 'Elevator Cable Lubricant',
      description: 'Special lubricant for elevator cables and pulleys',
      category: 'Elevator Supplies',
      unit: 'gallon',
      currentStock: 3,
      minimumStock: 2,
      reorderPoint: 2,
      reorderQuantity: 5,
      unitCost: 89.99,
      manufacturer: 'Otis',
      partNumber: 'OT-LUB-GAL',
      barcode: '7778889990001',
      locationId: buildingA.id,
      isActive: true,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { tenantId_itemNumber: { tenantId: tenant.id, itemNumber: 'INV-000005' } },
    update: {},
    create: {
      tenantId: tenant.id,
      itemNumber: 'INV-000005',
      name: 'Air Filter 20x25x1',
      description: 'Standard HVAC air filter',
      category: 'Filters',
      unit: 'each',
      currentStock: 8,
      minimumStock: 10,
      reorderPoint: 15,
      reorderQuantity: 30,
      unitCost: 7.50,
      manufacturer: 'FilterCo',
      partNumber: 'FC-AF20251',
      barcode: '3334445556667',
      locationId: floor1.id,
      isActive: true,
    },
  });

  console.log('  ✓ Created 5 demo inventory items');

  // =============================================================================
  // DEMO MAINTENANCE SCHEDULES
  // =============================================================================
  console.log('Creating demo maintenance schedules...');

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);

  await prisma.maintenanceSchedule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: tenant.id,
      name: 'Monthly HVAC Filter Replacement',
      description: 'Replace air filters in all HVAC units monthly',
      assetId: hvacUnit.id,
      locationId: floor1.id,
      priority: 'medium',
      estimatedHours: 1,
      assignedToId: techUser.id,
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 15,
      startDate: new Date('2024-01-01'),
      leadTimeDays: 7,
      workOrderTitle: 'HVAC Filter Replacement',
      workOrderType: 'preventive',
      isActive: true,
      nextDueDate: nextMonth,
      steps: {
        create: [
          { stepOrder: 1, title: 'Turn off HVAC unit', isRequired: true },
          { stepOrder: 2, title: 'Remove old filter', isRequired: true },
          { stepOrder: 3, title: 'Inspect filter housing', isRequired: false },
          { stepOrder: 4, title: 'Install new filter', isRequired: true },
          { stepOrder: 5, title: 'Turn on unit and verify operation', isRequired: true },
        ],
      },
    },
  });

  const quarterlyDate = new Date();
  quarterlyDate.setMonth(quarterlyDate.getMonth() + 3);
  quarterlyDate.setDate(1);

  await prisma.maintenanceSchedule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tenantId: tenant.id,
      name: 'Quarterly Elevator Inspection',
      description: 'Comprehensive quarterly safety inspection of elevator systems',
      assetId: elevator.id,
      locationId: buildingA.id,
      priority: 'high',
      estimatedHours: 4,
      assignedToId: techUser.id,
      frequency: 'quarterly',
      interval: 1,
      dayOfMonth: 1,
      startDate: new Date('2024-01-01'),
      leadTimeDays: 14,
      workOrderTitle: 'Quarterly Elevator Safety Inspection',
      workOrderType: 'preventive',
      isActive: true,
      nextDueDate: quarterlyDate,
      steps: {
        create: [
          { stepOrder: 1, title: 'Visual inspection of cab interior', isRequired: true },
          { stepOrder: 2, title: 'Test emergency stop button', isRequired: true },
          { stepOrder: 3, title: 'Test emergency phone/alarm', isRequired: true },
          { stepOrder: 4, title: 'Inspect door operations and safety sensors', isRequired: true },
          { stepOrder: 5, title: 'Check leveling at each floor', isRequired: true },
          { stepOrder: 6, title: 'Inspect machine room', isRequired: true },
          { stepOrder: 7, title: 'Check cables and pulleys', isRequired: true },
          { stepOrder: 8, title: 'Lubricate as needed', isRequired: true },
          { stepOrder: 9, title: 'Complete inspection checklist', isRequired: true },
        ],
      },
    },
  });

  console.log('  ✓ Created 2 demo maintenance schedules');

  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
