import { Link } from '@/i18n/navigation';
import { TextHoverEffect } from '@ws/ui/components/ui/text-hover-effect';

export const LandingFooter = () => {
  return (
    <footer className="flex flex-col relative items-center justify-center pb-8 md:pb-0 px-6 lg:px-8 w-full max-w-7xl mx-auto">
      <div className="h-72 hidden md:flex items-center justify-center w-full">
        <TextHoverEffect text="LINKY" />
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 md:mt-0 pb-4 md:pb-8">
        <Link
          href="/terms"
          className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Terms of Service
        </Link>
        <span className="text-xs sm:text-sm text-muted-foreground">·</span>
        <Link
          href="/privacy"
          className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Privacy Policy
        </Link>
        <span className="text-xs sm:text-sm text-muted-foreground">·</span>
        <Link
          href="/cookies"
          className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cookie Policy
        </Link>
      </div>
    </footer>
  )
}