// Places a whole homeland around a single Storage Unit, so the Aniimo hauling each finished batch
// walk as little as they can: a piece's cost is its trips (finished batches) per hour times its
// straight-line distance to the Storage Unit, center to center, and the layout keeps the total low.
//
// Environment buildings keep every plot the plan gives them covered as planned, but not in any set
// arrangement: a plot may go anywhere its footprint overlaps its building's 9x9 coverage square by
// a real area (the rule in coverage.rs), or for two buildings placed to overlap, the zone the plan
// gives it (the first's alone, both, or the second's alone). Temperatures add up where squares
// meet, so no covered plot reaches another building's square, and the squares of different
// buildings don't overlap. Pieces marked `sensitive` (crops that need an environment, grown
// without one) stay out of every square too, so none picks up a temperature it wasn't planned
// for. Anything else, including crops that need no environment, may stand anywhere. Pieces may touch but not overlap, sit on a quarter-tile grid (the smallest step in
// any footprint), and may be turned a quarter at a time.
//
// Units on electricity (`is_emode`) go down in turn with the rest, each where its walking costs
// least; right after the last of them, the Crackle Generator (a member marked `generator`)
// wherever its range reaches the most, then any Crackle Power Poles (`powerPole`) for those it
// doesn't; then everything else. Power
// reaches the generator's 11x11 range and the 7x7 of every pole touching a range already
// powered. An electric unit costs `POWER_PENALTY` more anywhere power doesn't reach, while the
// generator and each pole cost that much less for each electric unit power then reaches, so
// when pieces are lifted and put back the units on electricity stay where power is.
//
// Busiest pieces for their size go down first, each where it costs least; then each is lifted
// and put back wherever is cheapest with the rest in place, until nothing moves. This is a
// heuristic: it finds a good layout, not a proven best one.

const STEP = 0.25;
const EPSILON = 1e-6;
const CELL = 4;
const RADIUS = 4.5;
// Building positions tried past the first that works, since a building's plots can go anywhere
// in its square and the nearest building isn't always the cheapest; of those, how many also try
// packing the plots afresh, which is slow and seldom beats the plan's own arrangement when a
// building covers many plots.
const CLUSTER_TRIES = 24;
const CLUSTER_PACKS = 2;
const CLUSTER_PACK_MOST = 12;
// What an electric unit out of the generator's reach costs: far more than any walking.
const POWER_PENALTY = 1e5;
// What a pole saves for each tile of ground it adds to power's reach: far less than a unit
// powered (a 7x7 range is 49 tiles), but more than the walking a unit could save.
const POWER_GROUND = 100;
// What the generator costs for each tile it stands from its target (see `bestGeneratorSpot`):
// enough to draw it there before anything else is down, far less than a unit it powers.
const POWER_TARGET_WEIGHT = 1000;

// `pieces`: each either
// - `{ members: [{ x, y, w, h, weight, sensitive }] }`, one rigid piece (a facility unit), whose
//   members are relative to its own frame; `sensitive` members stay out of every coverage square;
// - `{ cluster: true, buildings: [{ x, y, w, h }], plots: [{ w, h, weight, zone }], planned:
//   [{ x, y }] }`, environment buildings (one, or two placed to overlap) with the plots they
//   cover: `zone` is 0 for a lone building's plots, else 0, 1 or 2 for the first's zone, the
//   shared one and the second's; `planned` is each plot's place in the plan's own arrangement,
//   in the buildings' frame, used when the plots can't be packed any other way.
// Everything is in tiles, with the Storage Unit's center at the origin. `options.cells`, if
// given, are the open parts of the homeland (disjoint rectangles, in the same frame): every piece
// has to lie within them, though one may span two that meet.
// Returns `{ storage, pieces, unplaced, tried }`: each piece with its members (a cluster's
// buildings then plots) at their final places and its cost, the indices of any piece there was
// no room for, and how many spots were tried.
export function layOut(pieces, options = {}) {
    const { storage = { w: 2, h: 2 }, passes = 6, cells = null } = options;
    const storageRect = { x: -storage.w / 2, y: -storage.h / 2, w: storage.w, h: storage.h };
    let tried = 0;
    // With a Crackle Generator, a first layout without it or its poles finds where the units on
    // electricity go by their walking alone; the generator then aims for the spot whose range
    // reaches the most of them there (see `POWER_TARGET_WEIGHT`).
    let { powerTarget } = options;
    const powerPiece = piece => !piece.cluster && piece.members.some(m => m.generator || m.powerPole);
    if (powerTarget === undefined && pieces.some(powerPiece)) {
        const plain = pieces.filter(piece => !powerPiece(piece));
        const first = layOut(plain, { ...options, powerTarget: null });
        tried += first.tried;
        powerTarget = bestGeneratorSpot(first.pieces.flatMap(piece => piece.members).filter(m => m.is_emode));
    }
    // Within the open cells: the parts of it inside each cell add up to all of it.
    const inside = r => !cells || cells.reduce((sum, c) => sum + overlapArea(r, c), 0) >= r.w * r.h - EPSILON;
    const shapes = pieces.map(piece => (piece.cluster ? clusterOrientations(piece) : orientations(piece.members)));
    const membersOf = piece => (piece.cluster ? [...piece.buildings.map(b => ({ ...b, weight: 0 })), ...piece.plots] : piece.members);
    const weightOf = piece => membersOf(piece).reduce((sum, m) => sum + m.weight, 0);
    const areaOf = piece => membersOf(piece).reduce((sum, m) => sum + m.w * m.h, 0);
    const isGenerator = piece => !piece.cluster && piece.members.some(m => m.generator);
    const isPole = piece => !piece.cluster && piece.members.some(m => m.powerPole);
    const isElectric = piece => !piece.cluster && piece.members.some(m => m.is_emode);
    const byDensity = pieces
        .map((piece, i) => ({ i, density: weightOf(piece) / Math.max(areaOf(piece), EPSILON) }))
        .filter(p => !isGenerator(pieces[p.i]) && !isPole(pieces[p.i]))
        .sort((a, b) => b.density - a.density || areaOf(pieces[b.i]) - areaOf(pieces[a.i]))
        .map(p => p.i);
    // The generator and its poles go first, while there's room for them (see `powerTarget`), then
    // the units on electricity, so even the least busy finds room where power reaches.
    const power = pieces.map((piece, i) => i).filter(i => isGenerator(pieces[i])).concat(pieces.map((piece, i) => i).filter(i => isPole(pieces[i])));
    const order = [...power, ...byDensity.filter(i => isElectric(pieces[i])), ...byDensity.filter(i => !isElectric(pieces[i]))];
    const generatorIndex = pieces.findIndex(isGenerator);
    const poleIndices = pieces.map((piece, i) => (isPole(piece) ? i : -1)).filter(i => i >= 0);
    const electricIndices = pieces.map((piece, i) => (isElectric(piece) ? i : -1)).filter(i => i >= 0);

    // Spots to try: the open cells' extent, or with none given, well past what everything needs.
    const totalArea = pieces.reduce((sum, p) => sum + areaOf(p), 0) + storage.w * storage.h;
    const reach = Math.ceil(Math.sqrt(totalArea) * 1.6 + 16);
    const extent = cells
        ? {
            x: Math.min(...cells.map(c => c.x)), y: Math.min(...cells.map(c => c.y)),
            x2: Math.max(...cells.map(c => c.x + c.w)), y2: Math.max(...cells.map(c => c.y + c.h)),
        }
        : { x: -reach, y: -reach, x2: reach, y2: reach };
    const offsets = latticeByDistance(extent, STEP);
    // Environment buildings stand on whole tiles, which is plenty for them and far fewer to try.
    const clusterOffsets = latticeByDistance(extent, 1);

    // What's down: rectangles by piece, found through a coarse grid; coverage squares by cluster;
    // and the rectangles that must stay out of every square.
    const grid = new Map();
    const placedRects = new Map();
    const squares = new Map();
    const sensitive = new Map();
    // Where power reaches (see `poweredRanges`), kept until something is put down or lifted.
    let reachCache = null;
    const occupy = (key, spot) => {
        reachCache = null;
        placedRects.set(key, spot.rects);
        spot.rects.forEach(r => cellsOf(r).forEach(c => {
            if (!grid.has(c)) grid.set(c, new Set());
            grid.get(c).add(key);
        }));
        if (spot.squares) squares.set(key, spot.squares);
        if (spot.sensitive?.length) sensitive.set(key, spot.sensitive);
    };
    const vacate = key => {
        reachCache = null;
        (placedRects.get(key) || []).forEach(r => cellsOf(r).forEach(c => grid.get(c)?.delete(key)));
        placedRects.delete(key);
        squares.delete(key);
        sensitive.delete(key);
    };
    const free = (r, ignore, extra = []) => {
        if (!inside(r)) return false;
        for (const c of cellsOf(r)) {
            for (const other of grid.get(c) || []) {
                if (other === ignore) continue;
                if (placedRects.get(other).some(o => overlaps(r, o))) return false;
            }
        }
        return !extra.some(o => overlaps(r, o));
    };
    const inOtherSquare = (r, ignore) => {
        for (const [key, list] of squares) {
            if (key !== ignore && list.some(s => overlaps(r, s))) return true;
        }
        return false;
    };
    occupy('storage', { rects: [storageRect] });

    // The power term of a rigid piece's cost at `rects` (see `POWER_PENALTY`): an electric unit
    // out of power's reach costs the penalty; the generator or a pole saves it for each electric
    // unit already down that power then reaches.
    const rangeAround = (r, size) => ({ x: r.x + r.w / 2 - size / 2, y: r.y + r.h / 2 - size / 2, w: size, h: size });
    // Where power reaches, with piece `i` (the generator or a pole) at `rect` if given: the
    // generator's range, then each pole's whose pole touches a range already in.
    const poweredRanges = (i = -1, rect = null) => {
        const at = k => (k === i ? rect : placedRects.get(k)?.[0]);
        const generator = at(generatorIndex);
        if (!generator) return [];
        const ranges = [rangeAround(generator, GENERATOR_RANGE)];
        let left = poleIndices.filter(k => at(k));
        for (let grew = true; grew && left.length;) {
            grew = false;
            left = left.filter(k => {
                if (!ranges.some(range => overlapArea(range, at(k)) > EPSILON)) return true;
                ranges.push(rangeAround(at(k), POLE_RANGE));
                grew = true;
                return false;
            });
        }
        return ranges;
    };
    const reaches = (ranges, rect) => ranges.some(range => overlapArea(range, rect) > EPSILON);
    const powerCost = (i, shape, rects) => {
        if (generatorIndex < 0) return 0;
        if (i === generatorIndex || poleIndices.includes(i)) {
            const ranges = poweredRanges(i, rects[0]);
            const reached = electricIndices.filter(e => placedRects.has(e) && placedRects.get(e).some(r => reaches(ranges, r))).length;
            if (i === generatorIndex) {
                const toTarget = powerTarget ? Math.hypot(rects[0].x + rects[0].w / 2 - powerTarget.x, rects[0].y + rects[0].h / 2 - powerTarget.y) : 0;
                return -POWER_PENALTY * reached + POWER_TARGET_WEIGHT * toTarget;
            }
            // A pole off the network powers nothing, so it may as well sit anywhere else. On it,
            // it's also worth the ground it adds to what power reaches, so poles put down before
            // the units on electricity spread the power out for them instead of crowding in.
            const own = rangeAround(rects[0], POLE_RANGE);
            if (!ranges.some(range => range.x === own.x && range.y === own.y && range.w === own.w)) return POWER_PENALTY;
            const added = Math.max(0, own.w * own.h - ranges.filter(range => range !== ranges.find(r => r.x === own.x && r.y === own.y && r.w === own.w))
                .reduce((sum, range) => sum + overlapArea(own, range), 0));
            return -POWER_PENALTY * reached - POWER_GROUND * added;
        }
        if (!shape.members.some(m => m.is_emode)) return 0;
        if (!reachCache) reachCache = poweredRanges();
        if (!reachCache.length) return 0;
        return shape.members.reduce((sum, m, j) => sum + (m.is_emode && !reaches(reachCache, rects[j]) ? POWER_PENALTY : 0), 0);
    };

    const placeRigid = i => {
        let best = null;
        // The generator and its poles are worth where their power reaches, not how near they sit,
        // so they look everywhere; a pole only where it touches the power already reaching out.
        const power = i === generatorIndex || poleIndices.includes(i);
        const network = poleIndices.includes(i) ? poweredRanges(i, null) : null;
        for (const shape of shapes[i]) {
            let firstFit = null;
            for (const [ox, oy, distance] of offsets) {
                if (!power && firstFit !== null && distance > firstFit + shape.spread + STEP) break;
                const x = snap(ox - shape.cx);
                const y = snap(oy - shape.cy);
                tried++;
                const rects = shape.members.map(m => ({ x: m.x + x, y: m.y + y, w: m.w, h: m.h }));
                if (network?.length && !reaches(network, rects[0])) continue;
                if (!rects.every(r => free(r, i))) continue;
                const touchy = rects.filter((r, j) => shape.members[j].sensitive);
                if (touchy.some(r => inOtherSquare(r, i))) continue;
                if (firstFit === null) firstFit = distance;
                const cost = shape.members.reduce((sum, m) => sum + m.weight * centerDistance(m, x, y), 0)
                    // Pieces nobody visits still go as close as they can, to keep the homeland tight.
                    + EPSILON * Math.hypot(shape.cx + x, shape.cy + y)
                    + powerCost(i, shape, rects);
                if (!best || cost < best.cost - EPSILON) best = { cost, x, y, shape, rects, sensitive: touchy };
            }
        }
        return best;
    };

    // A cluster's buildings at `(x, y)` in orientation `shape`, with its plots in the plan's own
    // arrangement (turned with it), the busiest crops on the plots nearest the Storage Unit; with
    // `pack`, also packed afresh nearest the Storage Unit within their zones, if that's cheaper.
    const tryCluster = (i, shape, x, y, pack, clear) => {
        tried++;
        const buildings = shape.buildings.map(b => ({ x: b.x + x, y: b.y + y, w: b.w, h: b.h }));
        const own = buildings.map(b => ({ x: b.x + b.w / 2 - RADIUS, y: b.y + b.h / 2 - RADIUS, w: 2 * RADIUS, h: 2 * RADIUS }));
        if (!clear(buildings, own)) return null;
        const allowed = (r, zone) => {
            const inside = shape.pair ? [[0], [0, 1], [1]][zone] : [0];
            const outside = shape.pair ? [[1], [], [0]][zone] : [];
            return inside.every(k => overlaps(r, own[k])) && outside.every(k => !overlaps(r, own[k])) && !inOtherSquare(r, i);
        };
        const costOf = rects => shape.plots.reduce((sum, p, j) => sum + p.weight * Math.hypot(rects[j].x + p.w / 2, rects[j].y + p.h / 2), 0);
        let plots = null;
        const slots = shape.plots.map((p, j) => ({ x: shape.planned[j].x + x, y: shape.planned[j].y + y, w: p.w, h: p.h }));
        if (slots.every(r => free(r, i) && !buildings.some(b => overlaps(r, b)))) {
            plots = assignSlots(shape.plots, slots);
            if (!plots.every((r, j) => allowed(r, shape.plots[j].zone))) plots = null;
        }
        // Packing afresh is only tried where the plan's arrangement fits: in crowded ground it
        // mostly fails, and failing is the slow part.
        if (pack && plots) {
            const packed = packPlots(shape.plots, own, allowed, r => free(r, i), buildings);
            if (packed && costOf(packed) < costOf(plots) - EPSILON) plots = packed;
        }
        if (!plots) return null;
        return { cost: costOf(plots), x, y, shape, rects: [...buildings, ...plots], squares: own, sensitive: plots };
    };

    const placeCluster = i => {
        let best = null;
        // Whether buildings standing here are clear, with their squares clear of every other
        // building's square and every crop that must stay uncovered. A lone building stands in
        // the same place in every orientation, so each place is worked out once.
        const known = new Map();
        const clear = (buildings, own) => {
            const key = buildings.map(b => `${b.x},${b.y},${b.w}`).join('|');
            if (!known.has(key)) {
                known.set(key, buildings.every(r => free(r, i))
                    && ![...squares].some(([k, list]) => k !== i && list.some(s => own.some(o => overlaps(o, s))))
                    && ![...sensitive].some(([k, list]) => k !== i && list.some(r => own.some(o => overlaps(o, r)))));
            }
            return known.get(key);
        };
        for (const shape of shapes[i]) {
            let fits = 0;
            for (const [ox, oy] of clusterOffsets) {
                if (fits >= CLUSTER_TRIES) break;
                const pack = fits < CLUSTER_PACKS && shape.plots.length <= CLUSTER_PACK_MOST;
                const spot = tryCluster(i, shape, Math.round(ox - shape.cx), Math.round(oy - shape.cy), pack, clear);
                if (!spot) continue;
                fits++;
                if (!best || spot.cost < best.cost - EPSILON) best = spot;
            }
        }
        return best;
    };

    const place = i => (pieces[i].cluster ? placeCluster(i) : placeRigid(i));
    const placed = new Map();
    const unplaced = [];
    // Nothing moves out while pieces are first put down, so once a piece of some shape finds no
    // room, no later one of that shape will: they're skipped rather than searched for again.
    const noRoom = new Set();
    const shapeOf = i => (pieces[i].cluster ? null : JSON.stringify(pieces[i].members.map(m => [m.x, m.y, m.w, m.h, !!m.sensitive])));
    for (const i of order) {
        const shape = shapeOf(i);
        const spot = shape !== null && noRoom.has(shape) ? null : place(i);
        if (!spot) {
            if (shape !== null) noRoom.add(shape);
            unplaced.push(i);
            continue;
        }
        placed.set(i, spot);
        occupy(i, spot);
    }
    // Lift each piece and put it back where it's cheapest now, until a pass moves nothing.
    for (let pass = 0; pass < passes; pass++) {
        let moved = false;
        for (const i of order) {
            if (!placed.has(i)) continue;
            vacate(i);
            const spot = place(i);
            if (spot && spot.cost < placed.get(i).cost - 1e-9) {
                placed.set(i, spot);
                moved = true;
            }
            occupy(i, placed.get(i));
        }
        if (!moved) break;
    }

    return {
        storage: storageRect,
        unplaced,
        tried,
        pieces: pieces.map((piece, i) => {
            const spot = placed.get(i);
            if (!spot) return { ...piece, members: [], cost: 0 };
            const source = piece.cluster ? [...piece.buildings, ...piece.plots] : piece.members;
            return {
                ...piece,
                members: spot.rects.map((r, j) => ({ ...source[j], x: r.x, y: r.y, w: r.w, h: r.h })),
                cost: spot.cost,
            };
        }),
    };
}

// Lays the homeland out within its open `cells` (in homeland tiles), trying the Storage Unit at
// the middle of the open area and at the middles of the open plots nearest it, and keeping
// whichever walks least with everything placed. Returns what `layOut` does, moved into the
// homeland's own frame, plus `storageAt`, the Storage Unit's center. With `maxPoles` given, the
// Crackle Generator and its poles then go down too (see `placePower`), as pieces of their own,
// and `unpowered` counts the electric units still out of their reach.
export function layOutHomeland(pieces, cells, storage = { w: 2, h: 2 }, maxPoles = null) {
    const area = cells.reduce((sum, c) => sum + c.w * c.h, 0);
    const mid = {
        x: cells.reduce((sum, c) => sum + (c.x + c.w / 2) * c.w * c.h, 0) / area,
        y: cells.reduce((sum, c) => sum + (c.y + c.h / 2) * c.w * c.h, 0) / area,
    };
    const byMid = cells
        .map(c => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 }))
        .sort((a, b) => Math.hypot(a.x - mid.x, a.y - mid.y) - Math.hypot(b.x - mid.x, b.y - mid.y));
    const candidates = [mid, ...byMid.slice(0, 4)]
        .map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }))
        .filter((p, i, all) => all.findIndex(q => q.x === p.x && q.y === p.y) === i);
    let best = null;
    let tried = 0;
    for (const at of candidates) {
        const storageRect = { x: at.x - storage.w / 2, y: at.y - storage.h / 2, w: storage.w, h: storage.h };
        if (cells.reduce((sum, c) => sum + overlapArea(storageRect, c), 0) < storage.w * storage.h - EPSILON) continue;
        const relative = cells.map(c => ({ x: c.x - at.x, y: c.y - at.y, w: c.w, h: c.h }));
        const out = layOut(pieces, { storage, cells: relative });
        tried += out.tried;
        const cost = out.pieces.reduce((sum, p) => sum + p.cost, 0);
        const better = !best || out.unplaced.length < best.out.unplaced.length
            || (out.unplaced.length === best.out.unplaced.length && cost < best.cost - EPSILON);
        if (better) best = { out, cost, at };
    }
    const { out, at } = best;
    const move = r => ({ ...r, x: r.x + at.x, y: r.y + at.y });
    const placed = out.pieces.map(p => ({ ...p, members: p.members.map(move) }));
    const storagePlaced = move(out.storage);
    let unpowered = 0;
    if (maxPoles !== null) {
        const members = placed.flatMap(p => p.members);
        const power = placePower(members, storagePlaced, cells, maxPoles);
        if (power) {
            unpowered = power.unpowered.length;
            const piece = (r, extra) => ({ cost: 0, members: [{ ...r, weight: 0, sensitive: false, ...extra }] });
            if (power.generator && !members.includes(power.generator)) placed.push(piece(power.generator, { facility: 'Crackle Generator', generator: true }));
            power.poles.forEach(pole => placed.push(piece(pole, { facility: 'Crackle Power Pole', powerPole: true })));
            // Poles the layout put down that power turned out not to need.
            for (let k = placed.length - 1; k >= 0; k--) {
                if (placed[k].members.some(m => power.removed.includes(m))) placed.splice(k, 1);
            }
        }
    }
    return {
        ...out,
        tried,
        storageAt: at,
        storage: storagePlaced,
        pieces: placed,
        unpowered,
    };
}

// The Crackle Generator's range and a Crackle Power Pole's, squares centered on each, and their
// footprints (see GENERATOR_POWER_RANGE and FACILITY_FOOTPRINTS in facility-config.js).
const GENERATOR_RANGE = 11;
const POLE_RANGE = 7;
const GENERATOR_SIZE = 2;
const POLE_SIZE = 1.5;

// The center for a Crackle Generator whose 11x11 range reaches the most of `units` (any part of
// one counts), and of those, the nearest them all; null with no units.
function bestGeneratorSpot(units) {
    if (!units.length) return null;
    const half = GENERATOR_RANGE / 2;
    const x0 = Math.min(...units.map(u => u.x)) - half;
    const y0 = Math.min(...units.map(u => u.y)) - half;
    const x1 = Math.max(...units.map(u => u.x + u.w)) + half;
    const y1 = Math.max(...units.map(u => u.y + u.h)) + half;
    let best = null;
    for (let y = y0; y <= y1; y += 0.5) {
        for (let x = x0; x <= x1; x += 0.5) {
            const range = { x: x - half, y: y - half, w: GENERATOR_RANGE, h: GENERATOR_RANGE };
            const reached = units.filter(u => overlapArea(range, u) > EPSILON);
            const spread = reached.reduce((sum, u) => sum + Math.hypot(u.x + u.w / 2 - x, u.y + u.h / 2 - y), 0);
            if (!best || reached.length > best.count || (reached.length === best.count && spread < best.spread - EPSILON)) {
                best = { x, y, count: reached.length, spread };
            }
        }
    }
    return { x: best.x, y: best.y };
}

// Places the Crackle Generator and its poles on a laid-out homeland, after everything else, and
// makes sure every unit on electricity (`is_emode`) is powered: any part of it in the
// generator's 11x11 range or a pole's 7x7, as in the game; a pole has to touch a range already
// powered. The generator and poles the layout put down (members marked `generator` and
// `powerPole`) are kept; with no generator, one goes on free ground where it powers the most
// electric units. Then a pole at a time where it powers the most still unpowered, or where none
// can yet, a chain of poles towards the nearest. An electric unit poles can't reach is moved, as
// little as it can be: to the free powered spot where its trips to the Storage Unit walk least,
// turned if that fits better; when there's none, another pole opens the most free ground first.
// Last, any pole power reaches as far without is taken back up. Moves `members` in place.
// `storage` is the Storage Unit's rect, `cells` the open ground. Returns `{ generator, poles,
// removed, unpowered }`: the generator, the poles added here, the layout's poles taken back up,
// and the electric units still out of reach (only when the homeland has no room in reach); or
// null when there's no electric unit.
export function placePower(members, storage, cells, maxPoles) {
    const electric = members.filter(m => m.is_emode);
    if (!electric.length) return null;

    // The open ground on a quarter-tile grid: what's open, what's taken, what's powered.
    const Q = 1 / STEP;
    const x0 = Math.min(...cells.map(c => c.x));
    const y0 = Math.min(...cells.map(c => c.y));
    const cols = Math.ceil((Math.max(...cells.map(c => c.x + c.w)) - x0) * Q);
    const rows = Math.ceil((Math.max(...cells.map(c => c.y + c.h)) - y0) * Q);
    const open = new Uint8Array(cols * rows);
    const used = new Uint8Array(cols * rows);
    const lit = new Uint8Array(cols * rows);
    const span = r => [
        Math.max(0, Math.round((r.x - x0) * Q)), Math.min(cols, Math.round((r.x + r.w - x0) * Q)),
        Math.max(0, Math.round((r.y - y0) * Q)), Math.min(rows, Math.round((r.y + r.h - y0) * Q)),
    ];
    const fill = (grid, r, value) => {
        const [a, b, c, d] = span(r);
        for (let y = c; y < d; y++) grid.fill(value, y * cols + a, y * cols + b);
    };
    cells.forEach(c => fill(open, c, 1));
    [...members, storage].forEach(m => fill(used, m, 1));
    const freeHere = r => {
        if (r.x < x0 - EPSILON || r.y < y0 - EPSILON || r.x + r.w > x0 + cols / Q + EPSILON || r.y + r.h > y0 + rows / Q + EPSILON) return false;
        const [a, b, c, d] = span(r);
        for (let y = c; y < d; y++) {
            for (let i = y * cols + a; i < y * cols + b; i++) if (!open[i] || used[i]) return false;
        }
        return true;
    };

    const rangeOf = (r, size) => ({ x: r.x + r.w / 2 - size / 2, y: r.y + r.h / 2 - size / 2, w: size, h: size });
    const powers = (range, r) => overlapArea(range, r) > EPSILON;
    const gap = (a, b) => Math.hypot(
        Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)),
        Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)),
    );
    const sx = storage.x + storage.w / 2;
    const sy = storage.y + storage.h / 2;
    // Free spots on the grid for a `w` x `h` footprint within `area`.
    const spotsIn = (area, w, h) => {
        const out = [];
        for (let y = snap(area.y0); y + h <= area.y1 + EPSILON; y += STEP) {
            for (let x = snap(area.x0); x + w <= area.x1 + EPSILON; x += STEP) {
                const r = { x, y, w, h };
                if (freeHere(r)) out.push(r);
            }
        }
        return out;
    };
    const around = (rs, margin) => ({
        x0: Math.min(...rs.map(r => r.x)) - margin,
        y0: Math.min(...rs.map(r => r.y)) - margin,
        x1: Math.max(...rs.map(r => r.x + r.w)) + margin,
        y1: Math.max(...rs.map(r => r.y + r.h)) + margin,
    });

    let generator = members.find(m => m.generator) || null;
    if (!generator) {
        let best = null;
        for (const r of spotsIn(around(electric, GENERATOR_RANGE / 2), GENERATOR_SIZE, GENERATOR_SIZE)) {
            const range = rangeOf(r, GENERATOR_RANGE);
            const covered = electric.filter(u => powers(range, u));
            const distance = covered.reduce((sum, u) => sum + Math.hypot(r.x - u.x, r.y - u.y), 0);
            if (!best || covered.length > best.count || (covered.length === best.count && distance < best.distance - EPSILON)) {
                best = { r, count: covered.length, distance };
            }
        }
        if (!best) return { generator: null, poles: [], removed: [], unpowered: electric };
        generator = best.r;
        fill(used, generator, 1);
    }

    // Power reaches the generator's range and each pole's that touches a range already in.
    const laid = members.filter(m => m.powerPole);
    const poles = [];
    const networkOf = list => {
        const ranges = [rangeOf(generator, GENERATOR_RANGE)];
        let left = [...list];
        for (let grew = true; grew && left.length;) {
            grew = false;
            left = left.filter(pole => {
                if (!ranges.some(range => overlapArea(range, pole) > EPSILON)) return true;
                ranges.push(rangeOf(pole, POLE_RANGE));
                grew = true;
                return false;
            });
        }
        return ranges;
    };
    const ranges = networkOf(laid);
    ranges.forEach(range => fill(lit, range, 1));
    const unpowered = () => electric.filter(u => !ranges.some(range => powers(range, u)));
    // Free ground a range would power that nothing powers yet, in grid cells.
    const darkGround = range => {
        const [a, b, c, d] = span(range);
        let n = 0;
        for (let y = c; y < d; y++) {
            for (let i = y * cols + a; i < y * cols + b; i++) if (open[i] && !used[i] && !lit[i]) n++;
        }
        return n;
    };
    // A pole touching a powered range, where `score` (higher is better) says.
    const addPole = score => {
        if (laid.length + poles.length >= maxPoles) return false;
        let pick = null;
        for (const r of spotsIn(around(ranges, POLE_SIZE), POLE_SIZE, POLE_SIZE)) {
            if (!ranges.some(range => overlapArea(range, r) > EPSILON)) continue;
            const range = rangeOf(r, POLE_RANGE);
            const value = score(range);
            if (value > EPSILON && (!pick || value > pick.value + EPSILON)) pick = { r, range, value };
        }
        if (!pick) return false;
        poles.push(pick.r);
        fill(used, pick.r, 1);
        ranges.push(pick.range);
        fill(lit, pick.range, 1);
        return true;
    };

    // Poles where they power what's still out of reach; where none can yet, a chain of them
    // towards the nearest, each bringing the power closer.
    while (unpowered().length) {
        const left = unpowered();
        const reach = Math.min(...left.map(u => Math.min(...ranges.map(range => gap(range, u)))));
        const added = addPole(range => {
            const covers = left.filter(u => powers(range, u)).length;
            const nearest = Math.min(...left.map(u => gap(range, u)));
            return covers ? covers * 1000 - nearest : reach - nearest - STEP;
        });
        if (!added) break;
    }

    // Whatever is still out of reach moves into it, where its walking costs least.
    const moveIntoRange = unit => {
        fill(used, unit, 0);
        let pick = null;
        for (const [w, h] of unit.w === unit.h ? [[unit.w, unit.h]] : [[unit.w, unit.h], [unit.h, unit.w]]) {
            // Any part of it in a range will do, so it may reach past one by nearly its size.
            for (const r of spotsIn(around(ranges, Math.max(w, h) - STEP), w, h)) {
                if (!ranges.some(range => powers(range, r))) continue;
                const cost = (unit.weight || 0) * Math.hypot(r.x + w / 2 - sx, r.y + h / 2 - sy) + Math.hypot(r.x - unit.x, r.y - unit.y) * EPSILON;
                if (!pick || cost < pick.cost) pick = { r, cost };
            }
        }
        if (pick) Object.assign(unit, { x: pick.r.x, y: pick.r.y, w: pick.r.w, h: pick.r.h });
        fill(used, unit, 1);
        return !!pick;
    };
    for (let left = unpowered(); left.length; left = unpowered()) {
        // The busiest first, so it gets the spot nearest the Storage Unit.
        const unit = [...left].sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
        if (moveIntoRange(unit)) continue;
        // No room in reach: a pole that opens the most free ground, then try again.
        if (!addPole(darkGround)) break;
    }

    // Any pole power reaches as far without is taken back up, the last ones first.
    const removed = [];
    const powered = electric.filter(u => ranges.some(range => powers(range, u)));
    for (const pole of [...laid, ...poles].reverse()) {
        const rest = [...laid, ...poles].filter(other => other !== pole && !removed.includes(other));
        const without = networkOf(rest);
        if (powered.every(u => without.some(range => powers(range, u)))) removed.push(pole);
    }
    return {
        generator,
        poles: poles.filter(pole => !removed.includes(pole)),
        removed: removed.filter(pole => laid.includes(pole)),
        unpowered: unpowered(),
    };
}

// Puts `plots` on `slots` (the plan's own arrangement, one slot per plot, each slot sized for the
// plot that had it): within each facility and zone, the busiest crop takes the slot nearest the
// Storage Unit.
function assignSlots(plots, slots) {
    const result = new Array(plots.length);
    const groups = new Map();
    plots.forEach((p, j) => {
        const key = `${p.facility}|${p.zone}|${p.w}x${p.h}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(j);
    });
    for (const members of groups.values()) {
        const nearest = members.map(j => slots[j]).sort((a, b) => Math.hypot(a.x + a.w / 2, a.y + a.h / 2) - Math.hypot(b.x + b.w / 2, b.y + b.h / 2));
        const busiest = [...members].sort((a, b) => plots[b].weight - plots[a].weight);
        busiest.forEach((j, k) => { result[j] = nearest[k]; });
    }
    return result;
}

// Packs `plots` (busiest first) where `allowed(rect, zone)` and `free(rect)`, each at the spot
// nearest the Storage Unit, around the cluster's squares; null if one doesn't fit.
function packPlots(plots, squares, allowed, free, buildings) {
    const minX = Math.min(...squares.map(s => s.x));
    const minY = Math.min(...squares.map(s => s.y));
    const maxX = Math.max(...squares.map(s => s.x + s.w));
    const maxY = Math.max(...squares.map(s => s.y + s.h));
    const result = new Array(plots.length);
    const taken = [...buildings];
    const order = plots.map((p, j) => j).sort((a, b) => plots[b].weight - plots[a].weight);
    // Every spot a plot of each size could take, nearest the Storage Unit first.
    const spots = new Map();
    const spotsFor = (w, h) => {
        const key = `${w}x${h}`;
        if (!spots.has(key)) {
            const list = [];
            for (let x = snap(minX - w + STEP); x <= maxX - STEP + EPSILON; x += STEP) {
                for (let y = snap(minY - h + STEP); y <= maxY - STEP + EPSILON; y += STEP) {
                    list.push({ x, y, w, h, distance: Math.hypot(x + w / 2, y + h / 2) });
                }
            }
            spots.set(key, list.sort((a, b) => a.distance - b.distance));
        }
        return spots.get(key);
    };
    for (const j of order) {
        const p = plots[j];
        const r = spotsFor(p.w, p.h).find(r => allowed(r, p.zone) && !taken.some(t => overlaps(r, t)) && free(r));
        if (!r) return null;
        result[j] = { x: r.x, y: r.y, w: r.w, h: r.h };
        taken.push(result[j]);
    }
    return result;
}

// A rigid piece turned 0 to 3 quarter turns, each with its members' weighted center, used to
// sweep it outward, and how far its members spread from that center.
function orientations(members) {
    const seen = new Set();
    const out = [];
    for (let turns = 0; turns < 4; turns++) {
        const turned = members.map(m => turn(m, turns));
        const minX = Math.min(...turned.map(m => m.x));
        const minY = Math.min(...turned.map(m => m.y));
        const shifted = turned.map(m => ({ ...m, x: snap(m.x - minX), y: snap(m.y - minY) }));
        const key = shifted.map(m => `${m.x},${m.y},${m.w},${m.h}`).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const weight = shifted.reduce((sum, m) => sum + m.weight, 0);
        const areaWeight = shifted.reduce((sum, m) => sum + m.w * m.h, 0);
        const by = weight > EPSILON ? (m => m.weight / weight) : (m => (m.w * m.h) / areaWeight);
        const cx = shifted.reduce((sum, m) => sum + by(m) * (m.x + m.w / 2), 0);
        const cy = shifted.reduce((sum, m) => sum + by(m) * (m.y + m.h / 2), 0);
        const spread = Math.max(...shifted.map(m => Math.hypot(m.x + m.w / 2 - cx, m.y + m.h / 2 - cy)));
        out.push({ turns, members: shifted, cx, cy, spread });
    }
    return out;
}

// A cluster turned 0 to 3 quarter turns and mirrored or not, which turns its plan's arrangement
// with it; swept outward by its first building's center.
function clusterOrientations(cluster) {
    const pair = cluster.buildings.length > 1;
    const out = [];
    const mirror = r => ({ ...r, x: -(r.x + r.w) });
    for (let variant = 0; variant < 8; variant++) {
        const turns = variant % 4;
        const flip = variant >= 4 ? mirror : (r => r);
        const buildings = cluster.buildings.map(b => turn(flip(b), turns));
        const planned = cluster.plots.map((p, j) => turn(flip({ ...cluster.planned[j], w: p.w, h: p.h }), turns));
        const minX = Math.min(...buildings.map(b => b.x));
        const minY = Math.min(...buildings.map(b => b.y));
        const shift = r => ({ ...r, x: snap(r.x - minX), y: snap(r.y - minY) });
        const shifted = buildings.map(shift);
        out.push({
            turns,
            pair,
            buildings: shifted,
            plots: cluster.plots,
            planned: planned.map(shift),
            cx: shifted[0].x + shifted[0].w / 2,
            cy: shifted[0].y + shifted[0].h / 2,
        });
    }
    return out;
}

// A rectangle turned `turns` quarter turns about its frame's origin.
function turn(m, turns) {
    let { x, y, w, h } = m;
    for (let t = 0; t < turns; t++) {
        [x, y, w, h] = [-(y + h), x, h, w];
    }
    return { ...m, x, y, w, h };
}

// Points `step` tiles apart across `extent` (`{ x, y, x2, y2 }`), nearest the origin first:
// `[x, y, distance]`.
function latticeByDistance(extent, step) {
    const points = [];
    for (let i = Math.floor(extent.x / step); i <= Math.ceil(extent.x2 / step); i++) {
        for (let j = Math.floor(extent.y / step); j <= Math.ceil(extent.y2 / step); j++) {
            const x = i * step;
            const y = j * step;
            points.push([x, y, Math.hypot(x, y)]);
        }
    }
    return points.sort((a, b) => a[2] - b[2]);
}

function overlapArea(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
}

const snap = v => Math.round(v / STEP) * STEP;

function centerDistance(m, x, y) {
    return Math.hypot(m.x + x + m.w / 2, m.y + y + m.h / 2);
}

function overlaps(a, b) {
    return a.x < b.x + b.w - EPSILON && b.x < a.x + a.w - EPSILON && a.y < b.y + b.h - EPSILON && b.y < a.y + a.h - EPSILON;
}

function cellsOf(r) {
    const cells = [];
    for (let cx = Math.floor(r.x / CELL); cx <= Math.floor((r.x + r.w - EPSILON) / CELL); cx++) {
        for (let cy = Math.floor(r.y / CELL); cy <= Math.floor((r.y + r.h - EPSILON) / CELL); cy++) {
            cells.push(`${cx},${cy}`);
        }
    }
    return cells;
}
