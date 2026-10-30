import type { AuthConfig } from "convex/server";

// Trust only tokens from this Convex deployment (not Freebuff).
export default {
  providers: [{
    domain: process.env.CONVEX_SITE_URL!,
    applicationID: "convex",
  }],
} satisfies AuthConfig;
