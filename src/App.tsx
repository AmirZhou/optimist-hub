import { useState, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useHashRoute, ToastHost } from "./ui";
import { Home } from "./pages/Home";
import { StartInspection } from "./pages/StartInspection";
import { InspectionDetail } from "./pages/InspectionDetail";
import { PartPage } from "./pages/Part";
import { Reference } from "./pages/Reference";

export function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const [hash, navigate] = useHashRoute();
  const route = hash.replace(/^#/, "");

  if (isLoading || !isAuthenticated) {
    return <LoginScreen isLoading={isLoading} onSignIn={() => void signIn("google")} />;
  }

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
          Optimist QC
        </button>
        <nav className="header-nav">
          {nav("#/", "Inspections")}
          {nav("#/ref", "Reference data")}
        </nav>
        <div className="spacer" />
        <ThemeToggle />
        <button className="btn" onClick={() => void signOut()}>
          Sign out
        </button>
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

const HERO_SLIDES = [
  { src: "/bearing-hero.jpg", caption: "Tungsten carbide radial bearings" },
  { src: "/hero-2.jpg", caption: "Mud motor bearings" },
  { src: "/hero-3.png", caption: "Precision finished components" },
];
const SLIDE_INTERVAL = 5000;
const VIRGIL = "\u201CThey can because they think they can\u201D \u2014 Virgil";

function LoginScreen({ isLoading, onSignIn }: { isLoading: boolean; onSignIn: () => void }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((i) => (i + 1) % HERO_SLIDES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="login-split">
      <div className="login-left">
        <div className="login-frame">
          {HERO_SLIDES.map((sl, i) => (
            <div
              key={sl.src}
              className={`login-slide${i === current ? " active" : ""}`}
              style={{ backgroundImage: `url(${sl.src})` }}
            />
          ))}
          <div className="login-frame-shade" />
          <div className="login-slide-count">
            0{current + 1} / 0{HERO_SLIDES.length}
          </div>
        </div>
        <div className="login-hero-copy">
          <div className="login-hero-head">
            <img src="/optimist-logo.png" alt="Optimist Precision" className="login-logo" />
            <p className="login-hero-caption" key={current}>
              {HERO_SLIDES[current].caption}
            </p>
          </div>
          <div className="login-dots">
            {HERO_SLIDES.map((sl, i) => (
              <button
                key={sl.src}
                className={`login-dot${i === current ? " active" : ""}`}
                onClick={() => setCurrent(i)}
                aria-label={sl.caption}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="login-right">
        <div className="login-theme">
          <ThemeToggle />
        </div>
        <div className="login-form">
          {isLoading ? (
            <div className="login-loading" />
          ) : (
            <>
              <img src="/mark.png" alt="" className="login-mark" />
              <h1 className="login-title">
                Optimist <span className="login-title-accent">QC</span>
              </h1>
              <p className="login-subtitle">
                Quality control for precision manufacturing
              </p>
              <button className="login-google-btn" onClick={onSignIn}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.9 7.35 2.56 10.51l7.97-5.92z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.92C6.51 42.62 14.62 48 24 48z"/></svg>
                Sign in with Google
              </button>
              <p className="login-domain-hint">@optimistii.com accounts only</p>
            </>
          )}
        </div>
        <div className="login-footer">
          <p className="login-quote">{VIRGIL}</p>
          <p className="login-locations">Houston, Texas · Calgary, Alberta</p>
        </div>
      </div>
    </div>
  );
}
