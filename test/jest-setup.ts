// test/jest-setup.ts
import { TextEncoder, TextDecoder } from 'util';
// Force the application to use a completely isolated test database name
process.env.MONGO_URI = 'mongodb://localhost:27017/nest_app_test';
process.env.JWT_SECRET = 'super_secret_test_key_123';
// Inject Node's text encoders into the global scope so JSDOM doesn't hide them
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;