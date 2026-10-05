import { BUILD_INFO } from '../../infra/buildInfo';

/**
 * Version and commit of this build, centered at the bottom of every screen: whoever follows the
 * setup guide or reports a problem can tell which build is in front of them.
 */
export function VersionStamp({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-fg-muted ${className}`}>
      Versione {BUILD_INFO.version} · commit {BUILD_INFO.commit}
    </p>
  );
}
