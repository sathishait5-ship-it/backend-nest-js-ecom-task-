// test/mocks/mongoose-bull.mock.ts

export const mockMongooseModelFactory = () => ({
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn().mockReturnThis(),
  findByIdAndDelete: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  save: jest.fn(),
  aggregate: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
});

export const mockQueueFactory = () => ({
  add: jest.fn(),
  process: jest.fn(),
  on: jest.fn(),
});

// ADD THIS EXPORT HERE:
export const mockConfigServiceFactory = () => ({
  get: jest.fn((key: string) => {
    const config = {
      JWT_SECRET: 'test_jwt_secret_key',
      MONGO_URI: 'mongodb://localhost:27017/backend-test',
    };
    return config[key];
  }),
});
