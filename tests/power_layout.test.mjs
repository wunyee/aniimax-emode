import assert from 'node:assert/strict';
import { placePower } from '../web/layout.js';

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const range = (r, size) => ({ x: r.x + r.w / 2 - size / 2, y: r.y + r.h / 2 - size / 2, w: size, h: size });
const powered = (power, unit) => [range(power.generator, 11), ...power.poles.map(p => range(p, 7))].some(r => overlap(r, unit) > 1e-9);

// Electric units laid out by their trips, far apart: the generator powers what it can reach, poles
// reach further, and whatever is left moves into range. Nothing is left unpowered, and nothing
// overlaps anything else.
const cells = [{ x: 0, y: 0, w: 60, h: 40 }];
const storage = { x: 29, y: 19, w: 2, h: 2 };
const members = [
    { x: 24, y: 18, w: 2.5, h: 2.5, weight: 30, is_emode: true, facility: 'Jukebox Dryer' },
    { x: 33, y: 18, w: 1.5, h: 1.5, weight: 20, is_emode: true, facility: 'Simmering Pot' },
    { x: 5, y: 5, w: 5.5, h: 5.5, weight: 5, is_emode: true, facility: 'Chimney Kiln' },
    { x: 50, y: 32, w: 4, h: 4, weight: 2, is_emode: true, facility: 'Crafting Table' },
    { x: 27, y: 23, w: 2, h: 2, weight: 40, facility: 'Farmland' },
];
const before = members.map(m => ({ ...m }));
const power = placePower(members, storage, cells, 2);
assert.ok(power.generator, 'a generator is placed');
assert.equal(power.unpowered.length, 0, 'every electric unit is powered');
for (const unit of members.filter(m => m.is_emode)) assert.ok(powered(power, unit), `${unit.facility} is powered`);
const all = [...members, storage, power.generator, ...power.poles];
for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) assert.ok(overlap(all[i], all[j]) < 1e-9, `no overlap between ${i} and ${j}`);
}
// A unit that isn't electric stays where its trips put it.
assert.deepEqual(members[4], before[4]);

// No electric unit, nothing to place.
assert.equal(placePower([{ x: 0, y: 0, w: 2, h: 2, weight: 1 }], storage, cells, 2), null);
console.log('power layout ok');
