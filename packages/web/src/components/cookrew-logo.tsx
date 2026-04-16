export function CokrewIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="ht"
          width="3"
          height="3"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.5" cy="1.5" r=".6" fill="#2D2A20" opacity=".08" />
        </pattern>
      </defs>
      <path
        d="M6 30 Q6 12 18 8 Q30 12 30 30 Z"
        fill="#ffd600"
        stroke="#2D2A20"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 12 Q30 15 30 30 L20 30 Q24 20 22 12 Z"
        fill="url(#ht)"
      />
      <path
        d="M18 8 Q20 4 22 2"
        stroke="#8c7ae6"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="22" cy="2" r="2.5" fill="#2D2A20" />
      <circle
        cx="13"
        cy="20"
        r="3.5"
        fill="#fff"
        stroke="#2D2A20"
        strokeWidth="2"
      />
      <circle cx="13" cy="20" r="1.5" fill="#2D2A20" />
      <circle
        cx="23"
        cy="20"
        r="3.5"
        fill="#fff"
        stroke="#2D2A20"
        strokeWidth="2"
      />
      <circle cx="23" cy="20" r="1.5" fill="#2D2A20" />
      <path
        d="M14 27 Q18 30 22 27"
        stroke="#2D2A20"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="8.5" cy="26" r="1.5" fill="#fb923c" opacity=".45" />
      <circle cx="27.5" cy="26" r="1.5" fill="#fb923c" opacity=".45" />
    </svg>
  )
}
