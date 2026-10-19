// Regenerates CONTENT_TO_CONFIRM.md from src/assets/data/placeholders.json and
// the places where each placeholder is used.
// Usage: node scripts/content-to-confirm.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA = 'src/assets/data';
const { groups } = JSON.parse(readFileSync(join(DATA, 'placeholders.json'), 'utf8'));

const usage = new Map();
function walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry !== 'schema') walkFiles(p);
    } else if (entry.endsWith('.json') && entry !== 'placeholders.json') {
      const rel = p.replace(/\\/g, '/').replace(`${DATA}/`, '');
      for (const m of readFileSync(p, 'utf8').matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)) {
        if (!usage.has(m[1])) usage.set(m[1], new Set());
        usage.get(m[1]).add(rel);
      }
    }
  }
}
walkFiles(DATA);

const total = groups.reduce((n, g) => n + Object.keys(g.items).length, 0);
let md = `# Conteúdo a confirmar — Tax Advisory

> Gerado por \`node scripts/content-to-confirm.mjs\` a partir de \`src/assets/data/placeholders.json\`.
> Não editar à mão: actualizar o JSON e voltar a gerar.

Esta demonstração usa apenas os instrumentos e valores fornecidos na apresentação ao cliente. Sempre que um valor é
necessário mas não foi confirmado, o texto usa um marcador \`{{NOME}}\`, apresentado na aplicação como
**«a confirmar»**. Há **${total} marcadores** a rever. Todas as entradas da base jurídica estão marcadas como
\`illustrative\` (Ilustrativo) até revisão.

Para confirmar um valor: substituir o marcador pelo texto final em PT, EN e FR nos ficheiros indicados, remover a
entrada de \`placeholders.json\` e correr \`npm run check\`.

`;

for (const g of groups) {
  md += `## ${g.title}\n\n| Marcador | O que confirmar | Onde é usado |\n|---|---|---|\n`;
  for (const [key, desc] of Object.entries(g.items)) {
    const where =
      [...(usage.get(key) ?? [])]
        .sort()
        .map((f) => `\`${f}\``)
        .join(', ') || '—';
    md += `| \`{{${key}}}\` | ${desc} | ${where} |\n`;
  }
  md += '\n';
}

md += `## Outros pressupostos a validar

Estes pontos não são marcadores, mas foram assumidos para a demonstração e devem ser revistos:

| Tema | Pressuposto | Onde |
|---|---|---|
| Câmbio | Taxa indicativa **USD 1 = MZN 63,9**, usada apenas para comparar o investimento com o IDE mínimo de MZN 6,5 milhões. | \`rules/apiex.json\` (\`fxUsdMzn\`) |
| Calendário fiscal | IVA mensal e pagamentos por conta calculados, a título indicativo, no último dia útil do mês. | \`rules/obligations.json\` |
| Feriados | Feriados nacionais de 2026–2027; feriado ao domingo gozado na segunda-feira (5 Out. 2026). | \`holidays.json\` |
| Ambiente | Categoria ambiental provável por sector (agro-indústria, turismo, logística, petróleo e gás: B; mineração: A; energia/serviços: C). | \`rules/sectors.json\` |
| Veículo | Sucursal recomendada para EPC solar com capital 100% estrangeiro; Lda nos restantes casos. Regras de orientação, não parecer. | \`rules/vehicles.json\` |
| Financiamento | Notas de DFI e Padrões da IFC mostradas a partir de USD 1 milhão (heurística de apresentação). | \`rules/zones.json\` |
| Corredores | Associação de províncias aos corredores de Nacala, Beira e Maputo. | \`rules/zones.json\` |
| Base jurídica | Títulos descritivos atribuídos a: DL 1/2022 (Código Comercial), Dec. 41/2026 (licenciamento de actividades económicas), Dec. 88/2024 (contratação de estrangeiros), Lei 11/2016 (regime aduaneiro), Aviso 3/GBM/2024 (registo do IDE), Aviso 4/GBM/2024 (empréstimos externos e transferências), Lei 21/2014 (Lei dos Petróleos). | \`knowledge-base.json\` |
| Respostas | Aviso 4/GBM/2024 citado como regulamentação cambial geral em \`exchange-2\` e \`exchange-3\`. | \`qa/answers.json\` |
| Excertos | Os excertos da base jurídica são paráfrases ilustrativas, não citações literais. | \`knowledge-base.json\` |
`;

writeFileSync('CONTENT_TO_CONFIRM.md', md);
console.log(`✓ CONTENT_TO_CONFIRM.md written (${total} placeholders).`);
