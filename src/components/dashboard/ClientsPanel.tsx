import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Ellipsis,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  StickyNote,
  Trash2,
  UserRoundPlus,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatBRL, initialLetters, type SessionWithClient } from "@/lib/sessions";

type ClientDoc = Doc<"clients">;

interface ClientFormValues {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyForm: ClientFormValues = { name: "", email: "", phone: "", notes: "" };

export function ClientsPanel({ sessions }: { sessions: SessionWithClient[] }) {
  const clients = useQuery(api.clients.list) ?? [];
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);
  const deleteClient = useMutation(api.clients.remove);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientDoc | null>(null);
  const [form, setForm] = useState<ClientFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ClientDoc | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [clients, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (client: ClientDoc) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      notes: client.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("O nome do cliente é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateClient({
          id: editing._id,
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        });
        toast.success("Cliente atualizado.");
      } else {
        await createClient({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
        });
        toast.success("Cliente cadastrado.");
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

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteClient({ id: toDelete._id });
      toast.success(
        `Cliente e ${sessions.filter((s) => s.clientId === toDelete._id).length} sessão(ões) removidos.`,
      );
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
            <Users className="size-4 text-primary" />
            Clientes
          </CardTitle>
          <CardDescription>
            {clients.length === 0
              ? "Cadastre seu primeiro cliente para começar."
              : `${clients.length} cliente(s) cadastrado(s).`}
          </CardDescription>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" />
          Novo cliente
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone…"
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserRoundPlus />
              </EmptyMedia>
              <EmptyTitle>
                {search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
              </EmptyTitle>
              <EmptyDescription>
                {search
                  ? "Tente outro termo de busca."
                  : "Cadastre clientes para vinculá-los às sessões."}
              </EmptyDescription>
            </EmptyHeader>
            {!search && (
              <Button size="sm" className="gap-1.5" onClick={openCreate}>
                <Plus className="size-4" />
                Cadastrar cliente
              </Button>
            )}
          </Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((client) => {
              const own = sessions.filter(
                (s) => s.clientId === client._id && s.status !== "cancelada",
              );
              const revenue = own.reduce((sum, s) => sum + s.price, 0);
              const due = own.reduce(
                (sum, s) => sum + Math.max(0, s.price - s.paid),
                0,
              );
              return (
                <div
                  key={client._id}
                  className="group rounded-xl border border-border/70 bg-background/60 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9 border border-border/70">
                        <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                          {initialLetters(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight">
                          {client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {own.length} sessão(ões)
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Ellipsis className="size-4" />
                          <span className="sr-only">Opções de {client.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(client)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setToDelete(client)}
                        >
                          <Trash2 />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    {client.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="size-3.5 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                    {client.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="size-3.5 shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </p>
                    )}
                    {client.notes && (
                      <p className="flex items-start gap-1.5">
                        <StickyNote className="mt-0.5 size-3.5 shrink-0" />
                        <span className="line-clamp-2">{client.notes}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                    <span className="text-muted-foreground">
                      Faturamento:{" "}
                      <span className="font-semibold text-foreground">
                        {formatBRL(revenue)}
                      </span>
                    </span>
                    {due > 0 && (
                      <span className="font-medium text-primary">
                        {formatBRL(due)} a receber
                      </span>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              Dados de contato e preferências do cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome *</Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Marina Duarte"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-email">E-mail</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nome@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Telefone / WhatsApp</Label>
                <Input
                  id="client-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-notes">Anotações</Label>
              <Textarea
                id="client-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Preferências, referências, restrições…"
                rows={3}
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
                {editing ? "Salvar alterações" : "Cadastrar cliente"}
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
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete &&
                `"${toDelete.name}" e todas as suas sessões vinculadas serão removidos permanentemente. Essa ação não pode ser desfeita.`}
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
