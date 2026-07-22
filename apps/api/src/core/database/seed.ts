import { UserRole } from '@food-delivery/types';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { db } from './index';
import { users } from './schema/users';

const PASSWORD = 'test1234567';
const SALT_ROUNDS = 10;

const seedUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  },
  {
    firstName: 'Customer',
    lastName: 'User',
    email: 'customer@example.com',
    role: UserRole.CUSTOMER,
  },
  {
    firstName: 'Owner',
    lastName: 'User',
    email: 'owner@example.com',
    role: UserRole.RESTAURANT_OWNER,
  },
  {
    firstName: 'Driver',
    lastName: 'User',
    email: 'driver@example.com',
    role: UserRole.DRIVER,
  },
];

async function main() {
  const password = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  for (const user of seedUsers) {
    await db
      .insert(users)
      .values({ ...user, password })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          password,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });

    console.log(`seeded ${user.role.padEnd(16)} -> ${user.email}`);
  }

  console.log(`\nAll seed users use the password: ${PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
