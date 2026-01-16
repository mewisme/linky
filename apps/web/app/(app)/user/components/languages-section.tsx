'use client'

import { IconLanguage } from '@tabler/icons-react'
import { Badge } from '@repo/ui/components/ui/badge'
import type { UserDetails } from '@/stores/user-store'

interface LanguagesSectionProps {
  userDetails: UserDetails | null
}

export function LanguagesSection({ userDetails }: LanguagesSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <IconLanguage className="size-4" />
        <span>Languages</span>
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
        <p className="text-sm text-muted-foreground">No languages added</p>
      )}
    </div>
  )
}
