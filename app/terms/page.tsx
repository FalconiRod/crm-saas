import Link from "next/link";

export const metadata = {
  title: "Termos de Uso",
  description: "Termos e condições de uso do CRM SaaS.",
};

const h2 = "mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50";
const p = "mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300";
const ul = "mt-3 list-disc space-y-1.5 pl-5 text-sm text-zinc-600 dark:text-zinc-300";

export default function TermsPage() {
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <article className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Termos de Uso</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Última atualização: 20 de agosto de 2026
        </p>

        <p className={p}>
          Ao usar este CRM (&ldquo;<strong>plataforma</strong>&rdquo;), você concorda com
          estes Termos. &ldquo;<strong>Você</strong>&rdquo; é a pessoa ou empresa que cria
          o workspace e usa o serviço.
        </p>

        <h2 className={h2}>1. Sua conta e responsabilidades</h2>
        <ul className={ul}>
          <li>Você é responsável pelas informações que cadastra e por manter sua conta segura.</li>
          <li>
            <strong>Você é o controlador</strong> dos dados dos seus contatos e leads —
            cabe a você obter o consentimento dessas pessoas e usar os dados conforme a
            LGPD e demais leis aplicáveis. A plataforma atua como <strong>operadora</strong>.
          </li>
          <li>Não use a plataforma para finalidades ilegais ou para dados que você não tem direito de tratar.</li>
        </ul>

        <h2 className={h2}>2. Isolamento dos dados</h2>
        <p className={p}>
          Cada workspace é isolado dos demais. Outros clientes não têm acesso aos seus
          dados. Os dados ficam no provedor de banco de dados contratado para o serviço.
        </p>

        <h2 className={h2}>3. Disponibilidade e suporte</h2>
        <p className={p}>
          Buscamos manter o serviço estável, mas não garantimos disponibilidade contínua.
          Não nos responsabilizamos por perda de dados decorrente de uso indevido, falta
          de backup do seu lado ou eventos fora do nosso controle. Recomendamos cautela ao
          excluir registros — a exclusão é irreversível.
        </p>

        <h2 className={h2}>4. Planos e cobrança</h2>
        <p className={p}>
          O plano de cada workspace define limites de uso. Eventuais pagamentos serão
          informados antes da contratação. Enquanto não há cobrança ativa, todos os
          workspaces usam o plano Individual.
        </p>

        <h2 className={h2}>5. Exclusão dos seus dados</h2>
        <p className={p}>
          Você pode excluir seus registros e o workspace a qualquer momento. A exclusão é
          definitiva e remove os dados do banco. Solicitações de privacidade seguem a{" "}
          <Link href="/privacy" className="text-zinc-800 underline hover:text-zinc-900 dark:text-zinc-200">
            Política de Privacidade
          </Link>
          .
        </p>

        <h2 className={h2}>6. Alterações destes Termos</h2>
        <p className={p}>
          Podemos atualizar estes Termos; mudanças relevantes serão comunicadas no
          produto. O uso continuado após a atualização implica aceitação.
        </p>

        <p className="mt-10">
          <Link href="/" className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400">
            ← Voltar ao início
          </Link>
        </p>
      </article>
    </main>
  );
}