import { ZodError } from "zod";

export function stringifyError(error: ZodError): string {
	return error.issues.map(
		(issue) => `"${issue.message}" (${issue.path.join('.')})`
	).join('\n');
}