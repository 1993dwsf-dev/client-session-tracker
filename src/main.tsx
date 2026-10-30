import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";

const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

class ErrorBoundary extends React.Component<
  { children: React.ReactNode }, { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("[Fotoflow] Application error", error); }
  render() {
    return this.state.failed
      ? <main className="flex min-h-screen items-center justify-center p-8 text-center">
          <p>Ocorreu um erro ao abrir o Fotoflow. Recarregue a página ou contate o suporte.</p>
        </main>
      : this.props.children;
  }
}

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = url && /^https:\/\/[^/]+\.convex\.cloud\/?$/.test(url)
  ? new ConvexReactClient(url) : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      {convex ? (
        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <Suspense fallback={<main className="p-8 text-center">Carregando Fotoflow…</main>}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/privacidade" element={<Privacy />} />
                <Route path="/termos" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
        </ConvexAuthProvider>
      ) : (
        <main className="flex min-h-screen items-center justify-center p-8 text-center">
          <p>Fotoflow ainda não foi conectado ao banco de dados. Configure VITE_CONVEX_URL na hospedagem.</p>
        </main>
      )}
    </ErrorBoundary>
  </StrictMode>,
);
