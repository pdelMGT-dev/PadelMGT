export type AvatarProps = { name: string; photoUrl?: string | null; size?: number };

/** Circular avatar with photo or initials fallback. Wraps `.bs-avatar` from globals.css. */
export function Avatar({ name, photoUrl, size = 34 }: AvatarProps) {
  const initials = name.trim().slice(0, 2).toUpperCase();
  return (
    <div className="bs-avatar" style={{ width: size, height: size }}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} />
      ) : (
        initials
      )}
    </div>
  );
}
