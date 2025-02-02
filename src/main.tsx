import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatProvider } from "./context/ChatContext";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";

/**
 * Main entry point of the application.
 * - Uses React 18's concurrent rendering with `createRoot`.
 * - Wraps the App component with necessary context providers.
 * - Enables strict mode for additional runtime checks.
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* Provides SEO and metadata management */}
    <HelmetProvider>
      {/* Global chat context provider */}
      <ChatProvider>
        <App />
      </ChatProvider>
    </HelmetProvider>
  </React.StrictMode>
);
