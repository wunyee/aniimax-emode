// A versioned, client-only snapshot. Fragments are not sent with HTTP requests. v1 is the whole
// saved config, gzipped; v2 (see `packConfig`) only what differs from a fresh page, deflated, so
// its links are a fraction as long. Both still open.
const FORMATS = { v1: 'gzip', v2: 'deflate-raw' };
const MAX_TOKEN_LENGTH = 100_000;
const MAX_CONFIG_BYTES = 1_000_000;

async function readBounded(stream, maxBytes) {
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
            await reader.cancel();
            throw new Error('Shared config is too large');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}

// The parts of a saved config `packConfig` writes in short:
//   t: facility tiers unlike a fresh page's, by slug: { farmland: [[count, level], ...] }
//   f: fields unlike a fresh page's, by id
//   u: the unlocked special recipes, by index in `schema.special`
//   n: the unlocked season Recipe Notes, by index in `schema.seasonNotes`
//   s: the season Recipe Notes seen, by index, when not all of them (see `seenNotes` in app.js)
//   p: the priorities, "target:1,target:0,...", when not a fresh page's
//   o: everything else that isn't empty, as saved
// `schema` is `{ facilities: [{ name, slug, tiers }], fields: { id: fresh value }, special,
// seasonNotes, priorities }`, from app.js; unpacking only needs `facilities`, `special` and
// `seasonNotes`, which don't depend on the page. Indexes are into lists that only grow at the end.
const PACKED = new Set(['facilityTiers', 'unlockedSpecial', 'seenNotes', 'priorities']);

export function packConfig(config, schema) {
    const packed = {};
    const tiers = {};
    for (const f of schema.facilities) {
        const have = config.facilityTiers?.[f.name];
        if (have && JSON.stringify(have) !== JSON.stringify(f.tiers)) tiers[f.slug] = have.map(t => [t.count, t.level]);
    }
    if (Object.keys(tiers).length) packed.t = tiers;
    const fields = {};
    for (const [id, fresh] of Object.entries(schema.fields)) {
        if (!(id in config) || config[id] === fresh) continue;
        fields[id] = config[id];
    }
    if (Object.keys(fields).length) packed.f = fields;
    const index = (names, list) => (names || []).map(name => list.indexOf(name)).filter(i => i >= 0);
    const special = index(config.unlockedSpecial, schema.special);
    const notes = index(config.unlockedSpecial, schema.seasonNotes);
    if (special.length) packed.u = special;
    if (notes.length) packed.n = notes;
    const seen = config.seenNotes || [];
    if (!schema.seasonNotes.every(name => seen.includes(name))) packed.s = index(seen, schema.seasonNotes);
    const order = list => (list || []).map(p => `${p.target}:${p.on ? 1 : 0}`).join(',');
    if (config.priorities && order(config.priorities) !== order(schema.priorities)) packed.p = order(config.priorities);
    const others = {};
    for (const [key, value] of Object.entries(config)) {
        if (PACKED.has(key) || key in schema.fields) continue;
        const empty = value == null || (Array.isArray(value) && !value.length)
            || (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length);
        if (!empty) others[key] = value;
    }
    if (Object.keys(others).length) packed.o = others;
    return packed;
}

// The saved config a packed one stands for; what it leaves out stays as a fresh page has it.
export function unpackConfig(packed, schema) {
    const config = { ...(packed.o || {}) };
    config.facilityTiers = {};
    for (const [slug, tiers] of Object.entries(packed.t || {})) {
        const facility = schema.facilities.find(f => f.slug === slug);
        if (facility && Array.isArray(tiers)) config.facilityTiers[facility.name] = tiers.map(([count, level]) => ({ count, level }));
    }
    Object.assign(config, packed.f || {});
    const names = (indexes, list) => (indexes || []).map(i => list[i]).filter(Boolean);
    config.unlockedSpecial = [...names(packed.u, schema.special), ...names(packed.n, schema.seasonNotes)];
    config.seenNotes = packed.s ? names(packed.s, schema.seasonNotes) : [...schema.seasonNotes];
    if (packed.p) {
        config.priorities = packed.p.split(',').map(part => {
            const [target, on] = part.split(':');
            return { target, on: on === '1' };
        });
    }
    return config;
}

export async function createShareUrl(href, config, schema = null) {
    const version = schema ? 'v2' : 'v1';
    const json = new TextEncoder().encode(JSON.stringify(schema ? packConfig(config, schema) : config));
    if (json.length > MAX_CONFIG_BYTES) throw new Error('Shared config is too large');
    const compressed = await readBounded(
        new Blob([json]).stream().pipeThrough(new CompressionStream(FORMATS[version])),
        MAX_TOKEN_LENGTH
    );
    const encoded = btoa(Array.from(compressed, byte => String.fromCharCode(byte)).join(''))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const token = `${version}.${encoded}`;
    if (token.length > MAX_TOKEN_LENGTH) throw new Error('Shared config is too large for a link');
    const url = new URL(href);
    url.hash = new URLSearchParams({ config: token }).toString();
    return url.href;
}

// Returns null when this URL has no shared config; rejects a damaged or unknown version. A v2
// link needs the `schema` it was packed with (see `packConfig`).
export async function readShareHash(hash, schema = null) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    if (!params.has('config')) return null;
    const token = params.get('config');
    const version = token?.split('.')[0];
    if (!token || token.length > MAX_TOKEN_LENGTH || !/^v[12]\.[A-Za-z0-9_-]+$/.test(token) || (version === 'v2' && !schema)) {
        throw new Error('Invalid shared config');
    }
    const encoded = token.slice(version.length + 1);
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const decompressed = await readBounded(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream(FORMATS[version])),
        MAX_CONFIG_BYTES
    );
    let config = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decompressed));
    if (version === 'v2') {
        if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid shared config');
        config = unpackConfig(config, schema);
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)
        || !config.facilityTiers || typeof config.facilityTiers !== 'object' || Array.isArray(config.facilityTiers)) {
        throw new Error('Invalid shared config');
    }
    return config;
}

// Keep any unrelated fragment parameters when a shared setup is edited or cleared.
export function urlWithoutShare(href) {
    const url = new URL(href);
    const params = new URLSearchParams(url.hash.replace(/^#/, ''));
    if (!params.has('config')) return url.href;
    params.delete('config');
    url.hash = params.toString();
    return url.href;
}
