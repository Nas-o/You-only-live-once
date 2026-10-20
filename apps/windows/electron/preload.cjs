/** 受控桥接层：渲染进程只能通过白名单 API 访问系统能力。 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yolo', {
  isDesktop: true,
  platform: process.platform,
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  dataPath: () => ipcRenderer.invoke('data:path'),
  exportData: (data) => ipcRenderer.invoke('data:export', data),
  importData: () => ipcRenderer.invoke('data:import'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  openDataFolder: () => ipcRenderer.invoke('app:open-data-folder'),
  quit: () => ipcRenderer.invoke('app:quit'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    install: (info) => ipcRenderer.invoke('update:install', info),
  },
  ai: {
    secureGetKey: () => ipcRenderer.invoke('ai:secure-get'),
    secureSetKey: (value) => ipcRenderer.invoke('ai:secure-set', value),
    secureDeleteKey: () => ipcRenderer.invoke('ai:secure-delete'),
    complete: (input) => ipcRenderer.invoke('ai:complete', input),
  },
  onPowerSuspend: (callback) => {
    ipcRenderer.on('power:suspend', (_event, payload) => {
      callback({
        at: typeof payload?.at === 'string' ? payload.at : new Date().toISOString(),
        reason: payload?.reason === 'lock-screen' ? 'lock-screen' : 'suspend',
      });
    });
  },
});
