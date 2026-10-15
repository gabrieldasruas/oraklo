-- Nicho-piloto do modo teste. Metadados copiados de content/app.ts (id igual ao do front).
-- CNAEs: 4930-2/02 (intermunicipal/interestadual/internacional), 4930-2/03 (mudanças),
-- 4930-2/04 (produtos perigosos).
insert into public.niches (id, group_name, name, description, icon, region, filter, roles, tags)
values (
  'transportadoras-sc',
  'Transporte e logística',
  'Transportadoras em SC',
  'Empresas de transporte rodoviário de cargas com sede ou filiais em Santa Catarina.',
  'truck',
  'Santa Catarina',
  '{"cnaes": ["4930202", "4930203", "4930204"], "ufs": ["SC"]}',
  array['Diretor de operações', 'Gerente de frota', 'Sócio-proprietário'],
  array['Rodoviário', 'Cargas fracionadas', 'Frota própria']
);
