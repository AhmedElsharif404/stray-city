import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import 'leaflet/dist/leaflet.css';
import './styles.css';
import { App } from './App';
import { StrayCityProvider } from './lib/stray-city-context';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StrayCityProvider>
        <App />
      </StrayCityProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
