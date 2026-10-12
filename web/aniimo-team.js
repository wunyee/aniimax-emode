// The Aniimo team to get for a plan, by species and form: which forms in the handbook (see
// `data/aniimo_homeland.csv`) to keep, and which of the plan's Aniimo work each one does.
//
// A plan's Aniimo work comes as pieces, each one ability at a level for part of a day (`busy`,
// 1 is a whole day; see `aniimo_tasks_for` in wasm.rs, which already leaves out the time a
// processor waits on its ingredients). An Aniimo with several abilities can work pieces of each,
// one after another, as long as its day has room and none of them want opposite personalities.
//
// The best team, in order: nothing makes less (no Aniimo leaves its post unless the homeland
// can't hold the team otherwise); the fewest Aniimo; extra work with the least busy Aniimo, so they
// multitask (Farmland and Woodland jobs included); an Aniimo left with only Farmland and Woodland
// jobs a good hauler, since it can carry the harvest to storage between them; any other Aniimo with
// time to spare a good hauler too; then the forms easiest to get.
//
// The Aniipod Maker's and Dance Pad Polisher's Aniimo (`kind: 'post'`) stay with their unit, one
// each, but the time it waits on ingredients is free for other work, at no cost to what it makes:
// so they take on work like any Aniimo with time to spare, ahead of residents.
//
// Some Aniimo never leave their post: the Crackle Generator's (every electric unit stops without
// it) and each environment building's (`kind: 'fixed'`). A resident facility's Aniimo (the Mine,
// the Well, the Tidewhisper Sandcastle and the like, `kind: 'resident'`) stays put too; only when
// the team is more than the homeland holds may it step away for a little of its day, if its
// facility doesn't feed the level-up (`feedsLevelUp`), and its facility then makes that much less.

import { opposedPersonality } from './facility-config.js';

// The most of its day a resident Aniimo steps away from its facility for other work.
export const RESIDENT_LEAVE = 0.1;

// How far the search for the fewest Aniimo looks before settling for the best team found so far.
const SEARCH_LIMIT = 60000;

const EPSILON = 1e-6;

// Whether a form is one the player can have: none of its levelled abilities above what they set.
// Abilities with no level set (Hauling, Ice and the like) don't count against it.
export function withinCaps(form, caps) {
    return Object.entries(form.abilities).every(([ability, level]) => !(ability in caps) || level <= caps[ability]);
}

// The forms that would reach `level` at `ability` if that ability's cap were raised to it, with
// every other cap kept; easiest to get first (a Basic Form, then the lowest handbook number).
export function formsReaching(dex, caps, ability, level) {
    const raised = { ...caps, [ability]: level };
    return dex
        .filter(form => (form.abilities[ability] || 0) >= level && withinCaps(form, raised))
        .sort(easiestFirst);
}

function easiestFirst(a, b) {
    return Number(b.form_id === 1) - Number(a.form_id === 1) || a.number - b.number || a.pet_id - b.pet_id;
}

// Whether `form` can work `piece`: the ability at the level, and of the family the recipe takes,
// if only one can make it (`piece.family`, handbook numbers first to last; see `RECIPE_FAMILIES`).
const canDo = (form, piece) => !!form && (form.abilities[piece.ability] || 0) >= piece.level
    && (!piece.family || (form.number >= piece.family[0] && form.number <= piece.family[1]));

const clashes = (personalities, piece) => !!piece.personality && personalities.has(opposedPersonality(piece.personality));

// How well a form hauls: its Hauling level, 0 if it has none.
const hauls = form => form?.abilities.Hauling || 0;

// Of the forms that can work every one of `pieces`, the one to keep: with time to spare, the best
// hauler, then the easiest to get; else the easiest.
function bestFormFor(forms, pieces, spare) {
    const able = forms.filter(form => pieces.every(piece => canDo(form, piece)));
    return able.sort((a, b) => (spare ? hauls(b) - hauls(a) : 0) || easiestFirst(a, b))[0] || null;
}

function newAniimo(form, pieces, kind) {
    return {
        form,
        // What was asked for, for an Aniimo no form in the handbook can be.
        ability: pieces[0].ability,
        level: pieces[0].level,
        kind,
        pieces: [...pieces],
        busy: total(pieces),
        // A resident's time away from its facility, out of `RESIDENT_LEAVE`.
        leave: 0,
        personalities: new Set(pieces.filter(p => p.personality).map(p => p.personality)),
    };
}

function take(aniimo, piece) {
    aniimo.pieces.push(piece);
    aniimo.busy += piece.busy;
    if (piece.personality) aniimo.personalities.add(piece.personality);
}

const total = pieces => pieces.reduce((sum, piece) => sum + piece.busy, 0);

// `parts` (each less than a day) shared out over the fewest Aniimo, each with a form that can do
// all its work and no two opposite personalities; of the ways with that few, the one that leaves
// no Aniimo busier than it need be, then the one whose Aniimo working only Farmland and Woodland
// jobs haul best, then the one whose Aniimo with time to spare haul best.
// Every way is tried, largest piece first, up to `SEARCH_LIMIT` steps. `posts` are Aniimo there
// anyway, each with its own work, that can take more in the time they have left. Returns
// `[{ form, pieces, post }]`.
function packFewest(parts, forms, posts = []) {
    const order = [...parts].sort((a, b) => b.busy - a.busy);
    // Which forms can work each piece, as a bit per form.
    const maskOf = piece => forms.reduce((mask, form, i) => (canDo(form, piece) ? mask | (1n << BigInt(i)) : mask), 0n);
    const able = order.map(maskOf);
    const bins = posts.map(piece => ({ mask: maskOf(piece), busy: piece.busy, pieces: [piece], personalities: new Set(piece.personality ? [piece.personality] : []), post: true }));
    let best = null;
    let steps = 0;

    // A bin's form and how it scores: the best hauler that can do it all (the easiest to get of
    // those), its hauling times its work if that's all Farmland and Woodland jobs, and its hauling
    // if it has time spare.
    const settle = bin => {
        let form = null;
        for (let i = 0; i < forms.length; i++) {
            if (!((bin.mask >> BigInt(i)) & 1n)) continue;
            const f = forms[i];
            if (!form || hauls(f) > hauls(form) || (hauls(f) === hauls(form) && easiestFirst(f, form) < 0)) form = f;
        }
        const fields = bin.pieces.every(p => p.jobs) ? hauls(form) * bin.busy : 0;
        return { form, fields, spare: bin.busy < 1 - EPSILON ? hauls(form) : 0, load: bin.busy * bin.busy };
    };
    // Fewer Aniimo; then work spread to the least busy (the sum of each Aniimo's busy squared,
    // lowest when no one takes on more while another sits idle); then the Aniimo working only the
    // fields with the best haulers; then the best haulers with time to spare.
    const better = (a, b) => {
        if (a.count !== b.count) return a.count < b.count;
        if (Math.abs(a.load - b.load) > EPSILON) return a.load < b.load;
        if (Math.abs(a.fields - b.fields) > EPSILON) return a.fields > b.fields;
        return a.spare > b.spare + EPSILON;
    };

    const search = i => {
        if (++steps > SEARCH_LIMIT && best) return;
        if (best && bins.length > best.count) return;
        if (i === order.length) {
            const settled = bins.map(settle);
            const found = {
                count: bins.length,
                fields: settled.reduce((sum, s) => sum + s.fields, 0),
                spare: settled.reduce((sum, s) => sum + s.spare, 0),
                load: settled.reduce((sum, s) => sum + s.load, 0),
                team: bins.map((bin, k) => ({ form: settled[k].form, pieces: [...bin.pieces], post: !!bin.post })),
            };
            if (!best || better(found, best)) best = found;
            return;
        }
        const piece = order[i];
        for (const bin of bins) {
            if (bin.busy + piece.busy > 1 + EPSILON || clashes(bin.personalities, piece)) continue;
            const mask = bin.mask & able[i];
            if (!mask) continue;
            const was = { mask: bin.mask, personalities: bin.personalities };
            bin.mask = mask;
            bin.busy += piece.busy;
            bin.pieces.push(piece);
            if (piece.personality) bin.personalities = new Set([...bin.personalities, piece.personality]);
            search(i + 1);
            bin.pieces.pop();
            bin.busy -= piece.busy;
            Object.assign(bin, was);
        }
        if (best && bins.length + 1 > best.count) return;
        bins.push({ mask: able[i], busy: piece.busy, pieces: [piece], personalities: new Set(piece.personality ? [piece.personality] : []) });
        search(i + 1);
        bins.pop();
    };
    search(0);
    return best ? best.team : [];
}

// Hands all of `victim`'s work to `hosts`, if they have room for it: each host keeps a form that
// can do everything it then works, changing to another form if it has to. A Farmland or Woodland
// job (`piece.jobs`) can be shared out over several hosts, some plots each; a facility's work goes
// to one. `room(host)` is how much more of its day a host can give. Changes nothing and returns
// false if it doesn't all fit.
function dissolve(victim, hosts, forms, room) {
    const added = new Map(hosts.map(h => [h, []]));
    const formOf = new Map(hosts.map(h => [h, h.form]));
    const personalitiesOf = new Map(hosts.map(h => [h, new Set(h.personalities)]));
    for (const piece of victim.pieces) {
        let left = piece.busy;
        // Hosts that can already do it first, so forms change as little as can be.
        const order = [...hosts].sort((a, b) => Number(canDo(formOf.get(b), piece)) - Number(canDo(formOf.get(a), piece)));
        for (const host of order) {
            const free = room(host) - total(added.get(host));
            if (free <= EPSILON || (!piece.jobs && free < left - EPSILON) || clashes(personalitiesOf.get(host), piece)) continue;
            let form = formOf.get(host);
            if (!canDo(form, piece)) {
                form = bestFormFor(forms, [...host.pieces, ...added.get(host), piece], false);
                if (!form) continue;
            }
            const share = Math.min(free, left);
            added.get(host).push({ ...piece, busy: share });
            formOf.set(host, form);
            if (piece.personality) personalitiesOf.get(host).add(piece.personality);
            left -= share;
            if (left <= EPSILON) break;
        }
        if (left > EPSILON) return false;
    }
    for (const host of hosts) {
        const pieces = added.get(host);
        if (!pieces.length) continue;
        pieces.forEach(piece => take(host, piece));
        if (host.kind === 'resident') host.leave += total(pieces);
        host.form = formOf.get(host);
    }
    return true;
}

// The team for `pieces`: each `{ ability, level, busy, personality, kind, feedsLevelUp, family,
// jobs }`, where `kind` is 'fixed' or 'resident' for one unit's whole-day Aniimo, 'post' for one
// unit's Aniimo that can take on more in the time its unit leaves it, and 'work' otherwise; `jobs`
// marks Farmland and Woodland work. Any other fields a piece has are kept for the
// caller. `caps` is the highest level of each ability the player set; `limit`, if known, how many
// of these Aniimo the homeland has room for. Returns one entry per Aniimo: its `form` (null if no
// form in the handbook within the caps can do its work), `kind`, `pieces`, `busy`, `leave` and
// `personalities`.
export function recommendTeam({ pieces, dex, caps, limit = null, residentLeave = RESIDENT_LEAVE }) {
    const forms = dex.filter(form => withinCaps(form, caps));
    const team = [];

    // Residents and the rest that never leave, one each; whole days of work, one each; what's left
    // of each piece shared out.
    for (const piece of pieces.filter(p => p.kind === 'fixed' || p.kind === 'resident')) {
        team.push(newAniimo(bestFormFor(forms, [piece], false), [piece], piece.kind));
    }
    const parts = [];
    for (const piece of pieces.filter(p => p.kind === 'work')) {
        const days = Math.floor(piece.busy + EPSILON);
        for (let d = 0; d < days; d++) team.push(newAniimo(bestFormFor(forms, [piece], false), [{ ...piece, busy: 1 }], 'work'));
        const rest = piece.busy - days;
        if (rest > EPSILON) parts.push({ ...piece, busy: rest });
    }
    // Work no form within the caps can do gets an Aniimo of its own, named by what it asks for.
    const doable = parts.filter(piece => forms.some(form => canDo(form, piece)));
    parts.filter(piece => !doable.includes(piece)).forEach(piece => team.push(newAniimo(null, [piece], 'work')));
    const posts = pieces.filter(p => p.kind === 'post');
    const able = posts.filter(piece => forms.some(form => canDo(form, piece)));
    posts.filter(piece => !able.includes(piece)).forEach(piece => team.push(newAniimo(null, [piece], 'post')));
    packFewest(doable, forms, able).forEach(({ form, pieces: shared, post }) => team.push(newAniimo(form, shared, post ? 'post' : 'work')));

    // Only if the homeland can't hold them all: residents step away for a little of their day,
    // where their facility doesn't feed the level-up, to take over the least busy Aniimo's work.
    const lenders = team.filter(a => a.kind === 'resident' && a.form && !a.pieces[0].feedsLevelUp);
    if (limit != null && lenders.length) {
        const workers = team.filter(a => a.kind === 'work' && a.form).sort((a, b) => a.busy - b.busy);
        for (const victim of workers) {
            if (team.length <= limit) break;
            if (dissolve(victim, lenders, forms, h => residentLeave - h.leave)) team.splice(team.indexOf(victim), 1);
        }
    }
    return team;
}
