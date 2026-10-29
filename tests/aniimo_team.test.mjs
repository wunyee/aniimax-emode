import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { recommendTeam, formsReaching, withinCaps, RESIDENT_LEAVE } from '../web/aniimo-team.js';

// The handbook as the web build has it (see `get_aniimo_dex` in wasm.rs).
const [header, ...lines] = readFileSync(new URL('../data/aniimo_homeland.csv', import.meta.url), 'utf8').trim().split('\n');
const columns = header.split(',');
const dex = lines.map(line => {
    const cells = line.split(',');
    const abilities = {};
    columns.slice(9).forEach((ability, i) => { if (Number(cells[9 + i]) > 0) abilities[ability] = Number(cells[9 + i]); });
    return {
        number: Number(cells[0]), pet_id: Number(cells[1]), form_id: Number(cells[2]), name: cells[3], form: cells[5],
        region: Number(cells[7]), family: Number(cells[8]), abilities,
    };
});

const caps = { Fire: 3, Grass: 3, Water: 3, Earth: 3, Lightning: 3, Wind: 3, Dark: 3, Artisanship: 3, Leisure: 3, Perfumery: 3 };
const work = (ability, level, busy, extra = {}) => ({ ability, level, busy, personality: null, kind: 'work', ...extra });
const busyOf = aniimo => aniimo.pieces.reduce((sum, p) => sum + p.busy, 0);

// Nothing above the levels the player set: a Prismana with Fire 4 is out at Fire 3.
{
    const scorchhowlPrismana = dex.find(f => f.pet_id === 1005303);
    assert.equal(withinCaps(scorchhowlPrismana, caps), false);
    const team = recommendTeam({ pieces: [work('Fire', 3, 0.5)], dex, caps });
    assert.ok(team.every(a => a.form && withinCaps(a.form, caps)));
    // Opportunities may still name one, with Fire raised to 4.
    assert.ok(formsReaching(dex, caps, 'Fire', 4).length > 0);
    assert.ok(formsReaching(dex, caps, 'Fire', 4).every(f => f.abilities.Fire >= 4));
}

// Dark and Artisanship leftovers share one Aniimo that has both.
{
    const team = recommendTeam({ pieces: [work('Dark', 3, 0.4), work('Artisanship', 3, 0.3)], dex, caps });
    assert.equal(team.length, 1);
    assert.ok(team[0].form.abilities.Dark >= 3 && team[0].form.abilities.Artisanship >= 3);
}

// A day never holds more than a day's work; whole days get an Aniimo each.
{
    const team = recommendTeam({ pieces: [work('Fire', 3, 2.6), work('Fire', 3, 0.7), work('Water', 2, 0.9)], dex, caps });
    team.forEach(a => assert.ok(busyOf(a) <= 1 + 1e-9, `${a.form?.name} works ${busyOf(a)}`));
    assert.ok(Math.abs(team.reduce((sum, a) => sum + busyOf(a), 0) - 4.2) < 1e-9);
}

// Opposite personalities never share an Aniimo.
{
    const team = recommendTeam({
        pieces: [work('Fire', 3, 0.3, { personality: 'Practical' }), work('Fire', 3, 0.3, { personality: 'Nimble' })],
        dex, caps,
    });
    assert.equal(team.length, 2);
}

// The Crackle Generator's and environment buildings' Aniimo never share and never step away. A
// resident stays at its post (its facility would make less) unless the homeland can't hold the
// team otherwise, and never steps away from a level-up facility.
{
    const fixed = [
        { ability: 'Lightning', level: 1, busy: 1, personality: null, kind: 'fixed', place: 'Crackle Generator' },
        { ability: 'Fire', level: 1, busy: 1, personality: null, kind: 'fixed', place: 'Heat Furnace' },
    ];
    const team = recommendTeam({ pieces: [...fixed, work('Lightning', 1, 0.05), work('Fire', 1, 0.05)], dex, caps });
    team.filter(a => a.kind === 'fixed').forEach(a => assert.equal(a.pieces.length, 1));

    const mine = { ability: 'Earth', level: 3, busy: 1, personality: null, kind: 'resident', feedsLevelUp: false };
    assert.equal(recommendTeam({ pieces: [mine, work('Earth', 1, 0.05)], dex, caps }).length, 2);
    assert.equal(recommendTeam({ pieces: [mine, work('Earth', 1, 0.05)], dex, caps, limit: 2 }).length, 2);
    const lent = recommendTeam({ pieces: [mine, work('Earth', 1, 0.05)], dex, caps, limit: 1 });
    assert.equal(lent.length, 1);
    assert.ok(lent[0].leave <= RESIDENT_LEAVE + 1e-9 && lent[0].leave > 0);

    const kept = recommendTeam({ pieces: [{ ...mine, feedsLevelUp: true }, work('Earth', 1, 0.05)], dex, caps, limit: 1 });
    assert.equal(kept.length, 2);
    assert.equal(kept.find(a => a.kind === 'resident').pieces.length, 1);

    // More than its time away allows: no help from the resident.
    const tooMuch = recommendTeam({ pieces: [mine, work('Earth', 1, 0.3)], dex, caps, limit: 1 });
    assert.equal(tooMuch.length, 2);
}

// A recipe only one family can make is worked by that family, whatever else has the ability.
{
    const { recipeFamily } = await import('../web/facility-config.js');
    assert.equal(recipeFamily('Tidewhisper Sandcastle', 'quick_sea_salt'), 1017);
    assert.equal(recipeFamily('Tidewhisper Sandcastle', 'pearl'), 1019);
    assert.equal(recipeFamily('Starfall Hammock', 'gold_speck_cap'), 1063);
    // One facility, a family per recipe: the Nimbus Bed's wool takes Nimbi's family, its petals Iris's.
    assert.equal(recipeFamily('Nimbus Bed', 'quick_wool'), 1026);
    assert.equal(recipeFamily('Nimbus Bed', 'petals'), 1021);
    assert.equal(recipeFamily('Mine', 'rock'), null);
    const resident = (item, facility = 'Tidewhisper Sandcastle') => ({
        ability: 'Leisure', level: 3, busy: 1, personality: null, kind: 'resident', feedsLevelUp: false,
        family: recipeFamily(facility, item),
    });
    const [otter] = recommendTeam({ pieces: [resident('sea_salt')], dex, caps });
    assert.equal(otter.form.family, 1017, otter.form.name);
    const [star] = recommendTeam({ pieces: [resident('pearl')], dex, caps });
    assert.equal(star.form.family, 1019, star.form.name);
    // A whole facility's recipes, too: the Dewy House takes only Dewy and Fragrancier.
    const team = recommendTeam({ pieces: [resident('aromathyst', 'Dewy House')], dex, caps });
    assert.equal(team[0].form.family, 1035);
    // Each region's handbook starts again from 1, so a family isn't a range of numbers: Dewlop is
    // number 5 in its region, as Celestis is in the first, but only Celestis's family makes Stars.
    const [hammock] = recommendTeam({ pieces: [resident('star', 'Starfall Hammock')], dex, caps });
    assert.equal(hammock.form.family, 1001, hammock.form.name);
}

// An Aniimo with time to spare is the best hauler that can still do its work.
{
    const [aniimo] = recommendTeam({ pieces: [work('Fire', 3, 0.3)], dex, caps });
    const best = Math.max(...dex.filter(f => withinCaps(f, caps) && (f.abilities.Fire || 0) >= 3).map(f => f.abilities.Hauling || 0));
    assert.equal(aniimo.form.abilities.Hauling || 0, best);
    assert.ok(best >= 3);
}

// Farmland and Woodland jobs can be shared out: when the homeland is full, two Wells' Aniimo,
// stepping away a little each, water the crops between them rather than keeping a third.
{
    const well = { ability: 'Water', level: 3, busy: 1, personality: null, kind: 'resident', feedsLevelUp: false };
    const watering = work('Water', 1, 0.15, { jobs: new Map([['Watering', new Set(['Farmland'])]]) });
    assert.equal(recommendTeam({ pieces: [well, { ...well }, watering], dex, caps }).length, 3);
    const team = recommendTeam({ pieces: [well, { ...well }, watering], dex, caps, limit: 2 });
    assert.equal(team.length, 2);
    team.forEach(a => assert.ok(a.leave <= RESIDENT_LEAVE + 1e-9));
    assert.ok(Math.abs(team.reduce((sum, a) => sum + a.leave, 0) - 0.15) < 1e-9);
    // A facility's work isn't split like that: one Aniimo works it.
    const kiln = work('Water', 1, 0.15);
    assert.equal(recommendTeam({ pieces: [well, { ...well }, kiln], dex, caps, limit: 2 }).length, 3);
}

// A mixed day's work: every bit of it is placed, no day overfull, and fewer Aniimo than pieces.
{
    const pieces = [
        work('Artisanship', 3, 0.3), work('Dark', 3, 0.2, { jobs: new Map([['Reaping', new Set(['Farmland'])]]) }),
        work('Grass', 1, 0.2, { jobs: new Map([['Sowing', new Set(['Farmland'])]]) }),
        work('Water', 1, 0.15, { jobs: new Map([['Watering', new Set(['Farmland'])]]) }),
        work('Earth', 1, 0.13, { jobs: new Map([['Reclaiming', new Set(['Farmland'])]]) }),
        work('Fire', 3, 1.4, { personality: 'Practical' }), work('Wind', 3, 0.6),
    ];
    const team = recommendTeam({ pieces, dex, caps });
    team.forEach(a => assert.ok(busyOf(a) <= 1 + 1e-9, `${a.form?.name} works ${busyOf(a)}`));
    team.forEach(a => a.pieces.forEach(p => assert.ok((a.form.abilities[p.ability] || 0) >= p.level)));
    assert.ok(Math.abs(team.reduce((sum, a) => sum + busyOf(a), 0) - 2.98) < 1e-9);
    assert.ok(team.length < pieces.length);
}

// The fewest Aniimo; of those, the work spread so no one is busier than need be (each multitasks,
// Farmland and Woodland jobs included); then an Aniimo left with only those jobs is the best hauler
// that can do them.
{
    const fields = (ability, busy, job) => work(ability, 1, busy, { jobs: new Map([[job, new Set(['Farmland'])]]) });
    const pieces = [
        work('Artisanship', 3, 0.3), fields('Dark', 0.05, 'Reaping'), fields('Grass', 0.1, 'Sowing'),
        fields('Water', 0.15, 'Watering'), fields('Earth', 0.13, 'Reclaiming'),
    ];
    const team = recommendTeam({ pieces, dex, caps });
    // Two: an Artisanship 3 Aniimo that also sows and reaps (Ignitis's Forest Form), and one with
    // Water and Earth for the rest (Coraliz, from the second region's handbook).
    assert.equal(team.length, 2);
    assert.ok(Math.abs(team.reduce((sum, a) => sum + busyOf(a), 0) - 0.73) < 1e-9, team.map(busyOf).join());
    team.forEach(a => assert.ok(busyOf(a) <= 1 + 1e-9));
    for (const aniimo of team.filter(a => a.pieces.every(p => p.jobs))) {
        const able = dex.filter(f => withinCaps(f, caps) && aniimo.pieces.every(p => (f.abilities[p.ability] || 0) >= p.level));
        const best = Math.max(...able.map(f => f.abilities.Hauling || 0));
        assert.equal(aniimo.form.abilities.Hauling || 0, best, aniimo.form.name);
    }
    team.forEach(a => assert.equal(a.leave, 0));
}

// An Aniipod Maker's or Dance Pad Polisher's Aniimo stays with its unit, but the time the unit
// waits on ingredients takes other work, so no Aniimo is kept just for that.
{
    const post = (busy, extra = {}) => ({ ability: 'Lightning', level: 3, busy, personality: null, kind: 'post', ...extra });
    const team = recommendTeam({ pieces: [post(0.4), work('Lightning', 3, 0.3)], dex, caps });
    assert.equal(team.length, 1);
    assert.equal(team[0].kind, 'post');
    assert.ok(Math.abs(busyOf(team[0]) - 0.7) < 1e-9);

    // Another ability too: the post becomes a form that has both.
    const both = recommendTeam({ pieces: [post(0.4), work('Artisanship', 3, 0.3)], dex, caps });
    assert.equal(both.length, 1);
    assert.ok(both[0].form.abilities.Lightning >= 3 && both[0].form.abilities.Artisanship >= 3, both[0].form.name);

    // A whole day at its unit leaves no room: the work gets an Aniimo of its own.
    assert.equal(recommendTeam({ pieces: [post(1), work('Lightning', 3, 0.3)], dex, caps }).length, 2);

    // Ahead of residents: a post with time to spare takes the work, and no resident steps away.
    const well = { ability: 'Water', level: 3, busy: 1, personality: null, kind: 'resident', feedsLevelUp: false };
    const watering = work('Water', 1, 0.05, { jobs: new Map([['Watering', new Set(['Farmland'])]]) });
    const ahead = recommendTeam({ pieces: [well, post(0.4), watering], dex, caps, limit: 2 });
    assert.equal(ahead.length, 2);
    assert.equal(ahead.find(a => a.kind === 'resident').leave, 0);
    assert.ok(ahead.find(a => a.kind === 'post').pieces.some(p => p.ability === 'Water'));

    // Not ahead of the least busy, though: a busy post (0.7) keeps to its unit while the extra work
    // goes to a lighter Aniimo (0.35), rather than the post taking some (0.8 and 0.25).
    const lightly = recommendTeam({ pieces: [post(0.7), work('Lightning', 3, 0.1), work('Lightning', 3, 0.25)], dex, caps });
    assert.equal(lightly.length, 2);
    assert.equal(lightly.find(a => a.kind === 'post').pieces.length, 1);
    const loads = lightly.map(busyOf).sort((a, b) => a - b);
    assert.ok(Math.abs(loads[0] - 0.35) < 1e-9 && Math.abs(loads[1] - 0.7) < 1e-9, loads.join());
}
