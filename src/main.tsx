import {StrictMode} from 'react';
import {createRoot, Root} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootKey = '__HAKU_REACT_ROOT__';

function initialize() {
  const container = document.getElementById('root');
  if (!container) return;

  let root: Root;
  const existingRoot = (window as any)[rootKey];

  if (existingRoot) {
    root = existingRoot;
  } else {
    // If we don't have a reference to the root but the container is already owned by React,
    // we must replace the container to avoid the warning.
    const isReactOwned = Object.keys(container).some(key => key.startsWith('__reactContainer')) || 
                        (container as any)._reactRootContainer;
    
    if (isReactOwned) {
      const newContainer = container.cloneNode(false) as HTMLElement;
      container.parentNode?.replaceChild(newContainer, container);
      root = createRoot(newContainer);
      (window as any)[rootKey] = root;
    } else {
      root = createRoot(container);
      (window as any)[rootKey] = root;
    }
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

initialize();
