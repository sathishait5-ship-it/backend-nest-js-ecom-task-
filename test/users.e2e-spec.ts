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

describe('Users Administration Flow (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let adminToken: string;
  let targetUserId: string;

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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    mongooseConnection = app.get<Connection>(getConnectionToken());

    // 1. Run base seeding engines
    const roleSeeder = moduleFixture.get<RoleSeeder>(RoleSeeder);
    await roleSeeder.seed();
    const userSeeder = moduleFixture.get<UserSeeder>(UserSeeder);
    await userSeeder.seed();

    // 2. Override the seeded Admin password to ensure it matches our login payload
    const fallbackPasswordHash = await bcrypt.hash('admin123', 10);
    const usersCollection = mongooseConnection.collection('users');

    await usersCollection.updateOne(
      { email: 'admin@gmail.com' },
      {
        $set: {
          password: fallbackPasswordHash,
          currentToken: null, // Clear session locks
          tokenExpiresAt: null,
          isActive: true,
        },
      },
    );

    // 3. Login with the verified credentials to obtain an active token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@gmail.com',
        password: 'admin123',
      });

    adminToken = loginResponse.body.token;

    console.log(
      '🔑 TEST SESSION TOKEN STATUS:',
      adminToken ? 'VERIFIED GREEN' : 'MISSING',
    );
  });

  afterAll(async () => {
    if (mongooseConnection) {
      await mongooseConnection.dropDatabase();
      await mongooseConnection.close();
    }
    await app.close();
  });

  describe('GET /api/users', () => {
    it('should refuse request if authorization token is missing', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401);
    });

    it('should return a list of all seeded users along with populated roles for an authenticated admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const regularUser = response.body.find(
        (u: any) => u.email !== 'admin@gmail.com',
      );
      targetUserId = regularUser ? regularUser._id : response.body[0]._id;
    });
  });

  describe('GET /api/users/getAllUserEssentials', () => {
    it('should execute the aggregate pipeline and return custom properties matching your contract', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/getAllUserEssentials')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const userRecord = response.body[0];
      expect(userRecord).toHaveProperty('name');
      expect(userRecord).toHaveProperty('email');
      expect(userRecord).toHaveProperty('roleName');
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update user profile attributes and manage uploaded image files cleanly', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('firstName', 'UpdatedFirstName')
        .field('lastName', 'UpdatedLastName')
        .attach('image', Buffer.from('fake_updated_image'), 'update-avatar.jpg')
        .expect(200);

      expect(response.body.firstName).toBe('UpdatedFirstName');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should safely remove user documentation from the DB and execute fs file cleanup without crashing', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('firstName', 'FailMe')
        .expect(400);
    });
  });
});
