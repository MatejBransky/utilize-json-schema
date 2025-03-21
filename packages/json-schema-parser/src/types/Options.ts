import type { ParserOptions as $RefOptions } from '@apidevtools/json-schema-ref-parser';

import type { LinkedJSONSchema } from './JSONSchema';

export interface Options {
	/**
	 * [$RefParser](https://github.com/APIDevTools/json-schema-ref-parser) Options, used when resolving `$ref`s
	 */
	$refOptions: $RefOptions;
	/**
	 * Default value for additionalProperties, when it is not explicitly set.
	 */
	additionalProperties: boolean;
	/**
	 * Custom function to provide a type name for a given schema
	 */
	customName?: (
		schema: LinkedJSONSchema,
		keyNameFromDefinition: string | undefined
	) => string | undefined;
	/**
	 * Root directory for resolving [`$ref`](https://tools.ietf.org/id/draft-pbryan-zyp-json-ref-03.html)s.
	 */
	cwd: string;
	/**
	 * Declare external schemas referenced via `$ref`?
	 */
	declareExternallyReferenced: boolean;
	/**
	 * Prepend enums with [`const`](https://www.typescriptlang.org/docs/handbook/enums.html#computed-and-constant-members)?
	 */
	enableConstEnums: boolean;
	/**
	 * Create enums from JSON enums with eponymous keys
	 */
	inferStringEnumKeysFromValues: boolean;
	/**
	 * Ignore maxItems and minItems for `array` types, preventing tuples being generated.
	 */
	ignoreMinAndMaxItems: boolean;
	/**
	 * Maximum number of unioned tuples to emit when representing bounded-size array types,
	 * before falling back to emitting unbounded arrays. Increase this to improve precision
	 * of emitted types, decrease it to improve performance, or set it to `-1` to ignore
	 * `minItems` and `maxItems`.
	 */
	maxItems: number;
	/**
	 * Append all index signatures with `| undefined` so that they are strictly typed.
	 *
	 * This is required to be compatible with `strictNullChecks`.
	 */
	strictIndexSignatures: boolean;
	/**
	 * Generate code for `definitions` that aren't referenced by the schema?
	 */
	unreachableDefinitions: boolean;
	/**
	 * Generate unknown type instead of any
	 */
	unknownAny: boolean;
}
