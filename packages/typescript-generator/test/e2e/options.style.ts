import type { Options } from '@utilize/json-schema-parser';

export const input = {
	title: 'Example Schema',
	type: 'object',
	properties: {
		firstName: {
			type: 'string',
		},
		lastName: {
			id: 'lastName',
			type: 'string',
		},
	},
	required: ['firstName', 'lastName'],
};

export const options: Partial<Options> = {
	style: {
		semi: false,
		trailingComma: 'all',
		useTabs: true,
	},
};
