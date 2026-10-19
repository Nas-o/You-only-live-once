import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yolo.ios',
  appName: '你只活一次',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#f3eee4',
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
