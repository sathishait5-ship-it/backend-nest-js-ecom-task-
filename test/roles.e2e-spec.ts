import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { RoleSeeder } from '../src/database/seeders/role.seeder';
import { UserSeeder } from '../src/database/seeders/user.seeder';
import { MailService } from '../src/mail/mail.service';

describe('Roles Access Management Flow (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let adminToken: string;

  const mockMailService = {
    sendWelcomeMail: jest.fn().mockResolvedValue({ message: 'Enqueued' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());

    // 1. Seed base system rules and user accounts
    const roleSeeder = moduleFixture.get<RoleSeeder>(RoleSeeder);
    await roleSeeder.seed();
    const userSeeder = moduleFixture.get<UserSeeder>(UserSeeder);
    await userSeeder.seed();

    // 2. Synchronize credentials to avoid password hashing mismatches
    const fallbackPasswordHash = await bcrypt.hash('admin123', 10);
    const usersCollection = mongooseConnection.collection('users');
    await usersCollection.updateOne(
      { email: 'admin@gmail.com' },
      { 
        $set: { 
          password: fallbackPasswordHash,
          currentToken: null,
          tokenExpiresAt: null,
          isActive: true
        } 
      }
    );

    // 3. Authenticate to secure a valid Bearer token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@gmail.com',
        password: 'admin123',
      });

    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (mongooseConnection) {
      await mongooseConnection.dropDatabase();
      await mongooseConnection.close();
    }
    await app.close();
  });

  describe('POST /api/roles', () => {
    it('should block role creation attempts when authorization headers are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/roles')
        .send({ name: 'moderator', permissions: ['edit-content'] })
        .expect(401);
    });

    it('should allow authorized administrators to register custom user access roles', async () => {
      const payload = {
        name: 'super-moderator',
        permissions: ['ban-users', 'view-logs'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(payload.name);
      expect(response.body.permissions).toEqual(expect.arrayContaining(payload.permissions));
    });
  });

  describe('GET /api/roles', () => {
    it('should return all operational platform security group listings for an authenticated agent', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Confirms the 4 seeded roles + our 1 newly created role exist
      expect(response.body.length).toBeGreaterThanOrEqual(5); 
      
      const roleNames = response.body.map((role: any) => role.name);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('super-moderator');
    });
  });
});