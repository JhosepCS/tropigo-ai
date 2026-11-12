import { prisma } from "@/lib/prisma";
import { getSession, SessionPayload } from "./session";

// =================================================================
// 1. DEFINICIÓN DE ROLES DEL SISTEMA
// =================================================================

export type Role =
  | "SUPERADMIN"
  | "ADMIN"
  | "OPERATOR"
  | "MERCHANT_OWNER"
  | "RIDER"
  | "MOTOTAXISTA"
  | "CUSTOMER";

export const ROLES: Record<Role, Role> = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  OPERATOR: "OPERATOR",
  MERCHANT_OWNER: "MERCHANT_OWNER",
  RIDER: "RIDER",
  MOTOTAXISTA: "MOTOTAXISTA",
  CUSTOMER: "CUSTOMER",
};

// =================================================================
// 2. PERMISOS GRANULARES
// =================================================================

export type Permission =
  // Gestión de Usuarios y Plataforma
  | "users:manage"
  | "users:create_admin"
  | "system:settings_manage"
  | "audit:view"
  // Comercios y Catálogo
  | "merchants:read_all"
  | "merchants:manage_all"
  | "merchants:manage_own"
  | "products:read_all"
  | "products:manage_all"
  | "products:manage_own"
  // Logística y Flota
  | "fleet:read_all"
  | "fleet:manage_all"
  | "zones:manage"
  // Pedidos y Despacho
  | "orders:read_all"
  | "orders:dispatch"
  | "orders:manage_own_merchant"
  | "orders:view_assigned_delivery"
  | "orders:update_assigned_delivery"
  | "orders:view_own_customer"
  // Carreras de Pasajeros
  | "rides:read_all"
  | "rides:dispatch"
  | "rides:view_assigned"
  | "rides:update_assigned"
  | "rides:view_own_customer"
  // Atención al Cliente y Mensajería
  | "conversations:manage"
  | "conversations:takeover"
  // Perfil Propio
  | "profile:manage_own";

// Mapa estricto de permisos por Rol
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPERADMIN: [
    "users:manage",
    "users:create_admin",
    "system:settings_manage",
    "audit:view",
    "merchants:read_all",
    "merchants:manage_all",
    "merchants:manage_own",
    "products:read_all",
    "products:manage_all",
    "products:manage_own",
    "fleet:read_all",
    "fleet:manage_all",
    "zones:manage",
    "orders:read_all",
    "orders:dispatch",
    "orders:manage_own_merchant",
    "orders:view_assigned_delivery",
    "orders:update_assigned_delivery",
    "orders:view_own_customer",
    "rides:read_all",
    "rides:dispatch",
    "rides:view_assigned",
    "rides:update_assigned",
    "rides:view_own_customer",
    "conversations:manage",
    "conversations:takeover",
    "profile:manage_own",
  ],
  ADMIN: [
    "users:manage",
    "audit:view",
    "merchants:read_all",
    "merchants:manage_all",
    "merchants:manage_own",
    "products:read_all",
    "products:manage_all",
    "products:manage_own",
    "fleet:read_all",
    "fleet:manage_all",
    "zones:manage",
    "orders:read_all",
    "orders:dispatch",
    "orders:manage_own_merchant",
    "orders:view_assigned_delivery",
    "orders:update_assigned_delivery",
    "rides:read_all",
    "rides:dispatch",
    "rides:view_assigned",
    "rides:update_assigned",
    "conversations:manage",
    "conversations:takeover",
    "profile:manage_own",
  ],
  OPERATOR: [
    "merchants:read_all",
    "products:read_all",
    "fleet:read_all",
    "orders:read_all",
    "orders:dispatch",
    "rides:read_all",
    "rides:dispatch",
    "conversations:manage",
    "conversations:takeover",
    "profile:manage_own",
  ],
  MERCHANT_OWNER: [
    "merchants:manage_own",
    "products:manage_own",
    "orders:manage_own_merchant",
    "profile:manage_own",
  ],
  RIDER: [
    "orders:view_assigned_delivery",
    "orders:update_assigned_delivery",
    "profile:manage_own",
  ],
  MOTOTAXISTA: [
    "rides:view_assigned",
    "rides:update_assigned",
    "profile:manage_own",
  ],
  CUSTOMER: [
    "orders:view_own_customer",
    "rides:view_own_customer",
    "profile:manage_own",
  ],
};

// =================================================================
// 3. CLASES DE ERROR DE AUTORIZACIÓN
// =================================================================

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = "No estás autenticado en TropiGO") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = "No tienes permisos suficientes para realizar esta acción") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// =================================================================
// 4. FUNCIONES DE VALIDACIÓN EN SERVIDOR (SERVER-SIDE GUARDS)
// =================================================================

/**
 * Exige una sesión válida y activa.
 *
 * Confía en la verificación criptográfica del JWT (firma HS256 + expiración).
 * No consulta la base de datos en cada petición para evitar errores 401
 * transitorios por latencia del pool de Supabase o cold starts de Vercel.
 *
 * La sesión ya fue validada por el middleware Edge antes de llegar aquí.
 * Si se necesita revocar un usuario, se puede eliminar su sesión en DB
 * y `verifySessionToken` lo detectará cuando la DB esté disponible.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !session.userId) {
    throw new UnauthorizedError();
  }

  return session;
}

/**
 * Exige que el usuario posea uno de los roles autorizados.
 */
export async function requireRole(allowedRoles: Role[]): Promise<SessionPayload> {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.role as Role)) {
    throw new ForbiddenError(
      `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`
    );
  }

  return session;
}

/**
 * Exige un permiso específico.
 */
export async function requirePermission(permission: Permission): Promise<SessionPayload> {
  const session = await requireAuth();
  const permissions = ROLE_PERMISSIONS[session.role as Role] || [];

  if (!permissions.includes(permission)) {
    throw new ForbiddenError(`No tienes el permiso requerido: ${permission}`);
  }

  return session;
}

// =================================================================
// 5. VALIDACIÓN A NIVEL DE OBJETO (OBJECT-LEVEL PERMISSION GUARDS)
// =================================================================

/**
 * Asegura que un comercio solamente sea administrado por su dueño o por un Superadmin/Admin.
 */
export async function assertMerchantOwnership(
  userId: string,
  merchantId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) throw new UnauthorizedError();

  // Superadministrador y Administrador general tienen acceso a todos los comercios
  if (user.role === "SUPERADMIN" || user.role === "ADMIN") {
    return true;
  }

  if (user.role !== "MERCHANT_OWNER") {
    throw new ForbiddenError("Solamente los propietarios de comercio pueden gestionar este recurso");
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, ownerId: true },
  });

  if (!merchant || merchant.ownerId !== userId) {
    throw new ForbiddenError("No tienes autorización para administrar este comercio ni sus productos");
  }

  return true;
}

/**
 * Asegura que un repartidor solamente consulte o actualice los pedidos que tiene explícitamente asignados.
 */
export async function assertRiderOrderAccess(
  userId: string,
  orderId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { riderProfile: true },
  });

  if (!user) throw new UnauthorizedError();

  // Operaciones centrales (Superadmin, Admin, Despachador) pueden supervisar cualquier pedido
  if (["SUPERADMIN", "ADMIN", "OPERATOR"].includes(user.role)) {
    return true;
  }

  if (user.role !== "RIDER") {
    throw new ForbiddenError("Solo repartidores autorizados pueden acceder a este pedido");
  }

  const rider = user.riderProfile;
  if (!rider) {
    throw new ForbiddenError("No tienes un perfil de repartidor activo");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, assignedRiderId: true, status: true },
  });

  if (!order) {
    throw new ForbiddenError("Pedido no encontrado");
  }

  // Permitir si está asignado al repartidor, o si está listo para recojo y disponible
  if (order.assignedRiderId === rider.id || (order.status === "LISTO_RECOJO" && !order.assignedRiderId)) {
    return true;
  }

  throw new ForbiddenError("Este pedido de delivery está asignado a otro conductor");
}

/**
 * Asegura que un mototaxista solamente consulte o actualice las carreras que tiene asignadas.
 */
export async function assertRiderTripAccess(
  userId: string,
  tripId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { riderProfile: true },
  });

  if (!user) throw new UnauthorizedError();

  if (["SUPERADMIN", "ADMIN", "OPERATOR"].includes(user.role)) {
    return true;
  }

  if (user.role !== "RIDER" && user.role !== "MOTOTAXISTA") {
    throw new ForbiddenError("Solo conductores autorizados pueden acceder a esta carrera");
  }

  const rider = user.riderProfile;
  if (!rider) {
    throw new ForbiddenError("No tienes un perfil de conductor activo");
  }

  const trip = await prisma.rideTrip.findUnique({
    where: { id: tripId },
    select: { id: true, assignedRiderId: true, status: true },
  });

  if (!trip) {
    throw new ForbiddenError("Carrera no encontrada");
  }

  if (trip.assignedRiderId === rider.id || (trip.status === "SOLICITADO" && !trip.assignedRiderId)) {
    return true;
  }

  throw new ForbiddenError("Esta carrera está asignada a otro conductor de mototaxi");
}

/**
 * Asegura que un cliente solamente consulte sus propios pedidos, direcciones o datos personales.
 */
export async function assertCustomerAccess(
  userId: string,
  targetCustomerId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customerProfile: true },
  });

  if (!user) throw new UnauthorizedError();

  if (["SUPERADMIN", "ADMIN", "OPERATOR"].includes(user.role)) {
    return true;
  }

  if (user.customerProfile && user.customerProfile.id === targetCustomerId) {
    return true;
  }

  throw new ForbiddenError("No tienes autorización para consultar información de otro cliente");
}
