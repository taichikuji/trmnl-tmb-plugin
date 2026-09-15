import { readFileSync } from 'node:fs';
import { Liquid } from 'liquidjs';

// Lightweight Liquid regression checks. TRMNL's native Ruby renderer remains
// the final integration check; inline `template` blocks are exposed as partials.
export async function render(mode, data, language = 'English', name = 'TMB Alerts') {
  const partials = new Map();
  const shared = readFileSync(new URL('../TRMNL/src/shared.liquid', import.meta.url), 'utf8')
    .replace(/{% template (\w+) %}([\s\S]*?){% endtemplate %}/g, (_, key, body) => {
      partials.set(key, body); return '';
    });
  const engine = new Liquid({
    strictFilters: true,
    relativeReference: false,
    fs: {
      resolve: (_, file) => file,
      exists: async file => partials.has(file),
      existsSync: file => partials.has(file),
      readFile: async file => partials.get(file),
      readFileSync: file => partials.get(file),
      contains: () => true
    }
  });
  engine.registerFilter('json', value => JSON.stringify(value ?? null));
  engine.registerFilter('base64_encode', value => Buffer.from(value).toString('base64'));
  engine.registerFilter('qr_code', value => `<svg class="qr-code" data-url="${value}" viewBox="0 0 9 9"><path d="M0 0h3v3H0zm6 0h3v3H6zM0 6h3v3H0zm4-2h1v1H4zm2 0h1v1H6zM4 6h1v1H4zm2 1h1v2H6zm2-3h1v3H8zM4 8h1v1H4z"/></svg>`);
  return engine.parseAndRender(shared + readFileSync(new URL(`../TRMNL/src/${mode}.liquid`, import.meta.url), 'utf8'), {
    data,
    trmnl: { plugin_settings: { instance_name: name, custom_fields_values: { userLanguage: language } } }
  });
}
