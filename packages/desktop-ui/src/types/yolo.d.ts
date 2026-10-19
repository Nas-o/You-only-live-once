interface YoloAppInfo {
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  dataPath: string;
  configDir: string;
  demo: boolean;
  isDev: boolean;
}

interface YoloLoadResult {
  ok: boolean;
  data: unknown;
  path: string;
  recoveredFromBackup?: boolean;
  error?: string;
}

interface YoloExportResult {
  ok: boolean;
  canceled?: boolean;
  path?: string;
  error?: string;
}

interface YoloImportResult {
  ok: boolean;
  canceled?: boolean;
  data?: unknown;
  path?: string;
  error?: string;
}

interface YoloAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface YoloAiCompleteInput {
  endpoint: string;
  model: string;
  messages: YoloAiMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

interface YoloAiCompleteResult {
  ok: boolean;
  status?: number;
  content?: string;
  error?: string;
}

interface YoloAiKeyResult {
  ok: boolean;
  value?: string | null;
  secure: boolean;
  error?: string;
}

interface YoloAiBridge {
  secureGetKey: () => Promise<YoloAiKeyResult>;
  secureSetKey: (value: string) => Promise<{ ok: boolean; secure: boolean; error?: string }>;
  secureDeleteKey: () => Promise<{ ok: boolean; secure: boolean; error?: string }>;
  complete: (input: YoloAiCompleteInput) => Promise<YoloAiCompleteResult>;
}

interface YoloBridge {
  ai?: YoloAiBridge;
  isDesktop: boolean;
  platform: string;
  loadData: () => Promise<YoloLoadResult>;
  saveData: (data: unknown) => Promise<{ ok: boolean; path?: string; savedAt?: string; error?: string }>;
  dataPath: () => Promise<string>;
  exportData: (data: unknown) => Promise<YoloExportResult>;
  importData: () => Promise<YoloImportResult>;
  appInfo: () => Promise<YoloAppInfo>;
  openExternal: (url: string) => Promise<{ ok: boolean }>;
  openDataFolder: () => Promise<{ ok: boolean }>;
  quit: () => Promise<{ ok: boolean }>;
  minimize: () => Promise<{ ok: boolean }>;
  onPowerSuspend: (
    callback: (payload: { at: string; reason: 'suspend' | 'lock-screen' }) => void,
  ) => void;
}

interface Window {
  yolo?: YoloBridge;
}
