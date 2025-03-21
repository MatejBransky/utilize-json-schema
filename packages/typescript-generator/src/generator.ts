import {
	generateComment,
	generateInterface,
	generateType,
	hasComment,
	hasStandaloneName,
	type AST,
	type ASTWithStandaloneName,
	type TArray,
	type TEnum,
	type TInterface,
	type TNamedInterface,
} from '@utilize/json-schema-parser';
import { toSafeString } from '@utilize/json-schema-parser/src/utils';
import { omit } from 'lodash';

export interface GeneratorOptions {
	declareExternallyReferenced: boolean;
	enableConstEnums: boolean;
	strictIndexSignatures: boolean;
}

const DEFAULT_OPTIONS = {
	declareExternallyReferenced: true,
	enableConstEnums: true,
	strictIndexSignatures: false,
};

export function generate(
	ast: AST,
	options: GeneratorOptions = DEFAULT_OPTIONS
): string {
	return (
		[
			declareNamedTypes(ast, options, ast.standaloneName!),
			declareNamedInterfaces(ast, options, ast.standaloneName!),
			declareEnums(ast, options),
		]
			.filter(Boolean)
			.join('\n\n') + '\n'
	); // trailing newline
}

function declareEnums(
	ast: AST,
	options: GeneratorOptions,
	processed = new Set<AST>()
): string {
	if (processed.has(ast)) {
		return '';
	}

	processed.add(ast);
	let type = '';

	switch (ast.type) {
		case 'ENUM':
			return generateStandaloneEnum(ast, options) + '\n';
		case 'ARRAY':
			return declareEnums(ast.params, options, processed);
		case 'UNION':
		case 'INTERSECTION':
			return ast.params.reduce(
				(prev, ast) => prev + declareEnums(ast, options, processed),
				''
			);
		case 'TUPLE':
			type = ast.params.reduce(
				(prev, ast) => prev + declareEnums(ast, options, processed),
				''
			);
			if (ast.spreadParam) {
				type += declareEnums(ast.spreadParam, options, processed);
			}
			return type;
		case 'INTERFACE':
			return getSuperTypesAndParams(ast).reduce(
				(prev, ast) => prev + declareEnums(ast, options, processed),
				''
			);
		default:
			return '';
	}
}

function declareNamedInterfaces(
	ast: AST,
	options: GeneratorOptions,
	rootASTName: string,
	processed = new Set<AST>()
): string {
	if (processed.has(ast)) {
		return '';
	}

	processed.add(ast);
	let type = '';

	switch (ast.type) {
		case 'ARRAY':
			type = declareNamedInterfaces(
				(ast as TArray).params,
				options,
				rootASTName,
				processed
			);
			break;
		case 'INTERFACE':
			type = [
				hasStandaloneName(ast) &&
					(ast.standaloneName === rootASTName ||
						options.declareExternallyReferenced) &&
					generateStandaloneInterface(ast, options),
				getSuperTypesAndParams(ast)
					.map((ast) =>
						declareNamedInterfaces(ast, options, rootASTName, processed)
					)
					.filter(Boolean)
					.join('\n'),
			]
				.filter(Boolean)
				.join('\n');
			break;
		case 'INTERSECTION':
		case 'TUPLE':
		case 'UNION':
			type = ast.params
				.map((_) => declareNamedInterfaces(_, options, rootASTName, processed))
				.filter(Boolean)
				.join('\n');
			if (ast.type === 'TUPLE' && ast.spreadParam) {
				type += declareNamedInterfaces(
					ast.spreadParam,
					options,
					rootASTName,
					processed
				);
			}
			break;
		default:
			type = '';
	}

	return type;
}

function declareNamedTypes(
	ast: AST,
	options: GeneratorOptions,
	rootASTName: string,
	processed = new Set<AST>()
): string {
	if (processed.has(ast)) {
		return '';
	}

	processed.add(ast);

	switch (ast.type) {
		case 'ARRAY':
			return [
				declareNamedTypes(ast.params, options, rootASTName, processed),
				hasStandaloneName(ast)
					? generateStandaloneType(ast, options)
					: undefined,
			]
				.filter(Boolean)
				.join('\n');
		case 'ENUM':
			return '';
		case 'INTERFACE':
			return getSuperTypesAndParams(ast)
				.map(
					(ast) =>
						(ast.standaloneName === rootASTName ||
							options.declareExternallyReferenced) &&
						declareNamedTypes(ast, options, rootASTName, processed)
				)
				.filter(Boolean)
				.join('\n');
		case 'INTERSECTION':
		case 'TUPLE':
		case 'UNION':
			return [
				hasStandaloneName(ast)
					? generateStandaloneType(ast, options)
					: undefined,
				ast.params
					.map((ast) => declareNamedTypes(ast, options, rootASTName, processed))
					.filter(Boolean)
					.join('\n'),
				'spreadParam' in ast && ast.spreadParam
					? declareNamedTypes(ast.spreadParam, options, rootASTName, processed)
					: undefined,
			]
				.filter(Boolean)
				.join('\n');
		default:
			if (hasStandaloneName(ast)) {
				return generateStandaloneType(ast, options);
			}
			return '';
	}
}

function generateStandaloneEnum(ast: TEnum, options: GeneratorOptions): string {
	const containsSpecialCharacters = (key: string): boolean =>
		/[^a-zA-Z0-9_]/.test(key);

	return (
		(hasComment(ast)
			? generateComment(ast.comment, ast.deprecated) + '\n'
			: '') +
		'export ' +
		(options.enableConstEnums ? 'const ' : '') +
		`enum ${toSafeString(ast.standaloneName)} {` +
		'\n' +
		ast.params
			.map(
				({ ast, keyName }) =>
					(containsSpecialCharacters(keyName) ? `"${keyName}"` : keyName) +
					' = ' +
					generateType(ast, options)
			)
			.join(',\n') +
		'\n' +
		'}'
	);
}

function generateStandaloneInterface(
	ast: TNamedInterface,
	options: GeneratorOptions
): string {
	return (
		(hasComment(ast)
			? generateComment(ast.comment, ast.deprecated) + '\n'
			: '') +
		`export interface ${toSafeString(ast.standaloneName)} ` +
		(ast.superTypes.length > 0
			? `extends ${ast.superTypes.map((superType) => toSafeString(superType.standaloneName)).join(', ')} `
			: '') +
		generateInterface(ast, options)
	);
}

function generateStandaloneType(
	ast: ASTWithStandaloneName,
	options: GeneratorOptions
): string {
	return (
		(hasComment(ast) ? generateComment(ast.comment) + '\n' : '') +
		`export type ${toSafeString(ast.standaloneName)} = ${generateType(
			omit<AST>(ast, 'standaloneName') as AST /* TODO */,
			options
		)}`
	);
}

function getSuperTypesAndParams(ast: TInterface): AST[] {
	return ast.params.map((param) => param.ast).concat(ast.superTypes);
}
