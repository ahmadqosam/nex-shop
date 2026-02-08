import 'reflect-metadata';
import * as argon2 from 'argon2';
import dataSource from './data-source';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

interface SeedUser {
  email: string;
  name: string;
  password: string;
  roles: Role[];
}

const seedUsers: SeedUser[] = [
  {
    email: 'admin@nex.shop',
    name: 'Admin User',
    password: 'Admin@123',
    roles: [Role.ADMIN, Role.USER],
  },
  {
    email: 'jane@example.com',
    name: 'Jane Doe',
    password: 'Test@1234',
    roles: [Role.USER],
  },
  {
    email: 'john@example.com',
    name: 'John Smith',
    password: 'Test@1234',
    roles: [Role.USER],
  },
];

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function seed() {
  console.log('');
  console.log(`  ${GREEN}Seeding auth-api database...${NC}`);
  console.log('');

  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);

  for (const seedUser of seedUsers) {
    const existing = await userRepo.findOneBy({ email: seedUser.email });

    if (existing) {
      console.log(`  ${YELLOW}Skip${NC}  ${seedUser.email} (already exists)`);
      continue;
    }

    const passwordHash = await hashPassword(seedUser.password);

    const user = userRepo.create({
      email: seedUser.email,
      name: seedUser.name,
      passwordHash,
      roles: seedUser.roles,
    });

    await userRepo.save(user);
    console.log(`  ${GREEN}Created${NC}  ${seedUser.email} [${seedUser.roles.join(', ')}]`);
  }

  await dataSource.destroy();

  console.log('');
  console.log(`  ${GREEN}Seed complete!${NC}`);
  console.log('');
  console.log('  Test accounts:');
  console.log('  ┌────────────────────────┬────────────┬──────────────┐');
  console.log('  │ Email                  │ Password   │ Roles        │');
  console.log('  ├────────────────────────┼────────────┼──────────────┤');
  for (const u of seedUsers) {
    const email = u.email.padEnd(22);
    const pass = u.password.padEnd(10);
    const roles = u.roles.join(', ').padEnd(12);
    console.log(`  │ ${email} │ ${pass} │ ${roles} │`);
  }
  console.log('  └────────────────────────┴────────────┴──────────────┘');
  console.log('');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
