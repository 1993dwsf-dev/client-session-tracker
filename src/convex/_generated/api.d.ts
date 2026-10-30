/* Type-safe API generated from the project's backend modules. */
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as clients from "../clients.js";
import type * as googleCalendar from "../googleCalendar.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
declare const fullApi: ApiFromModules<{
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  clients: typeof clients;
  googleCalendar: typeof googleCalendar;
  sessions: typeof sessions;
  users: typeof users;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
