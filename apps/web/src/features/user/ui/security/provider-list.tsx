'use client'

import * as Sentry from '@sentry/nextjs'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ws/ui/components/ui/alert-dialog"
import {
  useUser,
} from '@clerk/nextjs'
import {
  IconBrandDiscord,
  IconBrandFacebook,
  IconBrandGoogle,
  IconX,
} from '@tabler/icons-react'
import { useReverification } from '@clerk/nextjs'

import { cn } from '@ws/ui/lib/utils'
import { toast } from '@ws/ui/components/ui/sonner'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useState } from 'react'

const providers = ['google', 'facebook', 'discord'] as const
type BaseProvider = (typeof providers)[number]
type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>
type ExternalAccountResource = ClerkUser['externalAccounts'][number]
type CreateExternalAccountParams = Parameters<ClerkUser['createExternalAccount']>[0]
type OAuthStrategy = CreateExternalAccountParams['strategy']

function ProviderIcon({ provider }: { provider: BaseProvider }) {
  if (provider === 'google') return <IconBrandGoogle className="size-4" />
  if (provider === 'facebook') return <IconBrandFacebook className="size-4" />
  if (provider === 'discord') return <IconBrandDiscord className="size-4" />
  return null
}

interface ProviderListProps {
  userProviders: ExternalAccountResource[]
}

function providerDisplayName(
  provider: BaseProvider,
  ts: (key: 'providerGoogle' | 'providerFacebook' | 'providerDiscord') => string,
): string {
  if (provider === 'google') return ts('providerGoogle')
  if (provider === 'facebook') return ts('providerFacebook')
  return ts('providerDiscord')
}

export function ProviderList({ userProviders }: ProviderListProps) {
  const t = useTranslations('user')
  const ts = useTranslations('user.securitySessions')
  const router = useRouter()
  const { user } = useUser()
  const [hovered, setHovered] = useState<string | null>(null)
  const [destroyDialogOpen, setDestroyDialogOpen] = useState(false)
  const [pendingAccount, setPendingAccount] =
    useState<ExternalAccountResource | null>(null)

  const createExternalAccount = useReverification(
    (params: CreateExternalAccountParams) =>
      user?.createExternalAccount(params),
  )

  const accountDestroy = useReverification(
    (account: ExternalAccountResource) => account.destroy(),
  )

  const addSSO = async (provider: BaseProvider) => {
    const strategy = `oauth_${provider}` as OAuthStrategy

    try {
      const res = await createExternalAccount({
        strategy,
        redirectUrl: '/user/security',
      })

      const redirectUrl =
        res?.verification?.externalVerificationRedirectURL?.href

      if (redirectUrl) {
        router.push(redirectUrl)
      }

      toast.success(t('oauthRedirected'))
    } catch (err) {
      toast.error(t('oauthConnectFailed'))
      Sentry.captureException(err, {
        tags: { provider: strategy },
      })
    }
  }

  const mergedProviders = providers
    .map((provider) => {
      const external = userProviders.find(
        (acc) => acc.provider === provider,
      )

      const linked = Boolean(external?.providerUserId)

      return {
        id: linked ? external!.id : `missing_${provider}`,
        provider,
        linked,
        external,
      }
    })
    .sort((a, b) => Number(b.linked) - Number(a.linked))

  const confirmDestroy = async () => {
    if (!pendingAccount) return
    try {
      await accountDestroy(pendingAccount)
      toast.success(t('signInDisconnected'))
      setDestroyDialogOpen(false)
      setPendingAccount(null)
    } catch (err) {
      toast.error(t('disconnectFailed'))
      Sentry.captureException(err)
    }
  }

  return (
    <>
      <AlertDialog
        open={destroyDialogOpen}
        onOpenChange={(open) => {
          setDestroyDialogOpen(open)
          if (!open) setPendingAccount(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ts('disconnectTitle')}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {ts('disconnectDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              {ts('keepConnected')}
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={confirmDestroy}
            >
              {ts('yesDisconnect')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex flex-wrap gap-2">
        {mergedProviders.map((item) => (
          <span
            key={item.id}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
              item.linked && 'cursor-pointer',
              !item.linked && 'cursor-pointer',
            )}
            onClick={() => {
              if (item.linked && item.external) {
                setPendingAccount(item.external)
                setDestroyDialogOpen(true)
              } else {
                addSSO(item.provider)
              }
            }}
          >
            {item.linked && hovered === item.id ? (
              <IconX className="size-4 text-destructive" />
            ) : (
              <ProviderIcon provider={item.provider} />
            )}

            {item.linked
              ? providerDisplayName(item.provider, ts)
              : ts('connectProvider', {
                  provider: providerDisplayName(item.provider, ts),
                })}
          </span>
        ))}
      </div>
    </>
  )
}