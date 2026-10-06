import type { ReactNode } from 'react';

/** The title of an area, which takes the focus when the area must be reached from elsewhere. */
export function areaTitleId(areaId: string): string {
  return `${areaId}-title`;
}

interface AreaProps {
  /** The element id, to bring the area into view. */
  id: string;
  title: string;
  /** Controls on the line of the title, after it. */
  actions?: ReactNode;
  children: ReactNode;
}

/** One of the areas of the page, with its title and the controls that belong to it. */
export function Area({ id, title, actions, children }: AreaProps) {
  const headingId = areaTitleId(id);
  return (
    <section id={id} aria-labelledby={headingId} className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id={headingId} tabIndex={-1} className="text-lg leading-tight font-extrabold">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
