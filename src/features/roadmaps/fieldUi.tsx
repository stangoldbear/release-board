import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import type { TaskColorId } from '../../domain/colors';
import { fieldValuesOf, formatFieldValue } from '../../domain/roadmapConfig';
import type { FieldValue, Project, ProjectField } from '../../domain/types';
import { Highlight } from '../../shared/ui/Highlight';
import { taskColorStyle } from '../../themes';

/**
 * A value as a tag: a rounded rectangle in the color of the value, readable in every theme, or a
 * neutral one without a color. The words always say the value: the color only helps to spot it.
 */
export function FieldTag({ colorId, children }: { colorId?: TaskColorId; children: ReactNode }) {
  return (
    <span
      style={colorId ? taskColorStyle(colorId) : undefined}
      className={`inline-flex max-w-full min-w-0 items-center rounded-md border px-1.5 py-px text-xs leading-snug font-medium ${
        colorId ? '' : 'border-line-strong bg-surface text-fg'
      }`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

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
 * A field of a project as the column of the roadmap shows it: the values of a list as tags in
 * their colors, several texts as neutral tags, links side by side, the rest as text. A field of
 * one value stays on the line of its label; a list has its label above its values, so that they
 * wrap as a block. Nothing when the project has no value.
 */
export function FieldValues({ project, field }: { project: Project; field: ProjectField }) {
  const values = fieldValuesOf(project, field);
  if (values.length === 0) return null;
  const tags = field.type === 'choice' || (field.type === 'text' && field.multiple);
  const label = (
    <span className="font-semibold text-fg-muted">
      {field.label}
      {field.multiple ? <span className="sr-only">:</span> : ':'}
    </span>
  );
  const content = (
    <>
      {tags ? (
        values.map((value, index) => {
          const words = formatFieldValue(field, value);
          const option = field.options?.find((item) => item.id === value);
          return (
            <span key={index} title={words} className="flex min-w-0">
              {/* Read as a list, not as one long name. */}
              {index > 0 && <span className="sr-only">,</span>}
              <FieldTag colorId={option?.colorId}>
                <Highlight text={words} />
              </FieldTag>
            </span>
          );
        })
      ) : field.type === 'url' ? (
        values.map((value, index) => <FieldValueText key={index} field={field} value={value} />)
      ) : (
        <span className="min-w-0 wrap-break-word">
          <Highlight text={values.map((value) => formatFieldValue(field, value)).join(', ')} />
        </span>
      )}
    </>
  );
  return field.multiple ? (
    <span className="flex min-w-0 flex-col gap-0.5 text-xs">
      {label}
      <span className="flex min-w-0 flex-wrap items-center gap-1">{content}</span>
    </span>
  ) : (
    <span className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
      {label}
      {content}
    </span>
  );
}

/** The texts a search can find in the values of the fields of a project. */
export function fieldSearchTexts(project: Project, fields: readonly ProjectField[]): string[] {
  return fields.flatMap((field) =>
    fieldValuesOf(project, field).map((value) => formatFieldValue(field, value)),
  );
}
