'use client';

import { Link } from '@/i18n/navigation';
import { TextHoverEffect } from '@ws/ui/components/ui/text-hover-effect';
import { useTranslations } from 'next-intl';

export const LandingFooter = () => {
  const t = useTranslations('marketing.footer');

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
          {t('terms')}
        </Link>
        <span className="text-xs sm:text-sm text-muted-foreground">·</span>
        <Link
          href="/privacy"
          className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('privacy')}
        </Link>
        <span className="text-xs sm:text-sm text-muted-foreground">·</span>
        <Link
          href="/cookies"
          className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('cookies')}
        </Link>
      </div>
    </footer>
  );
};
