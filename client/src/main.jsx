import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ClinicProvider } from './context/ClinicContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClinicProvider>
      <App />
    </ClinicProvider>
  </React.StrictMode>
);
