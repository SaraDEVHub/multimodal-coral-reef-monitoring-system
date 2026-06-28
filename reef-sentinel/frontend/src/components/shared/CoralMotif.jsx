export default function CoralMotif({ className = "", opacity = 1 }) {
  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      className={className}
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M100 210V140M100 140C100 140 70 130 60 100C52 76 60 50 60 50M100 140C100 140 130 130 140 100C148 76 140 50 140 50M100 140V90M100 90C100 90 80 84 74 64C69 48 74 30 74 30M100 90C100 90 120 84 126 64C131 48 126 30 126 30M60 50C60 50 45 46 40 32M140 50C140 50 155 46 160 32M74 30C74 30 64 26 60 16M126 30C126 30 136 26 140 16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="32" r="3" fill="currentColor" />
      <circle cx="160" cy="32" r="3" fill="currentColor" />
      <circle cx="60" cy="16" r="2.5" fill="currentColor" />
      <circle cx="140" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}
