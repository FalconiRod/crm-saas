# core/auth — Autenticação

Pasta reservada para a integração com o provedor de autenticação gerenciado.

**Decisão (Fase 1):** usar **Clerk**. Motivo em linguagem simples: o Clerk cuida de
login, cadastro e "Entrar com Google" para nós, sem que a gente guarde senha de
ninguém. Integração de 1 linha no Next.js e painel próprio de gestão de usuários.

**Quando implementar:** Fase 3. O que vai ficar aqui:
- Helpers de sessão (`auth()`, `currentUser()`).
- Webhook que sincroniza o usuário do Clerk com a nossa tabela `users`.
- Nada de código aqui por enquanto — a pasta existe para não fechar portas.