import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";

import App from "./App";
import { ChatProvider } from "./context/ChatContext";
import "./index.css";

/**
 * Wraps the application with necessary global providers.
 * This keeps the `index.tsx` clean and modular.
 */
const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HelmetProvider>
      <ChatProvider>{children}</ChatProvider>
    </HelmetProvider>
  );
};

// Ensure the root element exists before rendering
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "Root element not found. Make sure there is an element with id='root' in index.html"
  );
}

const root = ReactDOM.createRoot(rootElement);

/**
 * Main entry point of the application.
 * - Uses React 18's concurrent rendering with `createRoot`.
 * - Wraps the App component with necessary context providers.
 * - Enables strict mode for additional runtime checks.
 */
root.render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);
