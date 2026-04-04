import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root');

if (container) {
  const global = window as any;
  
  // Use a global property to store the root to ensure it's only created once
  // even if this script is re-executed (e.g. during HMR or multiple loads)
  if (!global.__REACT_ROOT__) {
    try {
      global.__REACT_ROOT__ = createRoot(container);
    } catch (e) {
      console.warn('createRoot failed, likely already initialized', e);
    }
  }
  
  const root = global.__REACT_ROOT__;
  
  if (root) {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}
