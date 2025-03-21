import cloneDeep from 'lodash/cloneDeep';
import endsWith from 'lodash/endsWith';
import merge from 'lodash/merge';

import { link } from './linker';
import { normalize } from './normalizer';
import { optimize } from './optimizer';
import { validateOptions } from './optionValidator';
import { parse } from './parser';
import { dereference } from './resolver';
import type { JSONSchema } from './types/JSONSchema';
import type { Options } from './types/Options';

export const DEFAULT_OPTIONS: Options = {
	$refOptions: {},
	additionalProperties: true, // TODO: default to empty schema (as per spec) instead
	cwd: process.cwd(),
	declareExternallyReferenced: true,
	enableConstEnums: true,
	ignoreMinAndMaxItems: false,
	inferStringEnumKeysFromValues: false,
	maxItems: 20,
	strictIndexSignatures: false,
	unreachableDefinitions: false,
	unknownAny: true,
};

export async function getAST({
	schema,
	name,
	options,
}: {
	schema: JSONSchema;
	name: string;
	options: Partial<Options>;
}) {
	validateOptions(options);

	const _options = merge({}, DEFAULT_OPTIONS, options);

	// normalize options
	if (!endsWith(_options.cwd, '/')) {
		_options.cwd += '/';
	}

	// Initial clone to avoid mutating the input
	const _schema = cloneDeep(schema);

	const { dereferencedPaths, dereferencedSchema } = await dereference(
		_schema,
		_options
	);

	const linked = link(dereferencedSchema);

	const normalized = normalize(linked, dereferencedPaths, name, _options);

	const parsed = parse(normalized, _options);

	return optimize(parsed, _options);
}
