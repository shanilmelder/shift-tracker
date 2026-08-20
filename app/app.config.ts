import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

// API_BASE_URL differs per EAS build profile / dev environment (see plan.md's Deployment
// Notes and eas.json's per-profile env). Falls back to a LAN-reachable localhost default
// for local `expo start` development.
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

const config: ExpoConfig = {
  ...(appJson.expo as ExpoConfig),
  extra: {
    ...(appJson.expo as ExpoConfig).extra,
    apiBaseUrl: API_BASE_URL,
  },
};

export default config;
