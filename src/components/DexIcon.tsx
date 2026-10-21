// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Dex icon from the kit (§10.7) — never redrawn.
export function DexIcon({ id, size = 40 }: { id: string; size?: number }) {
  return (
    <img
      src={`/icons/${id}.svg`}
      width={size}
      height={size}
      alt=""
      style={{ borderRadius: size * 0.22 }}
      loading="lazy"
    />
  );
}
