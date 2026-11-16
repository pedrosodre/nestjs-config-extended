import { ExtendedConfigException } from './extended-config-exception';
import { formatIdentifier } from '../util/identifier.util';
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

export class SchemaValidationException extends ExtendedConfigException {
	readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;

	constructor(
		issues: ReadonlyArray<StandardSchemaV1.Issue>,
		identifier?: string | symbol,
	) {
		const details = issues
			.map(issue => {
				const path = formatPath(issue);
				return path ? `${path}: ${issue.message}` : issue.message;
			})
			.join('; ');

		super(
			`${formatIdentifier(identifier)} strategy's variables do not match the schema: ${details}`,
			{ identifier },
		);
		this.issues = issues;
	}
}
