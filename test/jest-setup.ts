// test/jest-setup.ts
import { TextEncoder, TextDecoder } from 'util';

// Inject Node's text encoders into the global scope so JSDOM doesn't hide them
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;