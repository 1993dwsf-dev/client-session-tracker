import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "clean expired OTP send rate limits",
  { hours: 1 },
  internal.otpRateLimit.cleanupExpiredOtpSendRateLimits,
  {},
);

export default crons;
