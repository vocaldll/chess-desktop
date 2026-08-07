export default function WindowsMark({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 3.45 9.75 2.1v9.45H0zm10.95-1.5L24 0v11.55H10.95zM0 12.6h9.75v9.45L0 20.7zm10.95 0H24V24l-13.05-1.8z" />
    </svg>
  )
}
