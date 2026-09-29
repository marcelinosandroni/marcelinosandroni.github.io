export {
  ADMIN_EMAIL_ENV,
  NotAdminError,
  adminGateFromEnv,
  createAdminGate,
  isSyntacticallyValidEmail,
  normalizeEmail,
  parseAllowlist,
} from "./admin-identity";
export type { AdminGate } from "./admin-identity";
