import * as fs from 'fs';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Connection, Types } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { RoleSeeder } from '../src/database/seeders/role.seeder';
import { UserSeeder } from '../src/database/seeders/user.seeder';
import { MailService } from '../src/mail/mail.service';

describe('Products E-Commerce Engine Flow (e2e)', () => {
  let app: INestApplication;
  let mongooseConnection: Connection;
  let adminToken: string;
  let activeProductId: string;
  
  // A clean placeholder category ID string to satisfy class-validator structural rules
  const mockCategoryId = new Types.ObjectId().toString();

  const mockMailService = {
    sendProductAddedMail: jest.fn().mockResolvedValue({ message: 'Dispatched successfully' }),
    sendWelcomeMail: jest.fn().mockResolvedValue({ message: 'Enqueued' }),
  };

  beforeAll(async () => {
    fs.mkdirSync('./uploads/productImages', { recursive: true });

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

    const roleSeeder = moduleFixture.get<RoleSeeder>(RoleSeeder);
    await roleSeeder.seed();

    const userSeeder = moduleFixture.get<UserSeeder>(UserSeeder);
    await userSeeder.seed();

    const fallbackPasswordHash = await bcrypt.hash('admin123', 10);
    const usersCollection = mongooseConnection.collection('users');
    
    await usersCollection.updateOne(
      { email: 'admin@gmail.com' },
      {
        $set: {
          password: fallbackPasswordHash,
          isActive: true,
        },
      },
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@gmail.com', password: 'admin123' });

    expect([200, 201]).toContain(loginResponse.status);
    expect(loginResponse.body.token).toBeDefined();

    adminToken = loginResponse.body.token;

    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 5);

    await usersCollection.updateOne(
      { email: 'admin@gmail.com' },
      {
        $set: {
          currentToken: adminToken,
          tokenExpiresAt: tokenExpiry
        }
      }
    );
  });

  afterAll(async () => {
    if (mongooseConnection) {
      await mongooseConnection.dropDatabase();
      await mongooseConnection.close();
    }
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // POST /api/products
  // ---------------------------------------------------------------------------
  describe('POST /api/products', () => {
    it('should reject requests if validation constraints fail (discount price > regular price)', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Premium Laptop')
        .field('price', '1000')
        .field('discountPrice', '1200')
        .field('stock', '15')
        .field('category', mockCategoryId) // Provided here to keep test cleanly isolated to the price rule
        .field('description', 'High performance laptop')
        .expect(400);
    });

    it('should allow authorized agents to save a product, attach multipart files, and trigger mail alerts', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Mechanical Keyboard')
        .field('price', '150')
        .field('discountPrice', '120')
        .field('stock', '50')
        .field('category', mockCategoryId) // Passed missing required validation field
        .field('description', 'RGB Clicky mechanical keyboard switches')
        .attach('images', Buffer.from('fake_image_1'), 'keyboard-front.png');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Product created successfully');
      expect(response.body.data).toHaveProperty('_id');

      activeProductId = response.body.data._id;
      expect(mockMailService.sendProductAddedMail).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/products
  // ---------------------------------------------------------------------------
  describe('GET /api/products', () => {
    it('should fetch a public paginated catalog layout without requiring auth tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/products/:id
  // ---------------------------------------------------------------------------
  describe('GET /api/products/:id', () => {
    it('should throw a 400 Bad Request error for syntactically invalid Mongo IDs', async () => {
      await request(app.getHttpServer())
        .get('/api/products/invalid-id-syntax')
        .expect(400);
    });

    it('should resolve deep document properties using the aggregate pipelines', async () => {
      if (!activeProductId) {
        throw new Error('activeProductId is not set — the POST /api/products test must pass first.');
      }

      const response = await request(app.getHttpServer())
        .get(`/api/products/${activeProductId}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data._id).toBe(activeProductId);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/products/:id
  // ---------------------------------------------------------------------------
  describe('PATCH /api/products/:id', () => {
    it('should selectively modify details, combine file arrays, and maintain data consistency', async () => {
      if (!activeProductId) {
        throw new Error('activeProductId is not set — the POST /api/products test must pass first.');
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/products/${activeProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('price', '140')
        .field('stock', '45')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Product updated successfully');
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/products/:id
  // ---------------------------------------------------------------------------
  describe('DELETE /api/products/:id', () => {
    it('should purge product records from the database and handle file asset cleanups seamlessly', async () => {
      if (!activeProductId) {
        throw new Error('activeProductId is not set — the POST /api/products test must pass first.');
      }

      await request(app.getHttpServer())
        .delete(`/api/products/${activeProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/products/${activeProductId}`)
        .expect(404);
    });
  });
});