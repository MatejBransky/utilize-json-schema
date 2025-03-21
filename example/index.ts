import { compileFromFile } from 'json-schema-to-typescript';

import { writeFileSync } from 'fs';

async function generate() {
	writeFileSync('person.d.ts', await compileFromFile('person.json'));
}

generate();
