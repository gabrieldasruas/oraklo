-- Estados prioritários da Busca avançada: SP e RJ (SC já vem do nicho-piloto).
-- A importação da Receita (npm run import:receita) só traz empresas que casam com algum nicho,
-- então estes nichos fazem as transportadoras de SP e RJ entrarem na base.
-- Mesmos CNAEs do piloto: 4930-2/02, 4930-2/03 e 4930-2/04.
insert into public.niches (id, group_name, name, description, icon, region, filter, roles, tags)
values
  (
    'transportadoras-sp',
    'Transporte e logística',
    'Transportadoras em SP',
    'Empresas de transporte rodoviário de cargas com sede ou filiais em São Paulo.',
    'truck',
    'São Paulo',
    '{"cnaes": ["4930202", "4930203", "4930204"], "ufs": ["SP"]}',
    array['Diretor de operações', 'Gerente de frota', 'Sócio-proprietário'],
    array['Rodoviário', 'Cargas fracionadas', 'Frota própria']
  ),
  (
    'transportadoras-rj',
    'Transporte e logística',
    'Transportadoras no RJ',
    'Empresas de transporte rodoviário de cargas com sede ou filiais no Rio de Janeiro.',
    'truck',
    'Rio de Janeiro',
    '{"cnaes": ["4930202", "4930203", "4930204"], "ufs": ["RJ"]}',
    array['Diretor de operações', 'Gerente de frota', 'Sócio-proprietário'],
    array['Rodoviário', 'Cargas fracionadas', 'Frota própria']
  )
on conflict (id) do nothing;
