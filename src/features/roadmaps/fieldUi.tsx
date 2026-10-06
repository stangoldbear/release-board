import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { fieldValuesOf, formatFieldValue } from '../../domain/roadmapConfig';
import type { FieldValue, Project, ProjectField } from '../../domain/types';
import { Highlight } from '../../shared/ui/Highlight';

/** What names a link in a few characters: the last piece of its path, or its host. */
export function linkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const piece = parsed.pathname.split('/').filter(Boolean).at(-1);
    return decodeURIComponent(piece ?? parsed.hostname);
  } catch {
    return url;
  }
}

/** One value of a field: a link opens in a new tab, the others are text. */
export function FieldValueText({ field, value }: { field: ProjectField; value: FieldValue }) {
  if (field.type === 'url' && typeof value === 'string') {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        title={value}
        className="inline-flex max-w-full items-center gap-0.5 text-link hover:underline"
      >
        <span className="truncate">{linkLabel(value)}</span>
        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="sr-only"> (si apre in una nuova scheda)</span>
      </a>
    );
  }
  return <Highlight text={formatFieldValue(field, value)} />;
}

/**
 * The values of a field of a project, in a line, separated by commas, after `before` (such as
 * the label of the field); nothing when the project has none.
 */
export function FieldValueList({
  project,
  field,
  before,
}: {
  project: Project;
  field: ProjectField;
  before?: ReactNode;
}) {
  const values = fieldValuesOf(project, field);
  if (values.length === 0) return null;
  return (
    <span className="inline">
      {before}
      {values.map((value, index) => (
        <span key={index}>
          {index > 0 && ', '}
          <FieldValueText field={field} value={value} />
        </span>
      ))}
    </span>
  );
}

/** The texts a search can find in the values of the fields of a project. */
export function fieldSearchTexts(project: Project, fields: readonly ProjectField[]): string[] {
  return fields.flatMap((field) =>
    fieldValuesOf(project, field).map((value) => formatFieldValue(field, value)),
  );
}
