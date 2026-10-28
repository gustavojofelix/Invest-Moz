/**
 * Browser-only file helpers shared by documents and aftercare. Nothing leaves
 * the device: files are built in memory and handed to the browser as a Blob.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Saves `content` as a file through a temporary object URL. */
export function downloadFile(doc: Document, name: string, content: string, mime: string): void {
  const view = doc.defaultView;
  if (!view?.URL?.createObjectURL) return;
  const url = view.URL.createObjectURL(new Blob([content], { type: mime }));
  const a = doc.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  view.setTimeout(() => view.URL.revokeObjectURL(url), 1000);
}

/** A small standalone HTML page (printable checklist, pre-filled template). */
export function htmlPage(lang: string, dir: string, title: string, body: string): string {
  return `<!doctype html>
<html lang="${escapeHtml(lang)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#14171a;line-height:1.5}
h1{font-size:1.5rem;margin:0 0 .25rem}h2{font-size:1.1rem;margin-top:1.5rem}
table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{text-align:start;padding:.5rem;border-bottom:1px solid #e3dccb;vertical-align:top}
th{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#586059}
.muted{color:#586059;font-size:.875rem}.field{border-bottom:1px dotted #9a9a9a;min-height:1.5rem}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}
