/** The favicon itself, served from public/: the tab and the page show the same mark. */
const LOGO_URL = `${import.meta.env.BASE_URL}favicon.svg`;

/** The app's mark, next to its name. Decorative: the name beside it says what it is. */
export function AppLogo({ size }: { size: number }) {
  return (
    <img src={LOGO_URL} alt="" width={size} height={size} className="shrink-0" draggable={false} />
  );
}
