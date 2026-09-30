import type { ComponentProps, CSSProperties } from 'react';
import { IgrIcon, IgrIconButton } from 'igniteui-react';
import { ICONS, type IconName } from '../lib/icons';

type IconProps = Omit<ComponentProps<typeof IgrIcon>, 'name' | 'collection'> & {
  name: IconName;
  /** Icon size in px (maps to Ignite UI's --ig-icon-size). */
  size?: number;
};

/** IgrIcon bound to the app's registered icon set (see lib/icons.ts). */
export function AppIcon({ name, size, style, ...rest }: IconProps) {
  const sized = size ? ({ '--ig-icon-size': `${size}px`, ...style } as CSSProperties) : style;
  return <IgrIcon {...rest} collection={ICONS} name={name} style={sized} />;
}

type IconButtonProps = Omit<ComponentProps<typeof IgrIconButton>, 'name' | 'collection'> & {
  name: IconName;
};

/** IgrIconButton bound to the app's registered icon set. Pass `aria-label` — it's icon-only. */
export function AppIconButton({ name, variant = 'flat', ...rest }: IconButtonProps) {
  return <IgrIconButton {...rest} variant={variant} collection={ICONS} name={name} />;
}
