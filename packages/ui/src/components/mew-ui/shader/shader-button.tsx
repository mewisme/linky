'use client';

import { Button } from '@ws/ui/components/base-ui/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { Shader } from './shader';

import { cn } from '@ws/ui/lib/utils';

const buttonVariants = cva(
  'relative flex items-center justify-center bg-transparent border-none cursor-pointer outline-none rounded-full overflow-hidden font-medium whitespace-nowrap text-primary',
  {
    variants: {
      size: {
        sm: 'min-w-28 h-9 px-4 text-xs',
        md: 'min-w-35.5 h-11.5 px-5 text-sm',
        lg: 'min-w-44 h-14 px-6 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  }
);


type ShaderLayerProps = Omit<React.ComponentProps<typeof Shader>, 'className'> & {
  className?: string;
};

type ShaderButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'variant' | 'size'
> &
  VariantProps<typeof buttonVariants> & {
    shader?: ShaderLayerProps;
  };

export function ShaderButton({
  children,
  size,
  className,
  ref,
  shader,
  ...props
}: ShaderButtonProps) {
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
    <Button
      ref={ref}
      data-slot='shader-button'
      className={cn(buttonVariants({ size }), className)}
      {...props}
    >
      <Shader key={shaderKey} {...shaderLayerProps} />
      <div className='absolute inset-[calc(var(--spacing)*0.68)] rounded-full bg-primary-foreground inset-shadow-lg' />
      <span className='relative'>{children}</span>
    </Button>
  );
}
