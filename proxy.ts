import { NextResponse } from "next/server";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { clerkEnabled } from "@/lib/clerk";

// Em Next.js 16, o antigo "middleware" virou "proxy" (mesma função, novo nome).
// O Clerk precisa rodar aqui para `auth()` funcionar nas páginas do servidor.
let clerkProxy: NextMiddleware | null = null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Sem as chaves do Clerk, o proxy apenas deixa a requisição passar (o app
  // mostra a tela de configuração em vez de autenticação).
  if (!clerkEnabled) return NextResponse.next();
  if (!clerkProxy) {
    // Clerk v7: publicRoutes não está nos tipos desta versão; desabilitar regra p/ este caso.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clerkProxy = clerkMiddleware({ publicRoutes: ["/", "/privacy", "/terms"] } as any);
  }
  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    // Roda em quase tudo, exceto assets estáticos (recomendação oficial do Clerk).
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};