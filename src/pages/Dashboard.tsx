import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  CalendarDays,
  ChartNoAxesColumn,
  LayoutDashboard,
  LogOut,
  Rows3,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormulaBar, SheetTabs } from "@/components/spreadsheet/Workbook";
import { SheetClients } from "@/components/spreadsheet/SheetClients";
import { SheetSessions } from "@/components/spreadsheet/SheetSessions";
import { SheetSummary } from "@/components/spreadsheet/SheetSummary";
import { GoogleMenu } from "@/components/spreadsheet/GoogleMenu";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { formatBRL, type SessionWithClient } from "@/lib/sessions";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const clients = useQuery(api.clients.list);
  const rawSessions = useQuery(api.sessions.list);
  const googleStatus = useQuery(api.googleCalendar.status);

  // OAuth return: toast the connection result once per redirect.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const google = params.get("google");
    if (google === "connected") {
      toast.success("Google Calendar conectado com sucesso!");
    } else if (google === "error") {
      toast.error("Não foi possível conectar o Google Calendar. Tente novamente.");
    }
    if (google) {
      params.delete("google");
      navigate({ pathname: location.pathname, search: params.toString() }, {
        replace: true,
      });
    }
  }, [location.search, location.pathname, navigate]);

  const [activeSheet, setActiveSheet] = useState("resumo");
  const [activeCell, setActiveCell] = useState("A1");
  const [activeValue, setActiveValue] = useState<string | undefined>(undefined);

  const sessions: SessionWithClient[] = rawSessions ?? [];
  const loading = clients === undefined || rawSessions === undefined;

  const totals = useMemo(() => {
    const active = sessions.filter((s) => s.status !== "cancelada");
    const values = active.map((s) => s.price);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      rows: sessions.length,
      sum,
      avg: values.length ? sum / values.length : 0,
    };
  }, [sessions]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleActiveCell = (ref: string, value?: string) => {
    setActiveCell(ref);
    setActiveValue(value);
  };

  const tabs = [
    { value: "resumo", label: "Resumo", icon: <ChartNoAxesColumn className="size-3.5" /> },
    { value: "clientes", label: "Clientes", icon: <Rows3 className="size-3.5" /> },
    { value: "sessoes", label: "Sessões", icon: <CalendarDays className="size-3.5" /> },
  ];

  return (
    <div className="modern-grain flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 shrink-0 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <LayoutDashboard className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight">Fotoflow</p>
              <p className="text-[11px] text-muted-foreground">
                Planilha do fotógrafo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GoogleMenu />
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="size-8 border border-border/70">
                <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                  {(user?.name ?? user?.email ?? "F").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-40 truncate text-sm text-muted-foreground">
                {user?.name ?? user?.email ?? "Fotógrafo(a)"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSignOut}
            >
              <LogOut className="size-3.5" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Workbook */}
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="modern-ring flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card">
          <FormulaBar cell={activeCell} value={activeValue} />
          <div className="min-h-0 flex-1">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Carregando planilha…
              </div>
            ) : activeSheet === "resumo" ? (
              <SheetSummary
                sessions={sessions}
                clientCount={clients?.length ?? 0}
                onActiveCellChange={handleActiveCell}
              />
            ) : activeSheet === "clientes" ? (
              <SheetClients clients={clients ?? []} sessions={sessions} />
            ) : (
              <SheetSessions
                sessions={sessions}
                clients={clients ?? []}
                onActiveCellChange={handleActiveCell}
              />
            )}
          </div>
          <SheetTabs tabs={tabs} active={activeSheet} onChange={setActiveSheet} />
        </div>
      </main>

      {/* Status bar */}
      <footer className="shrink-0 border-t border-border/70 bg-muted/40">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-1.5 text-[11px] text-muted-foreground sm:px-6">
          <span className="font-medium">Pronto</span>
          <span className="text-border">|</span>
          <span>{totals.rows} linha(s)</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            Soma dos valores: {formatBRL(totals.sum)}
          </span>
          <span className="text-border">|</span>
          <span>Média: {formatBRL(Math.round(totals.avg))}</span>
        </div>
      </footer>
    </div>
  );
}
