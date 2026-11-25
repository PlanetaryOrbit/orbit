import clsx from 'clsx';
import Image from 'next/image';

const DEFAULT_AVATAR = '/default-avatar.jpg';

type AvatarProps = {
  src?: string;
  alt: string;
  className?: string;
};

export default function Avatar({ src, alt, className }: AvatarProps) {
  return (
    <Image
      src={src || DEFAULT_AVATAR}
      alt={alt}
      width={80}
      height={80}
      unoptimized
      className={clsx('rounded-full bg-zinc-200 object-cover dark:bg-zinc-800', className)}
    />
  );
}
