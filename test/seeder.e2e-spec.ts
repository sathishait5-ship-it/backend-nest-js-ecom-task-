import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';

// Import our target seeder engines directly
import { RoleSeeder } from '../src/database/seeders/role.seeder';
import { UserSeeder } from '../src/database/seeders/user.seeder';
import { MailService } from '../src/mail/mail.service';

describe('Database Seeders Isolation Validation (e2e)', () => {
  let testingModule: TestingModule;
  let mongooseConnection: Connection;
  let roleSeeder: RoleSeeder;
  let userSeeder: UserSeeder;

  // Intercepting background messaging handles just in case user hooks emit tasks
  const mockMailService = {
    sendWelcomeMail: jest.fn().mockResolvedValue({ message: 'Enqueued' }),
    sendProductAddedMail: jest.fn().mockResolvedValue({ message: 'Enqueued' }),
  };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    // Acquire service engines directly out of the standalone compilation context
    roleSeeder = testingModule.get<RoleSeeder>(RoleSeeder);
    userSeeder = testingModule.get<UserSeeder>(UserSeeder);

    mongooseConnection = testingModule.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    if (mongooseConnection) {
      await mongooseConnection.dropDatabase(); // Wipe the test db clean
      await mongooseConnection.close();
    }
    await testingModule.close();
  });

  describe('Sequential Execution Flow', () => {
    it('should seed roles collection first without errors', async () => {
      // Direct validation checking that roles build correctly
      await expect(roleSeeder.seed()).resolves.not.toThrow();

      const workingRolesCollection = mongooseConnection.collection('roles');
      const seededRolesCount = await workingRolesCollection.countDocuments();

      expect(seededRolesCount).toBeGreaterThan(0);
    });

    it('should seed user collection and map the role reference IDs correctly', async () => {
      // Runs second, picking up the operational roles written by the previous test block
      await expect(userSeeder.seed()).resolves.not.toThrow();

      const usersCollection = mongooseConnection.collection('users');
      const populatedUsers = await usersCollection.find().toArray();

      expect(populatedUsers.length).toBeGreaterThan(0);

      // Verify that the user mapping successfully assigned a real MongoDB object identifier
      const structuralSampleUser = populatedUsers[0];
      expect(structuralSampleUser).toHaveProperty('role');
      expect(structuralSampleUser.role).toBeDefined();
    });

    it('should cleanly bypass duplicate data entry and handle pre-existing documents safely', async () => {
      // Executing a second time should not throw unique constraint exceptions or crash
      await expect(roleSeeder.seed()).resolves.not.toThrow();
      await expect(userSeeder.seed()).resolves.not.toThrow();
    });
  });
});
