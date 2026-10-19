// Invest Moz uses Mozambican Portuguese with pre-AO90 orthography on purpose
// (projecto, actividade, acção, sector, director…). This check flags common
// AO90/Brazilian forms in the Portuguese UI strings and in the `pt` values of
// every data file.
// Usage: node scripts/check-orthography.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// AO90 / Brazilian form → expected pre-AO90 form
const FORMS = {
  projeto: 'projecto',
  projetos: 'projectos',
  atividade: 'actividade',
  atividades: 'actividades',
  ação: 'acção',
  ações: 'acções',
  acionista: 'accionista',
  acionistas: 'accionistas',
  exceção: 'excepção',
  exceções: 'excepções',
  excecional: 'excepcional',
  setor: 'sector',
  setores: 'sectores',
  setorial: 'sectorial',
  direção: 'direcção',
  diretor: 'director',
  direta: 'directa',
  direto: 'directo',
  diretamente: 'directamente',
  ótimo: 'óptimo',
  objetivo: 'objectivo',
  objetivos: 'objectivos',
  efetivo: 'efectivo',
  efetivos: 'efectivos',
  efetiva: 'efectiva',
  coletivo: 'colectivo',
  coletiva: 'colectiva',
  fatura: 'factura',
  faturas: 'facturas',
  faturação: 'facturação',
  adoção: 'adopção',
  receção: 'recepção',
  inspeção: 'inspecção',
  proteção: 'protecção',
  seleção: 'selecção',
  aspeto: 'aspecto',
  aspetos: 'aspectos',
  respetivo: 'respectivo',
  respetiva: 'respectiva',
  contato: 'contacto',
  contatos: 'contactos',
  atual: 'actual',
  atuais: 'actuais',
  atualmente: 'actualmente',
  atualizado: 'actualizado',
  atualização: 'actualização',
  ativo: 'activo',
  ativos: 'activos',
  exato: 'exacto',
  exata: 'exacta',
  exatamente: 'exactamente',
  afeto: 'afecto',
  afeta: 'afecta',
  afetos: 'afectos',
  eletrónico: 'electrónico',
  eletrónica: 'electrónica',
  eletricidade: 'electricidade',
  infraestrutura: 'infra-estrutura',
  infraestruturas: 'infra-estruturas',
  ata: 'acta',
  atas: 'actas',
  coleta: 'colecta',
  perspetiva: 'perspectiva',
  redação: 'redacção',
};
const PATTERNS = Object.entries(FORMS)
  .filter(([, v]) => v)
  .map(([bad, good]) => ({ bad, good, re: new RegExp(`(?<![\\p{L}])${bad}(?![\\p{L}])`, 'giu') }));

const hits = [];
function check(text, where) {
  for (const p of PATTERNS) {
    for (const m of text.matchAll(p.re)) {
      // "fato" (suit) etc. are not listed; "ata" must be a whole word, matched above.
      hits.push(`${where}: "${m[0]}" → use "${p.good}"`);
    }
  }
}

function walkPt(node, path, inPt = false) {
  if (typeof node === 'string') {
    if (inPt) check(node, path);
    return;
  }
  if (Array.isArray(node)) return node.forEach((n, i) => walkPt(n, `${path}[${i}]`, inPt));
  if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walkPt(v, `${path}.${k}`, inPt || k === 'pt');
}

function walkFiles(dir, onFile) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walkFiles(p, onFile);
    else if (entry.endsWith('.json')) onFile(p.replace(/\\/g, '/'));
  }
}

let files = 0;
// UI strings: every pt.json (global and scopes) is entirely Portuguese.
walkFiles('src/assets/i18n', (p) => {
  if (!p.endsWith('/pt.json')) return;
  files++;
  walkPt(JSON.parse(readFileSync(p, 'utf8')), p, true);
});
// Data: only values under a "pt" key (plus seeded PT enquiries' free text).
walkFiles('src/assets/data', (p) => {
  if (p.includes('/schema/')) return;
  files++;
  const json = JSON.parse(readFileSync(p, 'utf8'));
  walkPt(json, p);
  if (p.endsWith('enquiries.json')) {
    for (const e of json.enquiries) {
      if (e.locale === 'pt') check(e.message, `${p} ${e.ref}.message`);
      for (const n of e.notes) check(n.text, `${p} ${e.ref}.note`);
    }
  }
  if (p.endsWith('projects.json'))
    for (const pr of json.projects) check(pr.input.idea, `${p} ${pr.ref}.idea`);
});

if (hits.length) {
  console.error(`✗ Orthography check failed — AO90/Brazilian forms found (${hits.length}):`);
  for (const h of hits) console.error('  - ' + h);
  process.exit(1);
}
console.log(
  `✓ Orthography: pre-AO90 Portuguese in ${files} files (${PATTERNS.length} forms checked).`,
);
