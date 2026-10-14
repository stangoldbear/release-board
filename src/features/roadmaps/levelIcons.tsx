import type { SVGProps } from 'react';

// The icons of the levels of the rows: bars across a square, as many as the rows the level gives a
// project, in the color of the text. Thin and close for the titles alone and for «Info
// principali», thick for the Team level, whose rows are the roomiest.

type IconProps = SVGProps<SVGSVGElement>;

/** Rounded bars twelve units wide on a square of sixteen, from the given tops. */
function LevelBars({
  tops,
  thickness,
  ...props
}: IconProps & { tops: readonly number[]; thickness: number }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" {...props}>
      {tops.map((top) => (
        <rect key={top} x={2} y={top} width={12} height={thickness} rx={thickness / 4} />
      ))}
    </svg>
  );
}

/** «Solo titoli»: two thin bars. */
export function TitlesLevelIcon(props: IconProps) {
  return <LevelBars tops={[5.5, 8.5]} thickness={2} {...props} />;
}

/** «Info principali»: three thin bars, close to each other. */
export function MainLevelIcon(props: IconProps) {
  return <LevelBars tops={[4, 7, 10]} thickness={2} {...props} />;
}

/** «Team»: three thick bars. */
export function TeamLevelIcon(props: IconProps) {
  return <LevelBars tops={[2, 6.5, 11]} thickness={3} {...props} />;
}
