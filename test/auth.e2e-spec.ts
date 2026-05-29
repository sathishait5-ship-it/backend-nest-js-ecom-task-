import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { RoleSeeder } from '../src/database/seeders/role.seeder';
import { MailService } from '../src/mail/mail.service';

describe('Authentication & User Flow (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;

  const uniqueId = Date.now();
  const testUser = {
    firstName: 'Integration',
    lastName: 'Tester',
    email: `tester_${uniqueId}@gmail.com`,
    password: 'securePassword123',
    phone: '1234567890',
  };

  // Completely neutralizes live Redis/Bull/SMTP mail processing loops
  const mockMailService = {
    sendWelcomeMail: jest
      .fn()
      .mockResolvedValue({ message: 'Welcome mail enqueued' }),
    sendProductAddedMail: jest
      .fn()
      .mockResolvedValue({ message: 'Notification enqueued' }),
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
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    mongooseConnection = app.get<Connection>(getConnectionToken());

    const roleSeeder = moduleFixture.get<RoleSeeder>(RoleSeeder);
    await roleSeeder.seed();
  });

  afterAll(async () => {
    if (mongooseConnection) {
      await mongooseConnection.dropDatabase();
      await mongooseConnection.close();
    }
    await app.close();
  });

  describe('User Registration via /api/users/register (POST)', () => {
    it('should successfully register a new user account profile with an image multipart attachment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users/register')
        .field('firstName', testUser.firstName)
        .field('lastName', testUser.lastName)
        .field('email', testUser.email)
        .field('password', testUser.password)
        .field('phone', testUser.phone)
        .attach('image', Buffer.from('fake_image_binary_data'), 'avatar.png')
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe(testUser.email);
    });

    it('should reject registration attempts with duplicate emails', async () => {
      await request(app.getHttpServer())
        .post('/api/users/register')
        .field('firstName', testUser.firstName)
        .field('lastName', testUser.lastName)
        .field('email', testUser.email)
        .field('password', testUser.password)
        .field('phone', testUser.phone)
        .attach('image', Buffer.from('fake_image_binary_data'), 'avatar.png')
        .expect(400);
    });
  });

  describe('Session Lifecycle via /api/auth/login (POST)', () => {
    it('should authenticate the newly registered user and return a valid session token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201); // ✅ Verified: NestJS returns 201 for POST operations

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body).toHaveProperty('user');
    });

    it('should block login requests with incorrect password combinations', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongPassword',
        })
        .expect(401);
    });
  });
});
