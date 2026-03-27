import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root');

if (container) {
  // Use a global key to persist the root across re-executions.
  const rootKey = '__HAKU_3D_REACT_ROOT__';
  let root = (window as any)[rootKey];
  
  if (root) {
    console.debug('main.tsx: Reusing existing React root from window');
  } else {
    // If we don't have the root object but the container is already "tainted" 
    // by a previous React initialization, createRoot will throw an error.
    // We detect this by checking for React-internal properties on the DOM node.
    const isTainted = Object.keys(container).some(k => k.startsWith('__reactContainer$'));
    
    if (isTainted) {
      console.debug('main.tsx: Container is tainted, replacing with a fresh node');
      const newContainer = container.cloneNode(false) as HTMLElement;
      container.parentNode?.replaceChild(newContainer, container);
      root = createRoot(newContainer);
    } else {
      console.debug('main.tsx: Creating new React root');
      root = createRoot(container);
    }
    
    (window as any)[rootKey] = root;
  }
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
