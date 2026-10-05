import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { logAudit } from "./auditLogs";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");

    const name = args.name.trim();
    if (!name) throw new Error("O nome do cliente é obrigatório.");

    const id = await ctx.db.insert("clients", {
      userId,
      name,
      email: args.email?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });
    await logAudit(ctx, {
      userId,
      action: "client.create",
      entity: "clients",
      entityId: id,
      summary: name,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");

    const client = await ctx.db.get(args.id);
    if (!client || client.userId !== userId) {
      throw new Error("Cliente não encontrado.");
    }

    const name = args.name.trim();
    if (!name) throw new Error("O nome do cliente é obrigatório.");

    await ctx.db.patch(args.id, {
      name,
      email: args.email?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
    });
    await logAudit(ctx, {
      userId,
      action: "client.update",
      entity: "clients",
      entityId: args.id,
      summary: name,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");

    const client = await ctx.db.get(args.id);
    if (!client || client.userId !== userId) {
      throw new Error("Cliente não encontrado.");
    }

    // Remove as sessões vinculadas ao cliente (cascade).
    const linked = await ctx.db
      .query("sessions")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .collect();
    for (const session of linked) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      userId,
      action: "client.delete",
      entity: "clients",
      entityId: args.id,
      summary: client.name,
    });
  },
});
