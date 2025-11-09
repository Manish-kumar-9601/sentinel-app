const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Fix platform resolution to prevent web modules from being imported on native
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper field resolution order for native platforms
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add support for additional asset types if needed
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'db', 'sqlite', 'sqlite3'
];

module.exports = config;