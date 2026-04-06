import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root') as any;

if (container) {
  // Store the root on the container element itself to ensure it's only created once
  // even if the script environment is reset but the DOM is preserved.
  if (!container._reactRoot) {
    try {
      container._reactRoot = createRoot(container);
    } catch (e) {
      console.warn('createRoot failed, likely already initialized', e);
    }
  }
  
  const root = container._reactRoot;
  
  if (root) {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}
