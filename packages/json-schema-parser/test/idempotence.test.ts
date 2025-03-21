import type { JSONSchema4 } from 'json-schema';
import cloneDeep from 'lodash/cloneDeep';
import { expect, it } from 'vitest';

import { getAST } from '../src';

export function run() {
	const SCHEMA: JSONSchema4 = {
		type: 'object',
		properties: {
			firstName: {
				type: 'string',
			},
		},
		required: ['firstName'],
	};

	it('compile() should not mutate its input', async () => {
		const before = cloneDeep(SCHEMA);
		await getAST({ schema: SCHEMA, name: 'A', options: {} });
		expect(before).toEqual(SCHEMA);
	});

	it('compile() should be idempotent', async () => {
		const a = await getAST({ schema: SCHEMA, name: 'A', options: {} });
		const b = await getAST({ schema: SCHEMA, name: 'A', options: {} });
		expect(a).toEqual(b);
	});
}

await run();
