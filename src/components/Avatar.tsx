import { initials } from '@/lib/types';

/* eslint-disable @next/next/no-img-element */
export function Avatar({ name, src, size = 56 }: { name: string; src: string | null; size?: number }) {
  if (src) {
    return <img className="avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}>
      {initials(name)}
    </span>
  );
}
