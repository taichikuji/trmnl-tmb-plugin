import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from './render.mjs';
import { alert, fixtures } from './fixtures.mjs';
const modes = ['full','half_horizontal','half_vertical','quadrant'];
for (const mode of modes) {
  test(`${mode}: counts and TMB line cards agree`, async () => {
    const html = await render(mode, fixtures.normal);
    assert.match(html, /4 notices/);
    if (mode !== 'quadrant') assert.match(html, /Hospital de Bellvitge \/ Fondo/);
    assert.equal((html.match(/class="item tmb-line-card"/g) || []).length, { full: 5, half_horizontal: 4, half_vertical: 5, quadrant: 2 }[mode]);
    assert.match(html, /Severe/);
    if (mode === 'full') assert.match(html, /data-url="https:\/\/www\.tmb\.cat\/es\/transporte-barcelona\/estado-red-metro"/);
    else assert.doesNotMatch(html, /class="qr-code"/);
    if (mode === 'quadrant') {
      assert.match(html, /data-line-id="L4"/);
      assert.match(html, /data-line-id="L5"/);
      assert.match(html, /\+3 more/);
    }
  });
  test(`${mode}: missing data is distinct from zero notices`, async () => {
    assert.match(await render(mode, fixtures.empty), /No service notices/);
    const html = await render(mode, fixtures.missing);
    assert.match(html, /Data unavailable/);
    assert.doesNotMatch(html, /No service notices/);
  });
  for (const language of ['English','Spanish','Catalan']) {
    for (const [state, data] of Object.entries(fixtures)) {
      test(`${mode}: ${language} ${state} renders`, async () => {
        const html = await render(mode, data, language);
        assert.doesNotMatch(html, /Liquid error|undefined|NaN/);
        assert.equal((html.match(/class="layout /g) || []).length, 1);
        assert.equal((html.match(/class="title_bar"/g) || []).length, 1);
      });
    }
  }
}

test('half vertical uses the available space for six affected lines', async () => {
  const html = await render('half_vertical', fixtures.website, 'Spanish');
  assert.equal((html.match(/class="item tmb-line-card"/g) || []).length, 6);
  assert.doesNotMatch(html, /class="label label--small lg:label--base tmb-more"/);
});
test('fallback effect codes, FM codes and unknown statuses remain visible', async () => {
  const example = alert({ status: 'NEW_STATUS' });
  delete example.categories.effect_code;
  example.effect = { code: 'NP_TEST' };
  example.entities = [{ line_code: 99 }, { line_code: '99' }];
  const html = await render('half_vertical', { alerts: [example, alert({ code: 'IGNORED' })] });
  assert.match(html, /1 notice/);
  assert.match(html, /1 affected line/);
  assert.match(html, /Paral·lel \/ Parc de Montjuïc/);
  assert.match(html, /NEW_STATUS/);
  assert.equal((html.match(/data-line-id="FM"/g) || []).length, 1);
});
test('external line IDs and instance names are escaped', async () => {
  const html = await render('full', { alerts: [alert({ lines: ['<script>bad()</script>'] })] }, 'English', '<img src=x>');
  assert.doesNotMatch(html, /<script>bad|<img src=x>/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
});

test('full view groups repeated notices into one TMB-style line card', async () => {
  const html = await render('full', { alerts: [
    alert({ id: 2, lines: ['L3'], headline: 'First L3 notice' }),
    alert({ id: 1, lines: ['L3'], headline: 'Second L3 notice' })
  ] });
  assert.match(html, /2 notices/);
  assert.equal((html.match(/data-line-id="L3"/g) || []).length, 1);
  assert.match(html, /Zona Universitària \/ Trinitat Nova/);
});

test('affected-line summary moves to the title bar', async () => {
  for (const mode of modes) {
    const html = await render(mode, fixtures.website, 'Spanish');
    assert.match(html, /<span class="instance">6 líneas afectadas<\/span>/);
    assert.doesNotMatch(html, /<span class="instance">TMB<\/span>/);
  }
  const full = await render('full', fixtures.website, 'Spanish');
  assert.doesNotMatch(full, /VIGENTE<\/span>\s*<span class="label label--small lg:label--base">6 líneas afectadas/);
  const vertical = await render('half_vertical', fixtures.website, 'Spanish');
  assert.doesNotMatch(vertical, /tmb-summary/);
});

test('full view always renders every affected line in a fixed two-column grid', async () => {
  const website = await render('full', fixtures.website);
  const crowded = await render('full', fixtures.crowded);
  assert.equal((website.match(/class="item tmb-line-card"/g) || []).length, 6);
  assert.equal((crowded.match(/class="item tmb-line-card"/g) || []).length, 11);
  assert.match(website, /class="tmb-card-grid [^"]*grid grid--cols-2/);
  assert.doesNotMatch(website, /class="columns tmb-list"/);
});

test('non-array responses are unavailable rather than all clear', async () => {
  for (const alerts of [null, false, 'unavailable', {}, 0]) {
    assert.match(await render('full', { alerts }), /Data unavailable/);
  }
});
