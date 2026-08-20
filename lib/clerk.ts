// "Modo configuração" do Clerk: o app roda normalmente mesmo sem as chaves e
// mostra uma tela explicando como preencher. Só liga o Clerk quando as duas
// chaves existirem no ambiente. Isso evita o app quebrar antes do dono
// configurar, e permite o build/deploy sem segredos.
export const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
);