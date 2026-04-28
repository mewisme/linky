'use client';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ws/ui/components/base-ui/card';
import { Shader } from './shader';
import { useShaderConfig } from './shader-config-provider';

import { cn } from '@ws/ui/lib/utils';

type ShaderLayerProps = Omit<React.ComponentProps<typeof Shader>, 'className'> & {
  className?: string;
};

type ShaderCardProps = React.ComponentProps<typeof Card> &
{
  shader?: ShaderLayerProps;
};

function ShaderCard({
  className,
  children,
  shader,
  ...props
}: ShaderCardProps) {
  const shaderConfig = useShaderConfig();
  const shaderType = shader?.type ?? shaderConfig.type;
  const shaderPreset = shader?.preset ?? shaderConfig.preset;
  const shaderLayerClassName = cn('absolute inset-0 rounded-2xl', shader?.className);
  const shaderLayerProps = {
    ...shader,
    type: shaderType,
    preset: shaderPreset,
    className: shaderLayerClassName,
  } as React.ComponentProps<typeof Shader>;
  const shaderKey = `${shaderType}:${shaderPreset}`;

  return (
    <Card
      data-slot='shader-card'
      className={cn(
        'relative overflow-hidden bg-transparent ring-0',
        className
      )}
      {...props}
    >
      <Shader key={shaderKey} {...shaderLayerProps} />
      <div className='absolute inset-0.75 rounded-[calc(1rem-1px)] bg-card inset-shadow-lg' />
      <div className='relative flex flex-col gap-6 group-data-[size=sm]/card:gap-4 p-2'>
        {children}
      </div>
    </Card>
  );
}

export {
  ShaderCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
