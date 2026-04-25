'use client'

import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ws/ui/components/ui/select'
import { Label } from '@ws/ui/components/ui/label'

type Props = {
  disabled: boolean
  variant: 'sidebar' | 'floating'
  collapsible: 'offcanvas' | 'icon'
  onVariantChange: (value: 'sidebar' | 'floating') => void
  onCollapsibleChange: (value: 'offcanvas' | 'icon') => void
}

export function SidebarSettings({
  disabled,
  variant,
  collapsible,
  onVariantChange,
  onCollapsibleChange,
}: Props) {
  const t = useTranslations('settings')

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t('appearancePage.sidebarSection')}
      </h3>
      <div className="grid gap-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Label htmlFor="sidebar-variant" className="flex items-center gap-2">
              {t('appearancePage.sidebarVariant')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('appearancePage.sidebarVariantHint')}
            </p>
          </div>
          <Select value={variant} onValueChange={(v) => onVariantChange(v === 'floating' ? 'floating' : 'sidebar')} disabled={disabled}>
            <SelectTrigger id="sidebar-variant">
              <SelectValue>
                {variant === 'floating'
                  ? t('appearancePage.sidebarVariantFloating')
                  : t('appearancePage.sidebarVariantSidebar')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sidebar">{t('appearancePage.sidebarVariantSidebar')}</SelectItem>
              <SelectItem value="floating">{t('appearancePage.sidebarVariantFloating')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between">
          <div className="space-y-2">
            <Label htmlFor="sidebar-collapsible" className="flex items-center gap-2">
              {t('appearancePage.sidebarCollapsible')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('appearancePage.sidebarCollapsibleHint')}
            </p>
          </div>
          <Select value={collapsible} onValueChange={(c) => onCollapsibleChange(c === 'icon' ? 'icon' : 'offcanvas')} disabled={disabled}>
            <SelectTrigger id="sidebar-collapsible">
              <SelectValue className="capitalize">
                {collapsible === 'icon'
                  ? t('appearancePage.sidebarCollapsibleIcon')
                  : t('appearancePage.sidebarCollapsibleOffcanvas')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="offcanvas">{t('appearancePage.sidebarCollapsibleOffcanvas')}</SelectItem>
              <SelectItem value="icon">{t('appearancePage.sidebarCollapsibleIcon')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
