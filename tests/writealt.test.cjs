const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WriteAlt } = require('../dist/nodes/WriteAlt/WriteAlt.node.js');
const { WriteAltApi } = require('../dist/credentials/WriteAltApi.credentials.js');

function context(rows, handler, continueOnFail = false) {
  const requests = [];
  return {
    requests,
    getInputData: () => rows.map(() => ({ json: {} })),
    getNodeParameter: (key, i) => ({ operation: 'generate', imageUrl: 'https://example.org/photo.jpg', languages: 'en', styleId: 2, keywords: '', ...rows[i] })[key],
    getNode: () => ({ name: 'WriteAlt', type: 'writeAlt', typeVersion: 1, position: [0, 0], parameters: {} }),
    continueOnFail: () => continueOnFail,
    helpers: { httpRequestWithAuthentication: async (credential, options) => { requests.push({ credential, ...options }); return handler(options); } },
  };
}

test('uses n8n credential authentication and a free account test', () => {
  const credential = new WriteAltApi();
  assert.equal(credential.authenticate.properties.headers['X-API-Key'], '={{$credentials.apiKey}}');
  assert.equal(credential.properties[0].typeOptions.password, true);
  assert.equal(credential.test.request.url, '/account.php');
});

test('returns actual results for every input image and preserves item links', async () => {
  const ctx = context([{ imageUrl: 'https://example.org/one.jpg', languages: 'es,en,es' }, { imageUrl: 'https://example.org/two.jpg' }], (request) => ({ success: true, data: { image_id: request.body.image_url, alt_texts: { en: 'Actual English description', es: 'Descripcion real' }, credits_remaining: 23 } }));
  const [out] = await new WriteAlt().execute.call(ctx);
  assert.equal(out.length, 2);
  assert.equal(out[0].json.image_url, 'https://example.org/one.jpg');
  assert.equal(out[0].json.alt_text, 'Descripcion real');
  assert.equal(out[1].json.alt_text, 'Actual English description');
  assert.equal(out[1].json.credits_remaining, 23);
  assert.deepEqual(out[1].pairedItem, { item: 1 });
  assert.deepEqual(ctx.requests[0].body.languages, ['es', 'en']);
  assert.equal(ctx.requests[0].url, 'https://api.writealt.com/v1/generate.php');
  assert.equal(ctx.requests[0].credential, 'writeAltApi');
});

test('rejects invalid inputs before charging credits', async () => {
  for (const row of [{ imageUrl: 'file:///tmp/image.png' }, { languages: ' , ' }, { styleId: 99 }, { keywords: 'a'.repeat(256) }]) {
    const ctx = context([row], () => assert.fail('API should not be called'));
    await assert.rejects(new WriteAlt().execute.call(ctx));
    assert.equal(ctx.requests.length, 0);
  }
});

test('rejects empty results and API error payloads', async () => {
  for (const payload of [{ success: true, data: { alt_texts: {} } }, { success: false, error: { message: 'Insufficient credits' } }]) {
    const ctx = context([{}], () => payload);
    await assert.rejects(new WriteAlt().execute.call(ctx), /no generated alt text|Insufficient credits/);
  }
});

test('continues per-item errors only when requested', async () => {
  const ctx = context([{ imageUrl: 'invalid' }, {}], () => ({ data: { alt_texts: { en: 'A real description' } } }), true);
  const [out] = await new WriteAlt().execute.call(ctx);
  assert.match(out[0].json.error, /valid public/);
  assert.equal(out[1].json.alt_text, 'A real description');
});

test('preserves zero credits and reads account fallback correctly', async () => {
  const ctx = context([{ operation: 'account' }], () => ({ data: { user: { credits: 200 }, credits_remaining: 0 } }));
  const [[out]] = await new WriteAlt().execute.call(ctx);
  assert.equal(out.json.credits_remaining, 0);
  assert.equal(ctx.requests[0].method, 'GET');
});

test('returns supported languages without generation requests', async () => {
  const ctx = context([{ operation: 'languages' }], () => ({ data: { languages: [{ code: 'en', name: 'English' }] } }));
  const [[out]] = await new WriteAlt().execute.call(ctx);
  assert.equal(out.json.languages[0].code, 'en');
  assert.equal(ctx.requests[0].url, 'https://api.writealt.com/v1/languages.php');
});

test('propagates transport failures without automatically duplicating generation', async () => {
  const ctx = context([{}], () => { throw new Error('HTTP 402: Insufficient credits'); });
  await assert.rejects(new WriteAlt().execute.call(ctx), /402/);
  assert.equal(ctx.requests.length, 1);
});
