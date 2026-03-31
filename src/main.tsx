import {StrictMode} from 'react';
import {createRoot, Root} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootKey = '__HAKU_REACT_ROOT__';

function initialize() {
  const container = document.getElementById('root');
  if (!container) return;

  let root: Root;
  
  // Try to get the existing root from the window object
  if ((window as any)[rootKey]) {
    root = (window as any)[rootKey];
  } else {
    // Check if the container is already managed by React
    // React 18+ attaches internal properties to the container
    const isReactManaged = [
      ...Object.getOwnPropertyNames(container),
      ...Object.getOwnPropertySymbols(container).map(s => s.toString())
    ].some(key => 
      key.includes('__reactContainer') || 
      key.includes('__reactRootContainer')
    );

    if (isReactManaged) {
      // If it's already managed but we don't have the root reference,
      // the safest way to "reset" is to replace the container element entirely.
      const newContainer = document.createElement('div');
      newContainer.id = 'root';
      if (container.className) newContainer.className = container.className;
      
      container.parentNode?.replaceChild(newContainer, container);
      root = createRoot(newContainer);
    } else {
      root = createRoot(container);
    }
    
    // Store the root reference on the window object for future re-initializations
    (window as any)[rootKey] = root;
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

initialize();
