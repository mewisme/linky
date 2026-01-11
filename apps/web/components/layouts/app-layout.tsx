interface AppLayoutProps {
  children: React.ReactNode;
  label?: string;
  description?: string;
}

export function AppLayout({ children, label, description }: AppLayoutProps) {
  return (
    <div className='w-full h-full container mx-auto p-4 space-y-4'>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">{label}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  )
}