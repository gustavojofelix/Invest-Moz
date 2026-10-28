# Conteúdo a confirmar — Tax Advisory

> Gerado por `node scripts/content-to-confirm.mjs` a partir de `src/assets/data/placeholders.json`.
> Não editar à mão: actualizar o JSON e voltar a gerar.

Esta demonstração usa apenas os instrumentos e valores fornecidos na apresentação ao cliente. Sempre que um valor é
necessário mas não foi confirmado, o texto usa um marcador `{{NOME}}`, apresentado na aplicação como
**«a confirmar»**. Há **33 marcadores** a rever. Todas as entradas da base jurídica estão marcadas como
`illustrative` (Ilustrativo) até revisão.

Para confirmar um valor: substituir o marcador pelo texto final em PT, EN e FR nos ficheiros indicados, remover a
entrada de `placeholders.json` e correr `npm run check`.

## Sociedades e licenciamento

| Marcador | O que confirmar | Onde é usado |
|---|---|---|
| `{{SAS_REQUIREMENTS}}` | Requisitos da SAS (capital, número de sócios, órgãos). A existência da forma está confirmada no Business Guide 2025. | `qa/answers.json`, `rules/vehicles.json` |
| `{{MIN_SHARE_CAPITAL}}` | Capital social mínimo para Lda, SA e SAS. | `qa/answers.json` |
| `{{FOREIGN_DOCS_LEGALISATION}}` | Legalização e tradução exigidas para documentos de sócios estrangeiros. | `qa/answers.json` |
| `{{BRANCH_REGISTRATION_TIME}}` | Prazo indicativo para registo de sucursal e obtenção do NUIT. | `rules/roadmap.json` |
| `{{BRANCH_PROFIT_REMITTANCE_TAX}}` | Tratamento fiscal da remessa de lucros da sucursal para a sede. | `qa/answers.json` |
| `{{AUDIT_REQUIREMENT_THRESHOLD}}` | Critérios de dimensão que tornam obrigatória a auditoria de contas. | `rules/vehicles.json` |
| `{{BAU_SERVICES_BY_PROVINCE}}` | Serviços efectivamente prestados por cada BAU provincial. | `qa/answers.json`, `rules/licences.json` |
| `{{SECTOR_LICENCE_MATRIX}}` | Actividades sujeitas a licença sectorial e entidade competente (Dec. 41/2026). | `qa/answers.json`, `rules/licences.json` |
| `{{SECTOR_LICENCE_TIME}}` | Prazo indicativo das licenças sectoriais. | `rules/roadmap.json` |
| `{{PENALTIES_UNLICENSED_ACTIVITY}}` | Multas e medidas por exercício de actividade sem licença. | `qa/answers.json` |

## Impostos e benefícios fiscais

| Marcador | O que confirmar | Onde é usado |
|---|---|---|
| `{{VAT_MONTHLY_RETURN_DEADLINE}}` | Prazo legal da declaração periódica e pagamento do IVA (o calendário usa, a título indicativo, o último dia útil do mês). | `qa/answers.json`, `rules/obligations.json` |
| `{{IRPC_PAYMENT_ON_ACCOUNT_BASIS}}` | Dia exacto e base de cálculo dos pagamentos por conta (Maio, Julho, Setembro). | `qa/answers.json`, `rules/obligations.json` |
| `{{ITC_RATE_BY_LOCATION}}` | Correspondência entre localizações e a taxa do crédito fiscal (5% a 10%). | `qa/answers.json`, `rules/incentives.json` |
| `{{ACCELERATED_DEPRECIATION_FACTOR}}` | Taxa ou factor de amortização acelerada (Lei 4/2009). | `qa/answers.json`, `rules/incentives.json` |
| `{{TRAINING_DEDUCTION_LIMIT}}` | Limite da dedução de despesas de formação de trabalhadores moçambicanos. | `qa/answers.json`, `rules/incentives.json` |
| `{{CLASS_K_SCOPE_DETAIL}}` | Bens incluídos e excluídos da Classe K. | `qa/answers.json`, `rules/incentives.json` |

## Trabalho e imigração

| Marcador | O que confirmar | Onde é usado |
|---|---|---|
| `{{QUOTA_COMMUNICATION_DEADLINE}}` | Prazo para comunicar contratação de estrangeiro dentro da quota. | `qa/answers.json` |
| `{{FOREIGN_CONTRACT_MAX_TERM}}` | Duração máxima e renovação dos contratos de trabalhadores estrangeiros. | `qa/answers.json` |
| `{{INSS_CONTRIBUTION_RATES}}` | Taxas de contribuição para o INSS (entidade empregadora e trabalhador). Atenção: o Guia APIEX 2026 indica 7% + 3%, o que diverge dos 4% + 3% habituais; confirmar a taxa em vigor. | `qa/answers.json` |
| `{{INSS_FOREIGN_WORKER_EXEMPTION}}` | Isenção do INSS para estrangeiros cobertos por segurança social no país de origem. | `qa/answers.json` |
| `{{WORK_PERMIT_PROCESSING_TIME}}` | Prazo de tramitação da autorização de trabalho. | `qa/answers.json`, `rules/roadmap.json` |
| `{{WORK_VISA_PROCESSING_TIME}}` | Prazo de emissão do visto de trabalho. | `qa/answers.json` |
| `{{DIRE_PROCESSING_TIME}}` | Prazo de emissão do DIRE. | `qa/answers.json` |
| `{{DIRE_VALIDITY}}` | Validade do DIRE. | `qa/answers.json` |
| `{{RENEWAL_LEAD_TIME}}` | Antecedência recomendada para renovar autorização de trabalho e DIRE. | `qa/answers.json`, `rules/obligations.json` |

## Câmbios e alfândegas

| Marcador | O que confirmar | Onde é usado |
|---|---|---|
| `{{TEMPORARY_IMPORT_PERIOD}}` | Prazo máximo da importação temporária. | `qa/answers.json`, `rules/triggers.json` |
| `{{TEMP_IMPORT_PROCESSING_TIME}}` | Prazo de tramitação do pedido de importação temporária. | `rules/roadmap.json` |

## Terra, ambiente e zonas

| Marcador | O que confirmar | Onde é usado |
|---|---|---|
| `{{COASTAL_PROTECTION_RULE}}` | Zonas de protecção parcial costeira e restrições de construção (Lei 19/97). | `rules/triggers.json` |

## Conteúdo local e GNL

| Marcador | O que confirmar | Onde é usado |
|---|---|---|
| `{{LOCAL_CONTENT_PRICE_MARGIN}}` | Margem de preferência para bens e serviços moçambicanos (Lei 21/2014). | `qa/answers.json`, `rules/triggers.json` |
| `{{LOCAL_PARTNER_MIN_SHARE}}` | Participação moçambicana mínima em parcerias de fornecimento ao sector petrolífero. | `qa/answers.json`, `rules/triggers.json` |
| `{{SUPPLIER_REGISTRATION_TIME}}` | Prazo indicativo de registo e qualificação como fornecedor dos operadores. | `rules/roadmap.json` |
| `{{SCOPE_DEC_9_2017}}` | Âmbito do Decreto n.º 9/2017. | `knowledge-base.json`, `qa/answers.json` |
| `{{SCOPE_DEC_70_2017}}` | Âmbito do Decreto n.º 70/2017. | `knowledge-base.json`, `qa/answers.json` |

## Outros pressupostos a validar

Estes pontos não são marcadores, mas foram assumidos para a demonstração e devem ser revistos:

| Tema | Pressuposto | Onde |
|---|---|---|
| Câmbio | Taxa indicativa **USD 1 = MZN 63,9**, usada apenas para comparar o investimento com o IDE mínimo de MZN 6,5 milhões. | `rules/apiex.json` (`fxUsdMzn`) |
| Calendário fiscal | IVA mensal e pagamentos por conta calculados, a título indicativo, no último dia útil do mês. | `rules/obligations.json` |
| Feriados | Feriados nacionais de 2026–2027; feriado ao domingo gozado na segunda-feira (5 Out. 2026). | `holidays.json` |
| Ambiente | Categoria ambiental provável por sector (agro-indústria, turismo, logística, petróleo e gás: B; mineração: A; energia/serviços: C). | `rules/sectors.json` |
| Veículo | Sucursal recomendada para EPC solar com capital 100% estrangeiro; Lda nos restantes casos. Regras de orientação, não parecer. | `rules/vehicles.json` |
| Financiamento | Notas de DFI e Padrões da IFC mostradas a partir de USD 1 milhão (heurística de apresentação). | `rules/zones.json` |
| Corredores | Associação de províncias aos corredores de Nacala, Beira e Maputo. | `rules/zones.json` |
| Base jurídica | Títulos descritivos atribuídos a: DL 1/2022 (Código Comercial), Dec. 41/2026 (licenciamento de actividades económicas), Dec. 88/2024 (contratação de estrangeiros), Lei 11/2016 (regime aduaneiro), Aviso 3/GBM/2024 (registo do IDE), Aviso 4/GBM/2024 (empréstimos externos e transferências), Lei 21/2014 (Lei dos Petróleos). | `knowledge-base.json` |
| Respostas | Aviso 4/GBM/2024 citado como regulamentação cambial geral em `exchange-2` e `exchange-3`. | `qa/answers.json` |
| Excertos | Os excertos da base jurídica são paráfrases ilustrativas, não citações literais. | `knowledge-base.json` |
