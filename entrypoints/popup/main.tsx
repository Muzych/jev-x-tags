import React from 'react';
import ReactDOM from 'react-dom/client';
import { ExtensionApp } from '@/components/ExtensionApp';
import '@/components/settings.css';

document.documentElement.style.background = '#0b0f14';
document.body.style.margin = '0';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ExtensionApp variant="popup" />
  </React.StrictMode>,
);
