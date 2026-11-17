import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { Toast } from './components/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toast />
  </StrictMode>,
);
