'use client'

import {
  IconBrandApple,
  IconBrandDiscord,
  IconBrandFacebook,
  IconBrandGithub,
  IconBrandGoogle,
  IconBrandLinkedin,
} from '@tabler/icons-react'

import { formatProvider } from './security-utils'

function ProviderIcon({ provider }: { provider: string }) {
  const p = provider.toLowerCase().replace(/^oauth_/, '')
  if (p === 'google') return <IconBrandGoogle className="size-4" />
  if (p === 'facebook') return <IconBrandFacebook className="size-4" />
  if (p === 'discord') return <IconBrandDiscord className="size-4" />
  if (p === 'github') return <IconBrandGithub className="size-4" />
  if (p === 'linkedin') return <IconBrandLinkedin className="size-4" />
  if (p === 'apple') return <IconBrandApple className="size-4" />
  return null
}

interface ProviderListProps {
  providers: { id: string; provider: string }[]
}

export function ProviderList({ providers }: ProviderListProps) {
  if (providers.length === 0) {
    return <span className="text-sm text-muted-foreground">None</span>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((a) => (
        <span
          key={a.id}
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
        >
          <ProviderIcon provider={a.provider} />
          {formatProvider(a.provider)}
        </span>
      ))}
    </div>
  )
}
