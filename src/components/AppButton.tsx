import type { ReactNode } from 'react';

type AppButtonVariant = 'primary' | 'secondary' | 'pill' | 'text' | 'cancel';
type AppButtonWidth = 'auto' | 'fixed';

interface AppButtonProps {
  children?: ReactNode;
  className?: string;
  variant?: AppButtonVariant;
  width?: AppButtonWidth;
  [key: string]: unknown;
}

const VARIANT_CLASS: Record<AppButtonVariant, string> = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  pill: 'ui-btn-primary-pill',
  text: 'ui-btn-text',
  cancel: 'ui-btn-cancel',
};

function joinClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function AppButton({
  variant = 'primary',
  width = 'auto',
  className,
  ...props
}: AppButtonProps) {
  const shouldUseFixedWidth = width === 'fixed';

  return (
    <button
      {...props}
      className={joinClassNames(
        VARIANT_CLASS[variant],
        shouldUseFixedWidth && 'w-24',
        className
      )}
    />
  );
}
