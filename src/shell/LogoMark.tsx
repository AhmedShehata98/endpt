export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-md bg-accent text-accent-on shadow-sm ${className}`}
      aria-hidden
    >
      <svg className="size-4" fill="none" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 14.5L10 5.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="6" cy="14" fill="currentColor" r="1.5" />
      </svg>
    </div>
  );
}
