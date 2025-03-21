import {
	getAST,
	type JSONSchema,
	type Options,
} from '@utilize/json-schema-parser';
import { format } from 'prettier';

import { generate } from '../src';

export async function compile(
	schema: JSONSchema,
	name: string,
	options: Options
) {
	const ast = await getAST({ schema, name, options });
	const tsCode = generate(ast);
	const formatted = format(tsCode, { parser: 'typescript' });

	return formatted;
}
