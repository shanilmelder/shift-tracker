import type { ExpoConfig } from 'expo/config';

// API_BASE_URL differs per EAS build profile / dev environment (see plan.md's Deployment
// Notes and eas.json's per-profile env). Falls back to a LAN-reachable localhost default
// for local `expo start` development.
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

const config: ExpoConfig = {
  name: 'Shift Tracker',
  slug: 'shift-tracker',
  scheme: 'shifttracker',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  plugins: ['expo-router', 'expo-location', 'expo-notifications', '@react-native-community/datetimepicker'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.shifttracker.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Shift Tracker checks your location only when you clock in or out, to confirm you're at your shift's assigned location.",
    },
  },
  android: {
    package: 'com.shifttracker.app',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  extra: {
    router: {
      origin: false,
    },
    apiBaseUrl: API_BASE_URL,
  },
};

export default config;
