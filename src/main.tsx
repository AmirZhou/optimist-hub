import React from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex, hasBackend } from "./convex";
import { App } from "./App";
import "./styles.css";

// Theme before first paint to avoid a flash.
const saved = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
if (saved === "dark" || (saved === null && prefersDark)) {
  document.documentElement.dataset.theme = "dark";
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    {hasBackend ? (
      <ConvexAuthProvider client={convex!}>
        <App />
      </ConvexAuthProvider>
    ) : (
      <div className="setup-screen">
        <div className="card setup-card">
          <h1>Not connected to Convex</h1>
          <p>
            This app needs a Convex deployment URL. Run{" "}
            <code>npx convex dev</code> in the project root — it writes{" "}
            <code>VITE_CONVEX_URL</code> to <code>.env.local</code> — then
            restart <code>npm run dev</code>.
          </p>
        </div>
      </div>
    )}
  </React.StrictMode>,
);
