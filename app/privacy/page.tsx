import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade",
  description: "Como tratamos os dados pessoais no CRM SaaS (LGPD).",
};

const h2 = "mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50";
const p = "mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300";
const ul = "mt-3 list-disc space-y-1.5 pl-5 text-sm text-zinc-600 dark:text-zinc-300";

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <article className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Política de Privacidade</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Última atualização: 20 de agosto de 2026
        </p>

        <p className={p}>
          Esta Política explica como a plataforma (&ldquo;<strong>nós</strong>&rdquo;,
          na condição de <strong>operadora</strong> dos dados) trata os dados pessoais que
          você cadastra ao usar o CRM. A pessoa ou empresa que cria o workspace
          (&ldquo;<strong>você</strong>&rdquo;) é a <strong>controladora</strong> dos
          dados dos seus contatos e leads — ou seja, decide quais dados coleta e para quê,
          e é responsável por obter o consentimento das pessoas cadastradas.
        </p>

        <h2 className={h2}>Dados que processamos</h2>
        <ul className={ul}>
          <li>
            <strong>Da sua conta:</strong> nome e e-mail (fornecidos pelo provedor de
            login, Clerk) e o nome do seu workspace.
          </li>
          <li>
            <strong>Dados que você cadastra:</strong> nome, telefone e e-mail de contatos,
            e informações de empresas e oportunidades (leads) que você inserir.
          </li>
        </ul>

        <h2 className={h2}>Para que usamos</h2>
        <ul className={ul}>
          <li>Fazer o CRM funcionar (mostrar e organizar seus contatos e pipeline).</li>
          <li>Isolar os dados por workspace — nenhum cliente enxerga os dados de outro.</li>
          <li>Registros internos de auditoria (quem fez o quê, sem expor conteúdo sensível).</li>
        </ul>

        <h2 className={h2}>Base legal</h2>
        <p className={p}>
          Tratamos os dados da sua conta com base na execução do contrato de uso. Os dados
          dos seus contatos/leads são tratados por sua conta e ordem, sob sua
          responsabilidade como controlador.
        </p>

        <h2 className={h2}>Compartilhamento</h2>
        <p className={p}>
          Não vendemos nem compartilhamos seus dados. Usamos provedores necessários ao
          serviço (hospedagem, banco de dados e autenticação), que atuam como
          subprocessadores com obrigação de sigilo.
        </p>

        <h2 className={h2}>Retenção e exclusão</h2>
        <ul className={ul}>
          <li>
            Você pode excluir contatos, leads e empresas a qualquer momento — a exclusão é
            definitiva (os dados são removidos do banco).
          </li>
          <li>
            Para excluir todo o workspace e todos os dados associados, use{" "}
            <strong>Configurações → Excluir workspace</strong>. A exclusão é irreversível.
          </li>
          <li>
            Para solicitar a exclusão de dados pessoais ou exercer seus direitos (acesso,
            correção, portabilidade), escreva para o contato abaixo.
          </li>
        </ul>

        <h2 className={h2}>Segurança</h2>
        <p className={p}>
          Aplicamos isolamento entre clientes no banco de dados (Row Level Security),
          conexão com menor privilégio e autorização no servidor. Mesmo assim, nenhum
          sistema é 100% seguro: recomendamos senhas fortes e login único (SSO) no provedor
          de autenticação.
        </p>

        <h2 className={h2}>Contato</h2>
        <p className={p}>
          Dúvidas ou solicitações de privacidade: e-mail do responsável pelo workspace
          (definido na criação da conta). Em breve teremos um canal oficial de DPO.
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