import { TextHoverEffect } from '@repo/ui/components/ui/text-hover-effect';

export const LandingFooter = () => {
  return (
    <footer className="flex flex-col relative items-center justify-center pt-16 pb-8 md:pb-0 px-6 lg:px-8 w-full max-w-7xl mx-auto">

      {/* <div className="absolute top-0 left-1/2 right-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1.5 bg-foreground rounded-full"></div> */}

      <div className="h-72 hidden md:flex items-center justify-center w-full">
        <TextHoverEffect text="LINKY" />
      </div>
    </footer>
  )
}