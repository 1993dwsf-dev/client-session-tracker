import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Download, Rows3, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  EditableCell,
  SheetCell,
  SheetRow,
  SheetTable,
  type SheetColumn,
} from "./sheet";
import {
  clientSessionsSummary,
  formatBRL,
  initialLetters,
  type SessionWithClient,
} from "@/lib/sessions";
import { decimalBR, downloadCsv } from "@/lib/csv";

const columns: SheetColumn[] = [
  { label: "Cliente", width: 190 },
  { label: "E-mail", width: 210 },
  { label: "Telefone", width: 140 },
  { label: "Sessões", width: 80, align: "center" },
  { label: "Faturamento", width: 110, align: "right" },
  { label: "A receber", width: 110, align: "right" },
  { label: "Anotações", width: 220 },
  { label: "", width: 60, align: "center" },
];

type ClientField = "name" | "email" | "phone" | "notes";

export function SheetClients({
  clients,
  sessions,
}: {
  clients: Doc<"clients">[];
  sessions: SessionWithClient[];
}) {
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);
  const deleteClient = useMutation(api.clients.remove);
  const deleteCalendarEvent = useAction(
    api.googleCalendar.deleteSessionEvent,
  );

  const googleStatus = useQuery(api.googleCalendar.status);

  const [, setActiveCell] = useState<string>("B2");
  const [deleting, setDeleting] = useState<Doc<"clients"> | null>(null);

  const [search, setSearch] = useState("");

  const normalizedSearch = search
    .trim()
    .toLocaleLowerCase("pt-BR");

  const filteredClients = clients.filter((client) => {
    const searchable = [
      client.name,
      client.email ?? "",
      client.phone ?? "",
      client.notes ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return searchable.includes(normalizedSearch);
  });

  const commitField = async (
    client: Doc<"clients">,
    field: ClientField,
    raw: string,
  ) => {
    const next = raw.trim();
    if (field === "name" && !next) {
      toast.error("O nome do cliente não pode ficar vazio.");
      return;
    }
    if ((client[field] ?? "") === next) return;
    try {
      await updateClient({
        id: client._id,
        name: field === "name" ? next : client.name,
        email: field === "email" ? next || undefined : client.email,
        phone: field === "phone" ? next || undefined : client.phone,
        notes: field === "notes" ? next || undefined : client.notes,
      });
      toast.success("Célula atualizada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    }
  };

  const handleAdd = async () => {
    try {
      await createClient({ name: `Novo cliente ${clients.length + 1}` });
      toast.success("Cliente adicionado à planilha.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível adicionar.",
      );
    }
  };

  const handleExport = () => {
    downloadCsv("clientes-fotoflow.csv", [
      ["Cliente", "E-mail", "Telefone", "Sessões", "Faturamento (R$)", "A receber (R$)", "Anotações"],
      ...clients.map((client) => {
        const summary = clientSessionsSummary(sessions, client._id);
        return [
          client.name,
          client.email ?? "",
          client.phone ?? "",
          summary.count,
          decimalBR(summary.revenue),
          decimalBR(summary.due),
          client.notes ?? "",
        ];
      }),
    ]);
    toast.success("Clientes exportados em CSV.");
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const linkedEvents = sessions.filter(
        (session) => session.clientId === deleting._id && Boolean(session.googleEventId),
      );
      let requiresManualCalendarCleanup = false;
      for (const session of linkedEvents) {
        if (googleStatus?.connected !== true) {
          requiresManualCalendarCleanup = true;
          continue;
        }
        try {
          await deleteCalendarEvent({ sessionId: session._id });
        } catch {
          requiresManualCalendarCleanup = true;
        }
      }
      await deleteClient({ id: deleting._id });
      toast.success(`"${deleting.name}" e suas sessões foram removidos do Fotoflow.`);
      if (requiresManualCalendarCleanup) {
        toast.warning("Confira o Google Calendar: alguns eventos podem precisar ser removidos manualmente.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o cliente.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Rows3 className="size-4 text-primary" />
          <span className="text-sm font-medium">Clientes</span>
          <span className="text-xs text-muted-foreground">
            · {filteredClients.length} de {clients.length} linha(s)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente..."
            aria-label="Buscar clientes"
            className="h-8 w-36 sm:w-52"
          />
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={handleExport}
            disabled={clients.length === 0}
          >
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleAdd}>
            + Linha
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1">
        <SheetTable columns={columns}>
          {filteredClients.map((client, i) => {
            const own = sessions.filter(
              (s) => s.clientId === client._id && s.status !== "cancelada",
            );
            const revenue = own.reduce((sum, s) => sum + s.price, 0);
            const due = own.reduce(
              (sum, s) => sum + Math.max(0, s.price - s.paid),
              0,
            );
            const rowNumber = i + 2;
            return (
              <SheetRow key={client._id} index={i} onActivate={setActiveCell}>
                <EditableCell
                  cell={`B${rowNumber}`}
                  onActivate={setActiveCell}
                  value={client.name}
                  display={
                    <span className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                        {initialLetters(client.name)}
                      </span>
                      <span className="font-medium">{client.name}</span>
                    </span>
                  }
                  onCommit={(v) => commitField(client, "name", v)}
                  placeholder="Nome do cliente"
                />
                <EditableCell
                  cell={`C${rowNumber}`}
                  onActivate={setActiveCell}
                  value={client.email ?? ""}
                  onCommit={(v) => commitField(client, "email", v)}
                  placeholder="email@exemplo.com"
                />
                <EditableCell
                  cell={`D${rowNumber}`}
                  onActivate={setActiveCell}
                  value={client.phone ?? ""}
                  onCommit={(v) => commitField(client, "phone", v)}
                  placeholder="(00) 00000-0000"
                />
                <SheetCell align="center" className="text-muted-foreground">
                  {own.length}
                </SheetCell>
                <SheetCell align="right" className="font-medium tabular-nums">
                  {formatBRL(revenue)}
                </SheetCell>
                <SheetCell align="right" className="tabular-nums">
                  {due > 0 ? (
                    <span className="font-medium text-primary">
                      {formatBRL(due)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </SheetCell>
                <EditableCell
                  cell={`H${rowNumber}`}
                  onActivate={setActiveCell}
                  value={client.notes ?? ""}
                  onCommit={(v) => commitField(client, "notes", v)}
                  placeholder="Anotações do cliente…"
                />
                <SheetCell align="center">
                  <button
                    type="button"
                    onClick={() => setDeleting(client)}
                    className="mx-auto flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title={`Excluir ${client.name}`}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Excluir {client.name}</span>
                  </button>
                </SheetCell>
              </SheetRow>
            );
          })}
        </SheetTable>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir linha?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `"${deleting.name}" e todas as suas sessões vinculadas serão removidos permanentemente. Essa ação não pode ser desfeita.`}
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
