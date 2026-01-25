'use client'

import { IconCopy, IconQrcode } from '@tabler/icons-react'

import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'

interface Security2FaSecretProps {
  secret: string
  onSwitchToQr: () => void
}

export function Security2FaSecret({ secret, onSwitchToQr }: Security2FaSecretProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      toast.success('Secret copied to clipboard')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enter this code manually into your authenticator app if it does not support QR codes.
      </p>
      <div className="flex flex-col gap-2">
        <code
          className="break-all rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs"
          style={{ wordBreak: 'break-all' }}
        >
          {secret}
        </code>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            <IconCopy className="mr-2 size-4" />
            Copy
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onSwitchToQr}>
            <IconQrcode className="mr-2 size-4" />
            Show QR code
          </Button>
        </div>
      </div>
    </div>
  )
}
