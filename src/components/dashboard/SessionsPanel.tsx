import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  CalendarDays,
  CircleAlert,
  Ellipsis,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  SESSION_STATUS_VALUES,
  STATUS_META,
  formatBRL,
  formatDate,
  type SessionStatus,
  type SessionWithClient,
} from "@/lib/sessions";

type SessionDoc = Doc<"sessions">;

interface SessionFormValues {
  clientId: string;
  title: string;
  type: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  location: string;
  price: string;
  paid: string;
  status: SessionStatus;
  notes: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): SessionFormValues => ({
  clientId: "",
  title: "",
  type: "",
  date: todayISO(),
  time: "",
  location: "",
  price: "",
  paid: "",
  status: "orcamento",
  notes: "",
});

const STATUS_FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "orcamento", label: "Orçamento" },
  { value: "agendada", label: "Agendada" },
  { value: "realizada", label: "Realizada" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export function SessionsPanel({
  sessions,
  clients,
}: {
  sessions: SessionWithClient[];
  clients: Doc<"clients">[];
}) {
  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);
  const updateStatus = useMutation(api.sessions.updateStatus);
  const deleteSession = useMutation(api.sessions.remove);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SessionDoc | null>(null);
  const [form, setForm] = useState<SessionFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SessionDoc | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions
      .filter((s) => (statusFilter === "todas" ? true : s.status === statusFilter))
      .filter((s) =>
        q
          ? s.title.toLowerCase().includes(q) ||
            s.clientName.toLowerCase().includes(q) ||
            (s.type ?? "").toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => a.date - b.date);
  }, [sessions, search, statusFilter]);

  const openCreate = (clientId?: string) => {
    setEditing(null);
    const base = emptyForm();
    setForm(
      clientId
        ? { ...base, clientId, title: "", status: "agendada" }
        : base,
    );
    setDialogOpen(true);
  };

  const openEdit = (session: SessionDoc) => {
    setEditing(session);
    setForm({
      clientId: session.clientId,
      title: session.title,
      type: session.type ?? "",
      date: new Date(session.date).toISOString().slice(0, 10),
      time: session.time ?? "",
      location: session.location ?? "",
      price: String(session.price),
      paid: String(session.paid),
      status: session.status,
      notes: session.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.clientId) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Dê um nome à sessão.");
      return;
    }
    const price = Number(form.price.replace(",", ".")) || 0;
    const paid = Number(form.paid.replace(",", ".")) || 0;
    setSaving(true);
    try {
      const payload = {
        clientId: form.clientId as Doc<"clients">["_id"],
        title: form.title,
        type: form.type || undefined,
        date: new Date(`${form.date}T12:00:00`).getTime(),
        time: form.time || undefined,
        location: form.location || undefined,
        price,
        paid,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (editing) {
        await updateSession({ id: editing._id, ...payload });
        toast.success("Sessão atualizada.");
      } else {
        await createSession(payload);
        toast.success("Sessão criada.");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    session: SessionDoc,
    status: SessionStatus,
  ) => {
    try {
      await updateStatus({ id: session._id, status });
      toast.success(`Status alterado para "${STATUS_META[status].label}".`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar.",
      );
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteSession({ id: toDelete._id });
      toast.success("Sessão removida.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível excluir.",
      );
    } finally {
      setToDelete(null);
    }
  };

  return (
    <Card className="modern-ring border-border/70">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-primary" />
            Sessões
          </CardTitle>
          <CardDescription>
            Agenda, orçamentos e pagamentos de cada ensaio.
          </CardDescription>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => openCreate()}
          disabled={clients.length === 0}
        >
          <Plus className="size-4" />
          Nova sessão
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, sessão ou tipo…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {clients.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleAlert />
              </EmptyMedia>
              <EmptyTitle>Cadastre um cliente primeiro</EmptyTitle>
              <EmptyDescription>
                Toda sessão pertence a um cliente — comece pela aba Clientes.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>Nenhuma sessão encontrada</EmptyTitle>
              <EmptyDescription>
                {search || statusFilter !== "todas"
                  ? "Ajuste a busca ou o filtro de status."
                  : "Crie a primeira sessão para começar a agenda."}
              </EmptyDescription>
            </EmptyHeader>
            {!search && statusFilter === "todas" && (
              <Button size="sm" className="gap-1.5" onClick={() => openCreate()}>
                <Plus className="size-4" />
                Nova sessão
              </Button>
            )}
          </Empty>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((session) => {
              const meta = STATUS_META[session.status];
              const due = Math.max(0, session.price - session.paid);
              const fullyPaid = due === 0 && session.price > 0;
              return (
                <div
                  key={session._id}
                  className="group rounded-xl border border-border/70 bg-background/60 p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border border-border/70 bg-card leading-none">
                        <span className="text-sm font-bold tracking-tight">
                          {new Date(session.date).getDate()}
                        </span>
                        <span className="mt-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR", {
                            month: "short",
                          })
                            .format(new Date(session.date))
                            .replace(".", "")}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight">
                          {session.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {session.clientName}
                          {session.type ? ` • ${session.type}` : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {formatDate(session.date)}
                            {session.time ? ` • ${session.time}` : ""}
                          </span>
                          {session.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {session.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.badge}`}
                      >
                        <span className={`size-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <Ellipsis className="size-4" />
                            <span className="sr-only">
                              Opções de {session.title}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel>Status</DropdownMenuLabel>
                          <DropdownMenuRadioGroup
                            value={session.status}
                            onValueChange={(v) =>
                              handleStatusChange(session, v as SessionStatus)
                            }
                          >
                            {SESSION_STATUS_VALUES.map((s) => (
                              <DropdownMenuRadioItem key={s} value={s}>
                                {STATUS_META[s].label}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEdit(session)}>
                            <Pencil />
                            Editar sessão
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setToDelete(session)}
                          >
                            <Trash2 />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-xs">
                    <Badge
                      variant="outline"
                      className="border-border/80 bg-card font-semibold"
                    >
                      {formatBRL(session.price)}
                    </Badge>
                    {session.paid > 0 && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        Pago: {formatBRL(session.paid)}
                      </Badge>
                    )}
                    {session.status !== "cancelada" && due > 0 && (
                      <Badge className="border-transparent bg-primary/10 font-medium text-primary" variant="outline">
                        Falta {formatBRL(due)}
                      </Badge>
                    )}
                    {fullyPaid && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        Quitado ✓
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sessão" : "Nova sessão"}</DialogTitle>
            <DialogDescription>
              Vincule a sessão a um cliente e registre valores e status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => setForm({ ...form, clientId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-title">Nome da sessão *</Label>
                <Input
                  id="session-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Ensaio gestante — Marina"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session-type">Tipo</Label>
                <Input
                  id="session-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="Casamento, book, aniversário…"
                  list="session-types"
                />
                <datalist id="session-types">
                  <option value="Casamento" />
                  <option value="Book" />
                  <option value="Aniversário" />
                  <option value="Gestante" />
                  <option value="Newborn" />
                  <option value="Ensaio externo" />
                  <option value="Corporativo" />
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as SessionStatus })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session-date">Data *</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-time">Hora</Label>
                <Input
                  id="session-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-location">Local</Label>
              <Input
                id="session-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Estúdio, endereço externo…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session-price">Valor total (R$) *</Label>
                <Input
                  id="session-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-paid">Sinal / pago (R$)</Label>
                <Input
                  id="session-paid"
                  inputMode="decimal"
                  value={form.paid}
                  onChange={(e) => setForm({ ...form, paid: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-notes">Anotações</Label>
              <Textarea
                id="session-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Detalhes do pacote, entregas, contatos…"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {editing ? "Salvar alterações" : "Criar sessão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete &&
                `"${toDelete.title}" será removida permanentemente. Essa ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
