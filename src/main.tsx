import {StrictMode} from 'react';
import {createRoot, Root} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootKey = '__HAKU_REACT_ROOT__';

function initializeRoot() {
  const container = document.getElementById('root');
  if (!container) return;

  // 1. Try to get existing root from window or container
  let root: Root | undefined = (window as any)[rootKey] || (container as any)[rootKey];

  // 2. Detect if the node is already a React root by checking internal properties
  // React 18+ attaches a property starting with __reactContainer to the DOM node
  const isReactOwned = Object.keys(container).some(key => key.startsWith('__reactContainer'));

  if (!root) {
    if (isReactOwned) {
      console.warn('React root already exists on container but reference is lost. Forcing recovery by replacing container...');
      const newContainer = container.cloneNode(false) as HTMLElement;
      container.parentNode?.replaceChild(newContainer, container);
      
      try {
        root = createRoot(newContainer);
        (window as any)[rootKey] = root;
        (newContainer as any)[rootKey] = root;
      } catch (innerError) {
        console.error('Recovery failed:', innerError);
      }
    } else {
      try {
        root = createRoot(container);
        (window as any)[rootKey] = root;
        (container as any)[rootKey] = root;
      } catch (e: any) {
        if (e.message?.includes('already been passed to createRoot')) {
          console.warn('Caught createRoot error. Attempting forced container replacement...');
          const newContainer = container.cloneNode(false) as HTMLElement;
          container.parentNode?.replaceChild(newContainer, container);
          
          try {
            root = createRoot(newContainer);
            (window as any)[rootKey] = root;
            (newContainer as any)[rootKey] = root;
          } catch (innerError) {
            console.error('Forced recovery failed:', innerError);
          }
        } else {
          throw e;
        }
      }
    }
  }

  if (root) {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}

initializeRoot();
