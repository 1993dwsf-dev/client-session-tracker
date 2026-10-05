import { ArrowLeft, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared chrome for the public legal pages (privacidade / termos). Kept small
 * and dependency-light so these static pages render without the app shell.
 */
export function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Fotoflow
            </span>
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {updatedAt}
        </p>

        <div className="mt-8 space-y-6">{children}</div>

        <nav className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/70 pt-6 text-sm text-muted-foreground">
          <a className="transition-colors hover:text-foreground" href="/privacidade">
            Política de Privacidade
          </a>
          <a className="transition-colors hover:text-foreground" href="/termos">
            Termos de Uso
          </a>
          <a className="transition-colors hover:text-foreground" href="/">
            Início
          </a>
        </nav>
      </main>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
