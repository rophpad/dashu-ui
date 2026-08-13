/**
 * The Dashu mark.
 *
 * Drawn with `currentColor` rather than a fixed fill, so it takes the
 * surrounding text colour — black on light, near-white on dark — without
 * shipping two assets or branching on the theme.
 *
 * Size it with a height class and leave the width automatic; the viewBox is
 * 208×222, so a fixed square would letterbox it.
 */
export default function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 208 222"
      fill="none"
      role="img"
      aria-label="Dashu"
      className={className}
    >
      <path
        d="M32.6603 85.9322C20.442 88.8641 42.1588 67.6485 46.6603 61.4322C24.5817 57.1451 4.28934 49.9322 8.57644 34.4381C19.8376 -6.26102 211.995 2.72135 199.352 43.0123C192.16 65.9322 131.16 77.4322 85.1603 71.9322L32.6603 85.9322Z"
        stroke="currentColor"
        strokeWidth="16"
      />
      <path
        d="M8.14771 42.7289V89.8604C11.2916 98.0771 32.8414 115.339 93.8896 118.652C154.938 121.965 189.349 103.204 198.924 93.41V42.7289"
        stroke="currentColor"
        strokeWidth="16"
      />
      <path
        d="M8.14771 89.887V137.018C11.2916 145.235 32.8414 162.497 93.8896 165.81C154.938 169.123 189.349 150.363 198.924 140.568V89.887"
        stroke="currentColor"
        strokeWidth="16"
      />
      <path
        d="M8.14771 137.045V184.177C11.2916 192.393 32.8414 209.655 93.8896 212.968C154.938 216.281 189.349 197.521 198.924 187.726V137.045"
        stroke="currentColor"
        strokeWidth="16"
      />
      <circle cx="70.1084" cy="41.2972" r="8" fill="currentColor" />
      <circle cx="100.478" cy="41.2972" r="8" fill="currentColor" />
      <circle cx="130.847" cy="41.2972" r="8" fill="currentColor" />
    </svg>
  );
}
