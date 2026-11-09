import { requireAuth, ForbiddenError } from "@/lib/auth/rbac";
import { SessionPayload } from "@/lib/auth/session";

/**
 * Roles con acceso a la memoria de clientes desde el CRM.
 * Un comercio o repartidor nunca debe ver memoria de clientes.
 */
export const MEMORY_ADMIN_ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "OPERATOR",
  "DISPATCHER",
];

export async function requireMemoryAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();

  if (!MEMORY_ADMIN_ROLES.includes(session.role as string)) {
    throw new ForbiddenError(
      "No tienes permiso para consultar o modificar la memoria de clientes."
    );
  }

  return session;
}
