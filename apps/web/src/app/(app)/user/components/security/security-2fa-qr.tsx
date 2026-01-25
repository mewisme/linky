'use client'

import { Button } from '@repo/ui/components/ui/button'
import { IconKey } from '@tabler/icons-react'
import { QRCode } from '@repo/ui/components/kibo-ui/qr-code'

interface Security2FaQrProps {
  otpauthUri: string
  onSwitchToSecret: () => void
}

export function Security2FaQr({ otpauthUri, onSwitchToSecret }: Security2FaQrProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-3">
        <div className="aspect-square w-48 max-w-full sm:w-56">
          <QRCode data={otpauthUri} className="size-full" />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onSwitchToSecret}>
          <IconKey className="mr-2 size-4" />
          Show secret code
        </Button>
      </div>
    </div>
  )
}
