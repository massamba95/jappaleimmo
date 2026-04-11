export type Role = "ADMIN" | "MANAGER" | "AGENT" | "ACCOUNTANT" | "SECRETARY";

export type Permission =
  | "properties:create"
  | "properties:edit"
  | "properties:delete"
  | "properties:view"
  | "tenants:create"
  | "tenants:edit"
  | "tenants:delete"
  | "tenants:view"
  | "leases:create"
  | "leases:edit"
  | "leases:delete"
  | "leases:view"
  | "payments:create"
  | "payments:view"
  | "team:manage"
  | "settings:org";

const ALL_VIEW_CREATE_EDIT: Permission[] = [
  "properties:create", "properties:edit", "properties:view",
  "tenants:create", "tenants:edit", "tenants:view",
  "leases:create", "leases:edit", "leases:view",
  "payments:create", "payments:view",
];

const DELETE_PERMS: Permission[] = [
  "properties:delete", "tenants:delete", "leases:delete",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    ...ALL_VIEW_CREATE_EDIT,
    ...DELETE_PERMS,
    "team:manage", "settings:org",
  ],
  MANAGER: [
    ...ALL_VIEW_CREATE_EDIT,
    ...DELETE_PERMS,
  ],
  AGENT: [
    ...ALL_VIEW_CREATE_EDIT,
  ],
  ACCOUNTANT: [
    ...ALL_VIEW_CREATE_EDIT,
  ],
  SECRETARY: [
    ...ALL_VIEW_CREATE_EDIT,
  ],
};

export function hasPermission(role: string | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function canAccess(role: string | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
