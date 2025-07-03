// Global setup for all Jest tests
const { TextEncoder, TextDecoder } = require('util');

// Ensure TextEncoder is available globally
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder; 