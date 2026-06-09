'use client'

import { Badge } from '@ws/ui/components/ui/badge'
import { IconLanguage } from '@tabler/icons-react'
import type { UserDetails } from '@/entities/user/model/user-store'
import { useTranslations } from 'next-intl'

interface LanguagesSectionProps {
  userDetails: UserDetails | null
}

export function LanguagesSection({ userDetails }: LanguagesSectionProps) {
  const tp = useTranslations('user.profile')
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <IconLanguage className="size-4" />
        <span>{tp('languages')}</span>
      </div>
      {userDetails?.languages && userDetails.languages.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {userDetails.languages.map((language, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-3 py-1.5 text-sm"
            >
              {language}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{tp('noLanguages')}</p>
      )}
    </div>
  )
}
