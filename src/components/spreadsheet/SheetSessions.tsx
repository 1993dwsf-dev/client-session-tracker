import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { CalendarDays, ChevronDown, Download, Pencil, Rows3, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EditableCell,
  SheetCell,
  SheetRow,
  SheetTable,
  StatusPill,
  type SheetColumn,
} from "./sheet";
import {
  SESSION_STATUS_VALUES,
  STATUS_META,
  formatBRL,
  formatDate,
  parseMoney,
  type SessionStatus,
  type SessionWithClient,
} from "@/lib/sessions";
import { decimalBR, downloadCsv } from "@/lib/csv";

const columns: SheetColumn[] = [
  { label: "Sessão", width: 180 },
  { label: "Cliente", width: 150 },
  { label: "Tipo", width: 120 },
  { label: "Data", width: 110 },
  { label: "Hora", width: 70 },
  { label: "Local", width: 140 },
  { label: "Valor", width: 100, align: "right" },
  { label: "Pago", width: 100, align: "right" },
  { label: "Saldo", width: 100, align: "right" },
  { label: "Status", width: 120 },
  { label: "", width: 90, align: "center" },
];

interface SessionFormValues {
  clientId: string;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  price: string;
  paid: string;
  status: SessionStatus;
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
});

export function SheetSessions({
  sessions,
  clients,
  onActiveCellChange,
}: {
  sessions: SessionWithClient[];
  clients: Doc<"clients">[];
  onActiveCellChange: (ref: string, value: string) => void;
}) {
  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);
  const updateStatus = useMutation(api.sessions.updateStatus);
  const deleteSession = useMutation(api.sessions.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SessionWithClient | null>(null);
  const [form, setForm] = useState<SessionFormValues>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SessionWithClient | null>(null);

  const sorted = [...sessions].sort((a, b) => a.date - b.date);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), clientId: clients[0]?._id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (session: SessionWithClient) => {
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
    setSaving(true);
    try {
      const payload = {
        clientId: form.clientId as Doc<"clients">["_id"],
        title: form.title,
        type: form.type || undefined,
        date: new Date(`${form.date}T12:00:00`).getTime(),
        time: form.time || undefined,
        location: form.location || undefined,
        price: parseMoney(form.price),
        paid: parseMoney(form.paid),
        status: form.status,
        notes: undefined,
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
    session: SessionWithClient,
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

  const handleExport = () => {
    downloadCsv("sessoes-fotoflow.csv", [
      [
        "Sessão",
        "Cliente",
        "Tipo",
        "Data",
        "Hora",
        "Local",
        "Valor (R$)",
        "Pago (R$)",
        "Saldo (R$)",
        "Status",
      ],
      ...sorted.map((session) => {
        const due = Math.max(0, session.price - session.paid);
        return [
          session.title,
          session.clientName,
          session.type ?? "",
          formatDate(session.date),
          session.time ?? "",
          session.location ?? "",
          decimalBR(session.price),
          decimalBR(session.paid),
          decimalBR(due),
          STATUS_META[session.status].label,
        ];
      }),
    ]);
    toast.success("Sessões exportadas em CSV.");
  };

  const confirmDelete = async () => {
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
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          <span className="text-sm font-medium">Sessões</span>
          <span className="text-xs text-muted-foreground">
            · {sorted.length} linha(s)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={handleExport}
            disabled={sorted.length === 0}
          >
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={openCreate}
            disabled={clients.length === 0}
          >
            + Linha
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1">
        <SheetTable columns={columns}>
          {sorted.map((session, i) => {
            const due = Math.max(0, session.price - session.paid);
            const rowNumber = i + 2;
            return (
              <SheetRow
                key={session._id}
                index={i}
                onActivate={(ref) =>
                  onActiveCellChange(ref, `Sessão: ${session.title}`)
                }
              >
                <EditableCell
                  cell={`B${rowNumber}`}
                  onActivate={onActiveCellChange}
                  value={session.title}
                  display={
                    <span className="font-medium">{session.title}</span>
                  }
                  onCommit={() => openEdit(session)}
                  placeholder="Nome da sessão"
                />
                <SheetCell title={session.clientName}>
                  <span className="block truncate">{session.clientName}</span>
                </SheetCell>
                <SheetCell>
                  <span className="block truncate text-muted-foreground">
                    {session.type ?? "—"}
                  </span>
                </SheetCell>
                <SheetCell className="tabular-nums">
                  {formatDate(session.date)}
                </SheetCell>
                <SheetCell className="tabular-nums text-muted-foreground">
                  {session.time ?? "—"}
                </SheetCell>
                <SheetCell>
                  <span className="block truncate text-muted-foreground">
                    {session.location ?? "—"}
                  </span>
                </SheetCell>
                <SheetCell align="right" className="font-medium tabular-nums">
                  {formatBRL(session.price)}
                </SheetCell>
                <SheetCell align="right" className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  {session.paid > 0 ? formatBRL(session.paid) : "—"}
                </SheetCell>
                <SheetCell align="right" className="tabular-nums">
                  {session.status !== "cancelada" && due > 0 ? (
                    <span className="font-medium text-primary">
                      {formatBRL(due)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </SheetCell>
                <SheetCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-accent/50"
                        title="Alterar status"
                      >
                        <StatusPill status={session.status} />
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SheetCell>
                <SheetCell align="center">
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEdit(session)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title={`Editar ${session.title}`}
                    >
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Editar {session.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(session)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title={`Excluir ${session.title}`}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Excluir {session.title}</span>
                    </button>
                  </div>
                </SheetCell>
              </SheetRow>
            );
          })}
        </SheetTable>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar sessão" : "Nova sessão"}
            </DialogTitle>
            <DialogDescription>
              Linha da planilha de sessões — cliente, agenda e valores.
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
                    <SelectValue placeholder="Selecione" />
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
                <Label htmlFor="ss-title">Sessão *</Label>
                <Input
                  id="ss-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Ensaio gestante — Marina"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ss-type">Tipo</Label>
                <Input
                  id="ss-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="Casamento, book…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ss-status">Status</Label>
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
                <Label htmlFor="ss-date">Data *</Label>
                <Input
                  id="ss-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ss-time">Hora</Label>
                <Input
                  id="ss-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ss-location">Local</Label>
              <Input
                id="ss-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Estúdio, endereço…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ss-price">Valor (R$) *</Label>
                <Input
                  id="ss-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ss-paid">Sinal / pago (R$)</Label>
                <Input
                  id="ss-paid"
                  inputMode="decimal"
                  value={form.paid}
                  onChange={(e) => setForm({ ...form, paid: e.target.value })}
                  placeholder="0"
                />
              </div>
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
            <AlertDialogTitle>Excluir linha?</AlertDialogTitle>
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
                confirmDelete();
              }}
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
