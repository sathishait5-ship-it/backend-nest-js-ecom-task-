import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { RoleSeeder } from '../src/database/seeders/role.seeder';
import { MailService } from '../src/mail/mail.service';

describe('Auth Session Lock Constraints (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;

  const testUser = {
    firstName: 'Session',
    lastName: 'Tester',
    email: `session_boss_${Date.now()}@gmail.com`,
    password: 'securePassword123',
    phone: '9876543210',
  };

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

    // Populate required 'customer' role
    const roleSeeder = moduleFixture.get<RoleSeeder>(RoleSeeder);
    await roleSeeder.seed();

    // Register our test subject
    await request(app.getHttpServer())
      .post('/api/users/register')
      .field('firstName', testUser.firstName)
      .field('lastName', testUser.lastName)
      .field('email', testUser.email)
      .field('password', testUser.password)
      .field('phone', testUser.phone)
      .attach('image', Buffer.from('img'), 'test.png');
  });

  afterAll(async () => {
    if (mongooseConnection) {
      await mongooseConnection.dropDatabase();
      await mongooseConnection.close();
    }
    await app.close();
  });

  describe('Single-Session Lock Verification', () => {
    let activeToken: string;

    it('should allow initial login and persist currentToken in database', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201);

      activeToken = response.body.token;
      expect(activeToken).toBeDefined();
    });

    it('should block concurrent login attempts while session is active', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(401); // Asserts your custom 'active session already exists' throw

      expect(response.body.message).toContain(
        'An active session already exists',
      );
    });

    it('should free the lock upon successful logout', async () => {
      // Hit logout endpoint with the current token attached
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${activeToken}`)
        .expect(201);

      // Verify the user can login cleanly again now that the token is nullified
      const reLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201);

      expect(reLoginResponse.body).toHaveProperty('token');
    });
  });
});
