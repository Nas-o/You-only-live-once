import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, applyCachedLanguage, applyCachedTheme } from '@yolo/desktop-ui';

applyCachedTheme();
applyCachedLanguage();

const container = document.getElementById('root');
if (!container) throw new Error('找不到 #root 挂载点');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
