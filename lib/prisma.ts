import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton do Prisma Client (padrão recomendado em Next.js para evitar abrir
// várias conexões a cada request em dev).
//
// POR QUE driver adapter: o Prisma 7 não conecta sozinho — ele usa um "driver
// adapter" (PrismaPg + pg) que recebe a URL do banco. A URL vem da variável de
// ambiente, que só existe no servidor (nunca no frontend).
//
// POR QUE APP_DATABASE_URL (e não DATABASE_URL): a aplicação NÃO conecta como o
// dono do banco. O `neondb_owner` tem a flag BYPASSRLS no Neon — e BYPASSRLS
// ignora RLS por completo, mesmo com FORCE. Por isso usamos o papel `app_user`
// (criado na Fase 2), sem BYPASSRLS: o isolamento entre tenants é garantido
// pelo RLS (policy `tenant_isolation`) + variável `app.tenant_id` definida
// dentro de cada transação (helper de tenancy, Fase 4).
// A `DATABASE_URL` (dona) é usada só pelas migrations (prisma.config.ts).

// FALHA RÁPIDA: se faltar APP_DATABASE_URL, NUNCA cai para a URL do dono.
// O dono tem BYPASSRLS no Neon — se a app conectasse como dono, o isolamento
// entre tenants sumiria silenciosamente. Sem a variável, quebre no boot.
const runtimeUrl = process.env.APP_DATABASE_URL;
if (!runtimeUrl) {
  throw new Error(
    "APP_DATABASE_URL ausente. Configure a variável com a connection string do papel app_user (NUNCA a do dono)."
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: runtimeUrl }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}