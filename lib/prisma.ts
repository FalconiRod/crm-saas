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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL,
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}