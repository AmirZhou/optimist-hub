import { useState } from "react";
import { useHashRoute, ToastHost } from "./ui";
import { Home } from "./pages/Home";
import { StartInspection } from "./pages/StartInspection";
import { InspectionDetail } from "./pages/InspectionDetail";
import { PartPage } from "./pages/Part";
import { Reference } from "./pages/Reference";

export function App() {
  const [hash, navigate] = useHashRoute();
  const route = hash.replace(/^#/, "");

  const nav = (to: string, label: string) => {
    const path = to.replace(/^#/, "");
    const active =
      route === path || (path !== "/" && route.startsWith(path));
    return (
      <button
        key={to}
        className={`nav-link${active ? " active" : ""}`}
        onClick={() => navigate(to)}
      >
        {label}
      </button>
    );
  };

  let page: React.ReactNode;
  if (route === "/" || route === "") {
    page = <Home />;
  } else if (route === "/start") {
    page = <StartInspection />;
  } else if (route.startsWith("/inspection/")) {
    page = <InspectionDetail id={route.slice("/inspection/".length)} />;
  } else if (route.startsWith("/part/")) {
    page = <PartPage id={route.slice("/part/".length)} />;
  } else if (route.startsWith("/ref")) {
    page = <Reference route={route} navigate={navigate} />;
  } else {
    page = <Home />;
  }

  return (
    <div className="shell">
      <header className="header">
        <button className="header-brand" onClick={() => navigate("#/")}>
          <img src="/mark.png" alt="" className="brand-mark" />
          Optimist Hub
        </button>
        <nav className="header-nav">
          {nav("#/", "Inspections")}
          {nav("#/ref", "Reference data")}
        </nav>
        <div className="spacer" />
        <ThemeToggle />
        <button className="btn btn-primary" onClick={() => navigate("#/start")}>
          Start inspection
        </button>
      </header>
      <div className="content">{page}</div>
      <ToastHost />
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(
    document.documentElement.dataset.theme === "dark",
  );
  return (
    <button
      className="btn icon-btn"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
        localStorage.setItem("theme", next ? "dark" : "light");
      }}
    >
      {dark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
