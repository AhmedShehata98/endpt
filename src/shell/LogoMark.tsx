export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <img
      src="/icons/128x128.png"
      srcSet="/icons/128x128.png 1x, /icons/128x128@2x.png 2x"
      alt=""
      aria-hidden
      className={`shrink-0 rounded-md object-cover ${className}`}
      draggable={false}
    />
  );
}
