// Web Worker for the suggested Aniimo lineup (see aniimo-team.js): the search for the fewest
// Aniimo can take a moment on a big plan, so it runs here and the page shows everything else
// meanwhile. Each request is `{ id, args }`, the arguments of `recommendTeam`; the reply is
// `{ id, team }`, or `{ id, error }`.
import { recommendTeam } from './aniimo-team.js';

self.onmessage = ({ data: { id, args } }) => {
    try {
        self.postMessage({ id, team: recommendTeam(args) });
    } catch (error) {
        self.postMessage({ id, error: String(error?.message || error) });
    }
};
