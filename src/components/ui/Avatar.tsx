import { cn, initials } from '@/lib/utils';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

export function Avatar({
  src,
  name,
  size = 'md',
  ring,
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
  ring?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-200 font-semibold',
        sizes[size],
        ring && 'ring-2 ring-gold-400/60 ring-offset-2 ring-offset-white dark:ring-offset-ink-950',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
