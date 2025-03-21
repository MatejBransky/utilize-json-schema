import memoize from 'lodash/memoize';

import {
	hasComment,
	hasStandaloneName,
	T_ANY,
	T_UNKNOWN,
	type AST,
	type TInterface,
	type TIntersection,
	type TUnion,
} from './types/AST';
import { toSafeString } from './utils';

interface GeneratorOptions {
	strictIndexSignatures?: boolean;
	unknownAny?: boolean;
}

export function generateRawType(ast: AST, options: GeneratorOptions): string {
	if (hasStandaloneName(ast)) {
		return toSafeString(ast.standaloneName);
	}

	switch (ast.type) {
		case 'ANY':
			return 'any';
		case 'ARRAY':
			return (() => {
				const type = generateType(ast.params, options);
				return type.endsWith('"') ? '(' + type + ')[]' : type + '[]';
			})();
		case 'BOOLEAN':
			return 'boolean';
		case 'INTERFACE':
			return generateInterface(ast, options);
		case 'INTERSECTION':
			return generateSetOperation(ast, options);
		case 'LITERAL':
			return JSON.stringify(ast.params);
		case 'NEVER':
			return 'never';
		case 'NUMBER':
			return 'number';
		case 'NULL':
			return 'null';
		case 'OBJECT':
			return 'object';
		case 'REFERENCE':
			return ast.params;
		case 'STRING':
			return 'string';
		case 'TUPLE':
			return (() => {
				const minItems = ast.minItems;
				const maxItems = ast.maxItems || -1;

				let spreadParam = ast.spreadParam;
				const astParams = [...ast.params];
				if (
					minItems > 0 &&
					minItems > astParams.length &&
					ast.spreadParam === undefined
				) {
					// this is a valid state, and JSONSchema doesn't care about the item type
					if (maxItems < 0) {
						// no max items and no spread param, so just spread any
						spreadParam = options.unknownAny ? T_UNKNOWN : T_ANY;
					}
				}
				if (maxItems > astParams.length && ast.spreadParam === undefined) {
					// this is a valid state, and JSONSchema doesn't care about the item type
					// fill the tuple with any elements
					for (let i = astParams.length; i < maxItems; i += 1) {
						astParams.push(options.unknownAny ? T_UNKNOWN : T_ANY);
					}
				}

				function addSpreadParam(params: string[]): string[] {
					if (spreadParam) {
						const spread = '...(' + generateType(spreadParam, options) + ')[]';
						params.push(spread);
					}
					return params;
				}

				function paramsToString(params: string[]): string {
					return '[' + params.join(', ') + ']';
				}

				const paramsList = astParams.map((param) =>
					generateType(param, options)
				);

				if (paramsList.length > minItems) {
					/*
        if there are more items than the min, we return a union of tuples instead of
        using the optional element operator. This is done because it is more typesafe.

        // optional element operator
        type A = [string, string?, string?]
        const a: A = ['a', undefined, 'c'] // no error

        // union of tuples
        type B = [string] | [string, string] | [string, string, string]
        const b: B = ['a', undefined, 'c'] // TS error
        */

					const cumulativeParamsList: string[] = paramsList.slice(0, minItems);
					const typesToUnion: string[] = [];

					if (cumulativeParamsList.length > 0) {
						// actually has minItems, so add the initial state
						typesToUnion.push(paramsToString(cumulativeParamsList));
					} else {
						// no minItems means it's acceptable to have an empty tuple type
						typesToUnion.push(paramsToString([]));
					}

					for (let i = minItems; i < paramsList.length; i += 1) {
						cumulativeParamsList.push(paramsList[i]!);

						if (i === paramsList.length - 1) {
							// only the last item in the union should have the spread parameter
							addSpreadParam(cumulativeParamsList);
						}

						typesToUnion.push(paramsToString(cumulativeParamsList));
					}

					return typesToUnion.join('|');
				}

				// no max items so only need to return one type
				return paramsToString(addSpreadParam(paramsList));
			})();
		case 'UNION':
			return generateSetOperation(ast, options);
		case 'UNKNOWN':
			return 'unknown';
		case 'CUSTOM_TYPE':
			return ast.params;
	}
}

function generateTypeUnmemoized(ast: AST, options: GeneratorOptions): string {
	const type = generateRawType(ast, options);

	if (options.strictIndexSignatures && ast.keyName === '[k: string]') {
		return `${type} | undefined`;
	}

	return type;
}
export const generateType = memoize(generateTypeUnmemoized);

export function generateInterface(
	ast: TInterface,
	options: GeneratorOptions
): string {
	return (
		`{` +
		'\n' +
		ast.params
			.filter((_) => !_.isPatternProperty && !_.isUnreachableDefinition)
			.map(
				({ isRequired, keyName, ast }) =>
					[isRequired, keyName, ast, generateType(ast, options)] as [
						boolean,
						string,
						AST,
						string,
					]
			)
			.map(
				([isRequired, keyName, ast, type]) =>
					(hasComment(ast) && !ast.standaloneName
						? generateComment(ast.comment, ast.deprecated) + '\n'
						: '') +
					escapeKeyName(keyName) +
					(isRequired ? '' : '?') +
					': ' +
					type
			)
			.join('\n') +
		'\n' +
		'}'
	);
}

export function generateComment(
	comment?: string,
	deprecated?: boolean
): string {
	const commentLines = ['/**'];
	if (deprecated) {
		commentLines.push(' * @deprecated');
	}
	if (typeof comment !== 'undefined') {
		commentLines.push(...comment.split('\n').map((_) => ' * ' + _));
	}
	commentLines.push(' */');
	return commentLines.join('\n');
}

/**
 * Generate a Union or Intersection
 */
function generateSetOperation(
	ast: TIntersection | TUnion,
	options: GeneratorOptions
): string {
	const members = (ast as TUnion).params.map((_) => generateType(_, options));
	const separator = ast.type === 'UNION' ? '|' : '&';
	return members.length === 1
		? members[0]!
		: '(' + members.join(' ' + separator + ' ') + ')';
}

function escapeKeyName(keyName: string): string {
	if (
		keyName.length &&
		/[A-Za-z_$]/.test(keyName.charAt(0)) &&
		/^[\w$]+$/.test(keyName)
	) {
		return keyName;
	}
	if (keyName === '[k: string]') {
		return keyName;
	}
	return JSON.stringify(keyName);
}
