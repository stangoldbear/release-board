import { BUILD_INFO, SOURCE_REPOSITORY_URL } from '../../infra/buildInfo';
import { formatDateTimeIT } from '../../utils/dateUtils';

/** Version, build and where the data lives. */
export function AboutSection({ storage }: { storage: string }) {
  return (
    <section aria-labelledby="settings-about" className="space-y-2">
      <h3 id="settings-about" className="text-sm font-bold">
        Informazioni
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        <dt className="text-fg-muted">Versione</dt>
        <dd>{BUILD_INFO.version}</dd>
        <dt className="text-fg-muted">Build</dt>
        <dd>
          {BUILD_INFO.commit} · {formatDateTimeIT(BUILD_INFO.builtAt)}
        </dd>
        <dt className="text-fg-muted">Dati</dt>
        <dd>{storage}</dd>
        <dt className="text-fg-muted">Codice sorgente</dt>
        <dd>
          <a
            href={SOURCE_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="break-all text-link underline"
          >
            {SOURCE_REPOSITORY_URL.replace('https://', '')}
          </a>
        </dd>
      </dl>
    </section>
  );
}
