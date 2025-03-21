import { getAST } from '@utilize/json-schema-parser';
import { generate } from '@utilize/json-schema-typescript-generator';
import { format } from 'prettier';

import { readFileSync, writeFileSync } from 'node:fs';

async function execute() {
	const ast = await getAST({
		schema: JSON.parse(readFileSync('person.json', 'utf-8')),
		name: 'Person',
		options: {},
	});
	const tsCode = generate(ast);
	const formatted = await format(tsCode, { parser: 'typescript' });

	writeFileSync('person.d.ts', formatted);
}

execute();
