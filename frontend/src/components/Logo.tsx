export default function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Icon - Ivy leaf with prediction chart */}
      <g>
        {/* Leaf shape */}
        <path
          d="M8 20C8 20 12 8 20 8C24 8 26 12 26 16C26 20 24 24 20 24C16 24 12 20 8 20Z"
          fill="url(#leaf-gradient)"
          stroke="#059669"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Stem */}
        <path
          d="M20 24L20 32"
          stroke="#059669"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Prediction chart overlay */}
        <path
          d="M10 18L14 15L18 17L22 13"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="18" r="1.5" fill="#3B82F6" />
        <circle cx="14" cy="15" r="1.5" fill="#3B82F6" />
        <circle cx="18" cy="17" r="1.5" fill="#3B82F6" />
        <circle cx="22" cy="13" r="1.5" fill="#3B82F6" />
      </g>

      {/* Text */}
      <text
        x="40"
        y="25"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill="#111827"
      >
        IVY
      </text>
      <text
        x="77"
        y="25"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="400"
        fill="#6B7280"
      >
        Predict
      </text>

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="leaf-gradient" x1="8" y1="8" x2="26" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}
