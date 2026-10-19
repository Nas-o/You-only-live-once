import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yolo.android',
  appName: '你只活一次',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f3eee4',
    // Android 15+ edge-to-edge：让 Capacitor 给 WebView 加系统栏/刘海 margin，
    // 避免顶栏压到状态栏和摄像头。
    adjustMarginsForEdgeToEdge: 'force',
  },
};

export default config;
