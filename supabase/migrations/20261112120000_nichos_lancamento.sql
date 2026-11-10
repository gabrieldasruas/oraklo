-- Nichos do lançamento (decidido em 09/11): clínicas, imobiliárias e corretores de imóveis, só em SC.
-- Mesmo funil do nicho de transportadoras: só a atividade principal, só matriz e sem empresário
-- individual (o MEI). Os demais nichos ficam sob demanda.
-- Depois de aplicar, rode a importação (GitHub Actions → Importação da Receita → "forçar") para trazer
-- as empresas; até lá os nichos aparecem com zero empresas. Idempotente.
--
-- CNAEs (CNAE 2.3, IBGE):
--   Clínicas:    8630-5/01 ambulatorial com cirurgias · 8630-5/02 ambulatorial com exames complementares
--                8630-5/03 ambulatorial restrita a consultas · 8630-5/04 odontológica
--   Imobiliárias: 6822-6/00 gestão e administração da propriedade imobiliária (aluguel, condomínio)
--   Corretores:  6821-8/01 corretagem na compra e venda e avaliação · 6821-8/02 corretagem no aluguel
-- Ficam de fora 6810-2/01 e 6810-2/02 (compra, venda e aluguel de imóveis PRÓPRIOS): são quase
-- sempre holdings patrimoniais de família, não imobiliárias.

insert into public.niches (id, group_name, name, description, icon, region, filter, roles, tags)
values
  (
    'clinicas',
    'Saúde',
    'Clínicas em SC',
    'Clínicas médicas e odontológicas sediadas em Santa Catarina.',
    'health',
    'Santa Catarina',
    '{"cnaes": ["8630501", "8630502", "8630503", "8630504"], "ufs": ["SC"], "cnae_main_only": true, "headquarters_only": true, "exclude_legal_natures": ["2135"]}',
    array['Sócio-administrador', 'Diretor clínico', 'Gerente administrativo'],
    array['Saúde', 'Consultórios', 'Odontologia']
  ),
  (
    'imobiliarias-sc',
    'Serviços',
    'Imobiliárias em SC',
    'Imobiliárias que administram aluguéis e condomínios, sediadas em Santa Catarina.',
    'building',
    'Santa Catarina',
    '{"cnaes": ["6822600"], "ufs": ["SC"], "cnae_main_only": true, "headquarters_only": true, "exclude_legal_natures": ["2135"]}',
    array['Sócio-administrador', 'Gerente de locação', 'Gerente comercial'],
    array['Imóveis', 'Locação', 'Condomínios']
  ),
  (
    'corretores-imoveis-sc',
    'Serviços',
    'Corretores de imóveis em SC',
    'Empresas de corretagem de compra, venda e aluguel de imóveis sediadas em Santa Catarina.',
    'building',
    'Santa Catarina',
    '{"cnaes": ["6821801", "6821802"], "ufs": ["SC"], "cnae_main_only": true, "headquarters_only": true, "exclude_legal_natures": ["2135"]}',
    array['Sócio-administrador', 'Corretor responsável (CRECI)', 'Gerente comercial'],
    array['Imóveis', 'Vendas', 'Corretagem']
  )
on conflict (id) do update
set group_name = excluded.group_name,
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    region = excluded.region,
    filter = excluded.filter,
    roles = excluded.roles,
    tags = excluded.tags;
