import {
	type ParserOptions as $RefOptions,
	$RefParser,
} from '@apidevtools/json-schema-ref-parser';

import type { JSONSchema } from './types/JSONSchema';

export type DereferencedPaths = WeakMap<JSONSchema, string>;

export async function dereference(
	schema: JSONSchema,
	{ cwd, $refOptions }: { cwd: string; $refOptions: $RefOptions }
): Promise<{
	dereferencedPaths: DereferencedPaths;
	dereferencedSchema: JSONSchema;
}> {
	const parser = new $RefParser();
	const dereferencedPaths: DereferencedPaths = new WeakMap();
	const dereferencedSchema = (await parser.dereference(cwd, schema, {
		...$refOptions,
		dereference: {
			...$refOptions.dereference,
			onDereference($ref: string, schema: JSONSchema) {
				dereferencedPaths.set(schema, $ref);
			},
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	})) as any; // TODO: fix types
	return { dereferencedPaths, dereferencedSchema };
}
