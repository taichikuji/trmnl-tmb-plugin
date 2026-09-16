import { expect, test } from 'bun:test';
import { render } from './render.mjs';
import { alert, fixtures } from './fixtures.mjs';
const modes = ['full','half_horizontal','half_vertical','quadrant'];
for (const mode of modes) {
  test(`${mode}: counts and TMB line cards agree`, async () => {
    const html = await render(mode, fixtures.normal);
    expect(html).toMatch(/4 notices/);
    if (mode !== 'quadrant') expect(html).toMatch(/Hospital de Bellvitge \/ Fondo/);
    expect((html.match(/class="item tmb-line-card"/g) || []).length).toBe({ full: 5, half_horizontal: 4, half_vertical: 5, quadrant: 2 }[mode]);
    expect(html).toMatch(/Severe/);
    if (mode === 'full') expect(html).toMatch(/data-url="https:\/\/www\.tmb\.cat\/es\/transporte-barcelona\/estado-red-metro"/);
    else expect(html).not.toMatch(/class="qr-code"/);
    if (mode === 'quadrant') {
      expect(html).toMatch(/data-line-id="L4"/);
      expect(html).toMatch(/data-line-id="L5"/);
      expect(html).toMatch(/\+3 more/);
    }
  });
  test(`${mode}: missing data is distinct from zero notices`, async () => {
    expect(await render(mode, fixtures.empty)).toMatch(/No service notices/);
    const html = await render(mode, fixtures.missing);
    expect(html).toMatch(/Data unavailable/);
    expect(html).not.toMatch(/No service notices/);
  });
  for (const language of ['English','Spanish','Catalan']) {
    for (const [state, data] of Object.entries(fixtures)) {
      test(`${mode}: ${language} ${state} renders`, async () => {
        const html = await render(mode, data, language);
        expect(html).not.toMatch(/Liquid error|undefined|NaN/);
        expect((html.match(/class="layout /g) || []).length).toBe(1);
        expect((html.match(/class="title_bar"/g) || []).length).toBe(1);
      });
    }
  }
}

test('half vertical uses the available space for six affected lines', async () => {
  const html = await render('half_vertical', fixtures.website, 'Spanish');
  expect((html.match(/class="item tmb-line-card"/g) || []).length).toBe(6);
  expect(html).not.toMatch(/class="label label--small lg:label--base tmb-more"/);
});
test('fallback effect codes, FM codes and unknown statuses remain visible', async () => {
  const example = alert({ status: 'NEW_STATUS' });
  delete example.categories.effect_code;
  example.effect = { code: 'NP_TEST' };
  example.entities = [{ line_code: 99 }, { line_code: '99' }];
  const html = await render('half_vertical', { alerts: [example, alert({ code: 'IGNORED' })] });
  expect(html).toMatch(/1 notice/);
  expect(html).toMatch(/1 affected line/);
  expect(html).toMatch(/Paral·lel \/ Parc de Montjuïc/);
  expect(html).toMatch(/NEW_STATUS/);
  expect((html.match(/data-line-id="FM"/g) || []).length).toBe(1);
});
test('external line IDs and instance names are escaped', async () => {
  const html = await render('full', { alerts: [alert({ lines: ['<script>bad()</script>'] })] }, 'English', '<img src=x>');
  expect(html).not.toMatch(/<script>bad|<img src=x>/);
  expect(html).toMatch(/&lt;script&gt;bad\(\)&lt;\/script&gt;/);
});

test('full view groups repeated notices into one TMB-style line card', async () => {
  const html = await render('full', { alerts: [
    alert({ id: 2, lines: ['L3'], headline: 'First L3 notice' }),
    alert({ id: 1, lines: ['L3'], headline: 'Second L3 notice' })
  ] });
  expect(html).toMatch(/2 notices/);
  expect((html.match(/data-line-id="L3"/g) || []).length).toBe(1);
  expect(html).toMatch(/Zona Universitària \/ Trinitat Nova/);
});

test('affected-line summary moves to the title bar', async () => {
  for (const mode of modes) {
    const html = await render(mode, fixtures.website, 'Spanish');
    expect(html).toMatch(/<span class="instance">6 líneas afectadas<\/span>/);
    expect(html).not.toMatch(/<span class="instance">TMB<\/span>/);
  }
  const full = await render('full', fixtures.website, 'Spanish');
  expect(full).not.toMatch(/VIGENTE<\/span>\s*<span class="label label--small lg:label--base">6 líneas afectadas/);
  const vertical = await render('half_vertical', fixtures.website, 'Spanish');
  expect(vertical).not.toMatch(/tmb-summary/);
});

test('full view always renders every affected line in a fixed two-column grid', async () => {
  const website = await render('full', fixtures.website);
  const crowded = await render('full', fixtures.crowded);
  expect((website.match(/class="item tmb-line-card"/g) || []).length).toBe(6);
  expect((crowded.match(/class="item tmb-line-card"/g) || []).length).toBe(11);
  expect(website).toMatch(/class="tmb-card-grid [^"]*grid grid--cols-2/);
  expect(website).not.toMatch(/class="columns tmb-list"/);
});

test('non-array responses are unavailable rather than all clear', async () => {
  for (const alerts of [null, false, 'unavailable', {}, 0]) {
    expect(await render('full', { alerts })).toMatch(/Data unavailable/);
  }
});
