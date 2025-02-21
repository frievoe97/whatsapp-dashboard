// React & ReactDOM & Helmet Provider
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom'; // Neu importieren
import { HelmetProvider } from 'react-helmet-async';

// App & Context
import App from './App';
import { ChatProvider } from './context/ChatContext';
import './index.css';

///////////////////// Global Providers Component //////////////////////

/**
 * Providers Component
 *
 * Wraps the application with global providers: BrowserRouter for Routing, HelmetProvider for SEO and
 * ChatProvider for state management.
 */
// eslint-disable-next-line react-refresh/only-export-components
const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HashRouter>
    <HelmetProvider>
      <ChatProvider>{children}</ChatProvider>
    </HelmetProvider>
  </HashRouter>
);

///////////////////// Root Element Setup //////////////////////

// Get the root element from the HTML. Throw an error if it's not found.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element not found. Ensure an element with id='root' exists in index.html");
}
const root = ReactDOM.createRoot(rootElement);

///////////////////// Application Entry Point //////////////////////

/**
 * Main Application Render
 *
 * Uses React 18's createRoot API to enable concurrent rendering.
 * The App component is wrapped with Providers and React.StrictMode
 * for extra runtime checks and better development practices.
 */
root.render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
