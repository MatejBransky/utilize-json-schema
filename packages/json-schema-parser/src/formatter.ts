import { format as prettify, type Options as PrettierOptions } from 'prettier';

export interface FormatterOptions {
	/**
	 * Format code? Set this to `false` to improve performance.
	 */
	format: boolean;
	/**
	 * A [Prettier](https://prettier.io/docs/en/options.html) configuration.
	 */
	style: PrettierOptions;
}

export async function format(
	code: string,
	options: FormatterOptions
): Promise<string> {
	if (!options.format) {
		return code;
	}
	return prettify(code, { parser: 'typescript', ...options.style });
}
