import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Contact,
  LayoutDashboard,
  LogOut,
  TrendingUp,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientsPanel } from "@/components/dashboard/ClientsPanel";
import { SessionsPanel } from "@/components/dashboard/SessionsPanel";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import {
  STATUS_META,
  formatBRL,
  formatDate,
  startOfDay,
  type SessionWithClient,
} from "@/lib/sessions";
import { useNavigate } from "react-router";

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="modern-ring border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const clients = useQuery(api.clients.list);
  const rawSessions = useQuery(api.sessions.list);

  const [tab, setTab] = useState("resumo");

  const sessions: SessionWithClient[] = rawSessions ?? [];
  const loading = clients === undefined || rawSessions === undefined;

  const stats = useMemo(() => {
    const now = Date.now();
    const active = sessions.filter((s) => s.status !== "cancelada");
    const upcoming = active
      .filter((s) => s.date >= startOfDay(now))
      .sort((a, b) => a.date - b.date);
    const receivables = active.reduce(
      (sum, s) => sum + Math.max(0, s.price - s.paid),
      0,
    );
    const realized = active
      .filter((s) => s.status === "realizada")
      .reduce((sum, s) => sum + s.price, 0);
    const overdue = active.filter(
      (s) => s.date < startOfDay(now) && s.price - s.paid > 0,
    );
    return {
      totalClients: clients?.length ?? 0,
      upcoming,
      receivables,
      realized,
      overdue,
      activeCount: active.length,
    };
  }, [sessions, clients]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="modern-grain min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <LayoutDashboard className="size-4" />
              </span>
              <div className="leading-tight">
                <p className="text-[15px] font-semibold tracking-tight">Fotoflow</p>
                <p className="text-[11px] text-muted-foreground">
                  Painel do fotógrafo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Bem-vindo(a){user?.name ? `, ${user.name}` : ""} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe clientes, sessões e pagamentos do seu estúdio.
            </p>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Clientes"
              value={loading ? "—" : String(stats.totalClients)}
              hint="Cadastrados no estúdio"
            />
            <KpiCard
              icon={CalendarDays}
              label="Sessões ativas"
              value={loading ? "—" : String(stats.activeCount)}
              hint="Fora as canceladas"
            />
            <KpiCard
              icon={CircleDollarSign}
              label="A receber"
              value={loading ? "—" : formatBRL(stats.receivables)}
              hint="Saldo de sessões ativas"
            />
            <KpiCard
              icon={TrendingUp}
              label="Faturado (realizadas)"
              value={loading ? "—" : formatBRL(stats.realized)}
              hint="Sessões já realizadas"
            />
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList className="h-10 w-full justify-start gap-1 rounded-xl bg-muted/70 p-1 sm:w-auto">
              <TabsTrigger value="resumo" className="gap-1.5 rounded-lg px-3">
                <LayoutDashboard className="size-3.5" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="clientes" className="gap-1.5 rounded-lg px-3">
                <Contact className="size-3.5" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="sessoes" className="gap-1.5 rounded-lg px-3">
                <CalendarDays className="size-3.5" />
                Sessões
              </TabsTrigger>
            </TabsList>

            {/* Resumo */}
            <TabsContent value="resumo" className="mt-4 space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Próximas sessões */}
                <Card className="modern-ring border-border/70">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">
                      Próximas sessões
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                      onClick={() => setTab("sessoes")}
                    >
                      Ver todas
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {loading ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Carregando…
                      </p>
                    ) : stats.upcoming.length === 0 ? (
                      <Empty className="border border-dashed">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <CalendarDays />
                          </EmptyMedia>
                          <EmptyTitle>Nada agendado</EmptyTitle>
                          <EmptyDescription>
                            Crie uma sessão para começar a agenda.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      stats.upcoming.slice(0, 5).map((s) => {
                        const meta = STATUS_META[s.status];
                        return (
                          <div
                            key={s._id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {s.title}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.clientName} • {formatDate(s.date)}
                                {s.time ? ` • ${s.time}` : ""}
                              </p>
                            </div>
                            <span
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.badge}`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${meta.dot}`}
                              />
                              {meta.label}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Financeiro */}
                <Card className="modern-ring border-border/70">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">
                      Pendências financeiras
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="border-primary/25 bg-accent text-accent-foreground"
                    >
                      {formatBRL(stats.receivables)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {loading ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Carregando…
                      </p>
                    ) : stats.overdue.length === 0 ? (
                      <Empty className="border border-dashed">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <CheckCircle2 />
                          </EmptyMedia>
                          <EmptyTitle>Tudo em dia! 🎉</EmptyTitle>
                          <EmptyDescription>
                            Nenhum saldo pendente nas sessões ativas.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      stats.overdue.slice(0, 5).map((s) => {
                        const due = s.price - s.paid;
                        return (
                          <div
                            key={s._id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {s.title}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.clientName} • sessão de {formatDate(s.date)}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-primary">
                              {formatBRL(due)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="clientes" className="mt-4">
              <ClientsPanel sessions={sessions} />
            </TabsContent>

            <TabsContent value="sessoes" className="mt-4">
              <SessionsPanel sessions={sessions} clients={clients ?? []} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
