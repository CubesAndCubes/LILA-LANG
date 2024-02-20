import * as LILA from '../index.js';

const result = LILA.compile(
    await (await fetch('./example.lila')).text()
);
