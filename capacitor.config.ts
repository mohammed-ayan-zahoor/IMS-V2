import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.imsv2.app',
  appName: 'IMS',
  webDir: 'public',
  server: {
    url: 'https://imsportal.3ftech.in',
    androidScheme: 'https'
  }
};

export default config;
