import assert from 'node:assert/strict';
import test from 'node:test';

import { createShareUrl, readShareHash, urlWithoutShare } from '../web/share-config.js';

const setup = {
    facilityTiers: { Farmland: [{ count: 4, level: 2 }] },
    priorities: [{ target: 'coins', on: true }],
    roster: [{ name: 'Тёплый Анимо 🌾', count: 1 }],
    'mode-simple': false,
};

test('test_share_link_round_trips_unicode_setup', async () => {
    const url = new URL(await createShareUrl('https://example.com/aniimax/?view=home', setup));
    assert.equal(url.pathname, '/aniimax/');
    assert.equal(url.search, '?view=home');
    assert.equal(url.searchParams.has('config'), false);
    assert.deepEqual(await readShareHash(url.hash), setup);
    assert.equal(urlWithoutShare(url.href), 'https://example.com/aniimax/?view=home');
});

test('test_share_link_ignores_unrelated_fragments_and_rejects_invalid_data', async () => {
    assert.equal(await readShareHash('#help'), null);
    await assert.rejects(readShareHash('#config=v2.abcd'));
    await assert.rejects(readShareHash('#config=v1.not-valid!'));
    await assert.rejects(readShareHash('#config=v1.e30'));
    assert.equal(urlWithoutShare('https://example.com/#section=help&config=v1.e30'), 'https://example.com/#section=help');
});

test('test_share_link_rejects_oversized_setup', async () => {
    await assert.rejects(createShareUrl('https://example.com/', {
        facilityTiers: {},
        note: 'a'.repeat(1_000_000),
    }));
});

test('test_share_link_compresses_repeated_data_losslessly', async () => {
    const fullSetup = { ...setup, roster: Array.from({ length: 50 }, (_, i) => ({
        name: `Aniimo ${i}`,
        count: 2,
        abilities: { Gathering: 3, Crafting: 2 },
    })) };
    const url = new URL(await createShareUrl('https://example.com/', fullSetup));
    assert.ok(url.href.length < JSON.stringify(fullSetup).length);
    assert.deepEqual(await readShareHash(url.hash), fullSetup);
});

// v2 links leave out what a fresh page already has, so they come out far shorter, and read back
// to the same setup.
const schema = {
    facilities: [
        { name: 'Farmland', slug: 'farmland', tiers: [{ count: 1, level: 1 }] },
        { name: 'Mine', slug: 'mine', tiers: [{ count: 1, level: 1 }] },
    ],
    fields: { 'home-level': '22', 'season-on': false, 'rate-unit': 'hour' },
    special: ['rose_shortbread', 'lotion'],
    seasonNotes: ['harvest_platter', 'magic_pumpkin_cake'],
    priorities: [{ target: 'coins', on: true }, { target: 'season_points', on: false }],
};

test('test_share_link_v2_packs_only_changes', async () => {
    const config = {
        facilityTiers: { Farmland: [{ count: 1, level: 1 }], Mine: [{ count: 3, level: 6 }] },
        'home-level': '20', 'season-on': true, 'rate-unit': 'hour',
        unlockedSpecial: ['lotion', 'magic_pumpkin_cake'], seenNotes: ['harvest_platter', 'magic_pumpkin_cake'],
        priorities: [{ target: 'season_points', on: true }, { target: 'coins', on: true }],
        roster: [], levelUpStock: {}, seasonByDate: 'magical_wonder_night',
    };
    const url = new URL(await createShareUrl('https://example.com/', config, schema));
    assert.ok(url.hash.startsWith('#config=v2.'));
    const back = await readShareHash(url.hash, schema);
    assert.deepEqual(back.facilityTiers, { Mine: [{ count: 3, level: 6 }] });
    assert.equal(back['home-level'], '20');
    assert.equal(back['season-on'], true);
    assert.equal('rate-unit' in back, false);
    assert.deepEqual(back.unlockedSpecial, ['lotion', 'magic_pumpkin_cake']);
    assert.deepEqual(back.seenNotes, ['harvest_platter', 'magic_pumpkin_cake']);
    assert.deepEqual(back.priorities, config.priorities);
    assert.equal(back.seasonByDate, 'magical_wonder_night');
    const v1 = new URL(await createShareUrl('https://example.com/', config));
    assert.ok(url.href.length < v1.href.length, `${url.href.length} vs ${v1.href.length}`);
    // A v1 link still opens, and a v2 one needs the schema.
    assert.deepEqual(await readShareHash(v1.hash, schema), config);
    await assert.rejects(readShareHash(url.hash));
});
