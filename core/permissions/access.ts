// core/permissions — controle de acesso por papel (Fase 9)
// Autorização SEMPRE no servidor: cada server action checa a permissão do
// papel do usuário no tenant ativo antes de executar.

import type { Role } from "@shared/index";

export type Permission =
  | "workspace.view"
  | "company.create"
  | "company.update"
  | "company.delete"
  | "contact.create"
  | "contact.update"
  | "contact.delete"
  | "lead.create"
  | "lead.update"
  | "lead.delete"
  | "lead.move"
  | "task.create"
  | "task.update"
  | "task.delete"
  | "member.invite"
  | "member.updateRole"
  | "member.remove";

/** Permissões por papel (papel mais alto herda as do mais baixo). */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  VIEWER: ["workspace.view"],
  USER: [
    "workspace.view",
    "company.create",
    "company.update",
    "contact.create",
    "contact.update",
    "lead.create",
    "lead.update",
    "lead.move",
    "task.create",
    "task.update",
  ],
  MANAGER: [
    "workspace.view",
    "company.create",
    "company.update",
    "company.delete",
    "contact.create",
    "contact.update",
    "contact.delete",
    "lead.create",
    "lead.update",
    "lead.delete",
    "lead.move",
    "task.create",
    "task.update",
    "task.delete",
  ],
  ADMIN: [
    "workspace.view",
    "company.create",
    "company.update",
    "company.delete",
    "contact.create",
    "contact.update",
    "contact.delete",
    "lead.create",
    "lead.update",
    "lead.delete",
    "lead.move",
    "task.create",
    "task.update",
    "task.delete",
    "member.invite",
    "member.updateRole",
    "member.remove",
  ],
  OWNER: [
    "workspace.view",
    "company.create",
    "company.update",
    "company.delete",
    "contact.create",
    "contact.update",
    "contact.delete",
    "lead.create",
    "lead.update",
    "lead.delete",
    "lead.move",
    "task.create",
    "task.update",
    "task.delete",
    "member.invite",
    "member.updateRole",
    "member.remove",
  ],
};

/** Verifica se o papel tem uma permissão. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Exige permissão; lança 403 caso contrário. */
export function requirePermission(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    const error = new Error("Você não tem permissão para realizar essa ação.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

/** Papéis que podem ser atribuídos a convidados (nunca OWNER — só existe um). */
export const INVITABLE_ROLES: Role[] = ["ADMIN", "MANAGER", "USER", "VIEWER"];