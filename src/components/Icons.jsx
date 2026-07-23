// Lightweight inline SVG icon set (no external icon dependency).
// Each icon inherits `currentColor` and sizes via the `size` prop.

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

export function IconHome({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  )
}

export function IconBook({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </svg>
  )
}

export function IconLayers({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  )
}

export function IconChat({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 16 0Z" />
      <path d="M8.5 11h7M8.5 14h4" />
    </svg>
  )
}

export function IconUser({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

export function IconShield({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5C8 21.2 5 17.5 5 13V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </svg>
  )
}

export function IconStar({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </svg>
  )
}

export function IconGift({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M20 12v9H4v-9" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 22V7" />
      <path d="M12 7S11 3 8.5 3 6 5.5 8 7m4 0s1-4 3.5-4S18 5.5 16 7" />
    </svg>
  )
}

export function IconSignOut({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9" />
      <path d="m16 16 4-4-4-4" />
      <path d="M20 12H9" />
    </svg>
  )
}

export function IconCollapse({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="m13 17-5-5 5-5" />
      <path d="m19 17-5-5 5-5" />
    </svg>
  )
}

export function IconUpload({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function IconVideo({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="m15 10 6-3v10l-6-3" />
    </svg>
  )
}

export function IconFile({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  )
}

export function IconCheck({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="m5 12 5 5L20 6" />
    </svg>
  )
}

export function IconSparkle({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </svg>
  )
}

export function IconSend({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  )
}
