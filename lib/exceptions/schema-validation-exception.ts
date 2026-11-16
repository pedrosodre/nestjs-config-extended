import { NOT_IDENTIFIED } from '../config.constants';
import { StandardSchemaV1 } from '../interfaces/standard-schema.interface';

const formatPath = (issue: StandardSchemaV1.Issue): string =>
	(issue.path || [])
		.map(segment =>
			String(
				typeof segment === 'object' && segment !== null
					? (segment as StandardSchemaV1.PathSegment).key
					: segment,
			),
		)
		.join('.');

export class SchemaValidationException extends Error {
	readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;

	constructor(
		issues: ReadonlyArray<StandardSchemaV1.Issue>,
		identifier?: string | Symbol,
	) {
		const details = issues
			.map(issue => {
				const path = formatPath(issue);
				return path ? `${path}: ${issue.message}` : issue.message;
			})
			.join('; ');

		super(
			`${
				identifier || NOT_IDENTIFIED
			} strategy's variables do not match the schema: ${details}`,
		);
		this.name = 'SchemaValidationException';
		this.issues = issues;
	}
}
