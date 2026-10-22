import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import { Glass, Micro } from "@/components/app/ui";

export const metadata: Metadata = {
  title: `Privacidade — ${site.name}`,
  description: "Como o Oraklo trata dados de empresas, de contatos e de quem usa a plataforma (LGPD).",
};

const SECOES: { t: string; p: string[] }[] = [
  {
    t: "De onde vêm os dados das empresas",
    p: [
      "As empresas exibidas vêm do cadastro público de CNPJ divulgado pela Receita Federal (dados abertos): razão social, atividade (CNAE), porte, capital social, endereço e os contatos que a própria empresa informou à Receita.",
      "Nomes de sócios aparecem só para usuários logados, com a qualificação informada à Receita. Não importamos CPF.",
    ],
  },
  {
    t: "Para que usamos",
    p: [
      "Para ajudar empresas a encontrar e contatar outras empresas com fins comerciais (prospecção B2B), com base no legítimo interesse previsto na LGPD (art. 7º, IX).",
      "Não vendemos listas de pessoas físicas nem usamos os dados para outra finalidade.",
    ],
  },
  {
    t: "E-mails enviados pelo Oraklo",
    p: [
      "Todo e-mail enviado pela plataforma tem um link para a pessoa sair da lista. Ao clicar, nenhum outro e-mail daquele remetente é enviado pelo Oraklo e o contato é marcado como “sem interesse”.",
      "Quem envia é responsável pelo conteúdo da mensagem e por respeitar os pedidos de descadastro.",
    ],
  },
  {
    t: "Dados de quem usa a plataforma",
    p: [
      "Guardamos seu nome, e-mail, os leads, notas, tarefas e o portfólio que você cria, isolados por workspace. Só você e as pessoas do seu workspace têm acesso.",
      "Usamos fornecedores para operar o serviço: hospedagem (Vercel), banco de dados (Supabase) e envio de e-mail (Resend).",
    ],
  },
  {
    t: "Seus direitos",
    p: [
      "Empresas e titulares podem pedir acesso, correção ou remoção dos seus dados a qualquer momento.",
      `Escreva para ${site.email}. Respondemos em até 15 dias.`,
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <>
      <PageHeader index="11" title="Privacidade" description="Como tratamos dados de empresas, de contatos e de quem usa o Oraklo, de acordo com a LGPD." />
      <div className="grid gap-4 lg:grid-cols-2">
        {SECOES.map((s, i) => (
          <Glass key={s.t} className="p-7">
            <Micro>{String(i + 1).padStart(2, "0")}</Micro>
            <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em]">{s.t}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed opacity-70">
              {s.p.map((x) => (
                <p key={x}>{x}</p>
              ))}
            </div>
          </Glass>
        ))}
      </div>
      <p className="mt-6 px-1 font-mono text-[10px] uppercase tracking-widest opacity-45">Atualizado em outubro de 2026</p>
    </>
  );
}
