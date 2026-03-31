import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root');

if (container) {
  const global = window as any;
  
  // Initialize a global WeakMap to store roots for DOM elements
  if (!global.__REACT_ROOT_MAP__) {
    global.__REACT_ROOT_MAP__ = new WeakMap();
  }
  
  let root = global.__REACT_ROOT_MAP__.get(container);
  
  if (!root) {
    try {
      root = createRoot(container);
      global.__REACT_ROOT_MAP__.set(container, root);
    } catch (e) {
      console.warn('Failed to create root, attempting to reuse existing one if possible', e);
      // If createRoot fails, it's likely already created. 
      // We try to fallback to a global property if the WeakMap failed us.
      root = global.__REACT_ROOT__;
    }
  }
  
  // Also store in a simple global for extra redundancy
  global.__REACT_ROOT__ = root;

  if (root) {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}
