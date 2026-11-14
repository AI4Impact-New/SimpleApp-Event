type TrainerAvatarProps = {
  initials: string;
  photo?: { src: string; alt: string };
  /** Pass the photo's alt text only where the avatar is the main image of the trainer (the profile page). */
  alt?: string;
  /** Size, radius and colour classes, shared by the photo and the initials tile. */
  className: string;
  width: number;
  height: number;
};

/** Trainer photo when one exists, otherwise an initials tile in the same frame. */
export function TrainerAvatar({ initials, photo, alt = "", className, width, height }: TrainerAvatarProps) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- static export serves images unoptimised
    return <img src={photo.src} alt={alt} width={width} height={height} className={`shrink-0 object-cover object-[center_20%] ${className}`} />;
  }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center font-(family-name:--font-display) font-bold leading-none ${className}`}
    >
      {initials}
    </span>
  );
}
