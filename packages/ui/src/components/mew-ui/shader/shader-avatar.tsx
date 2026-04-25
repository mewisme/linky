'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@ws/ui/components/ui/avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { Shader } from './shader';

import { cn } from '@ws/ui/lib/utils';

const avatarVariants = cva(
  'relative flex items-center justify-center rounded-full overflow-visible bg-transparent',
  {
    variants: {
      size: {
        sm: 'size-8',
        md: 'size-12',
        lg: 'size-16',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

const innerVariants = cva(
  'absolute rounded-full bg-primary-foreground inset-shadow-lg',
  {
    variants: {
      size: {
        sm: 'inset-[1px]',
        md: 'inset-[2px]',
        lg: 'inset-[3px]',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

type ShaderLayerProps = Omit<React.ComponentProps<typeof Shader>, 'className'> & {
  className?: string;
};

type ShaderAvatarProps = React.ComponentProps<'div'> &
  VariantProps<typeof avatarVariants> & {
    shader?: ShaderLayerProps;
  };

function ShaderAvatar({
  size,
  className,
  children,
  shader,
  ...props
}: ShaderAvatarProps) {
  const shaderType = shader?.type ?? 'liquid-metal';
  const shaderPreset = shader?.preset ?? 'default';
  const shaderLayerClassName = cn('absolute inset-0 rounded-full', shader?.className);
  const shaderLayerProps = {
    ...shader,
    type: shaderType,
    preset: shaderPreset,
    className: shaderLayerClassName,
  } as React.ComponentProps<typeof Shader>;
  const shaderKey = `${shaderType}:${shaderPreset}`;

  return (
    <div
      data-slot='shader-avatar'
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      <Shader key={shaderKey} {...shaderLayerProps} />
      <Avatar
        className={cn(innerVariants({ size }), 'size-auto bg-transparent')}
      >
        {children}
      </Avatar>
    </div>
  );
}

export { ShaderAvatar, AvatarImage, AvatarFallback };
