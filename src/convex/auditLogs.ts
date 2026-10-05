import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { query, type MutationCtx } from "./_generated/server";

/**
 * Minimal audit trail. Records who did what to which entity, inside the same
 * transaction as the change itself, so a write and its log can never diverge.
 *
 * `summary` holds the human-readable name/title of the affected record so a
 * deleted row still leaves a trace of what it was. It is the account owner's
 * own data and the trail is only readable by that same user.
 */
export async function logAudit(
  ctx: MutationCtx,
  entry: {
    userId: Id<"users">;
    action: string;
    entity: "clients" | "sessions";
    entityId: string;
    summary?: string;
  },
) {
  await ctx.db.insert("auditLogs", {
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    summary: entry.summary,
    at: Date.now(),
  });
}

/** Most recent 100 audit entries for the signed-in user. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
  },
});
