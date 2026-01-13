'use client'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import {
  IconBrandApple,
  IconBrandFacebook,
  IconBrandGoogle,
  IconCamera,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLoader2,
  IconPencil,
} from '@tabler/icons-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover'
import React, { useEffect, useState, useTransition } from 'react'

import { AppLayout } from '@/components/layouts/app-layout'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import { Separator } from '@repo/ui/components/ui/separator'
import toast from 'react-hot-toast'
import { useUser } from '@clerk/nextjs'

export default function UserProfilePage() {
  const { isLoaded, user } = useUser()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    if (!open || !user) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
  }, [open, user])

  if (!isLoaded || !user) return null

  const handleUpdateProfile = () => {
    startTransition(async () => {
      try {
        await user.update({ firstName, lastName })
        toast.success('Profile updated')
        setOpen(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    startTransition(async () => {
      try {
        await user.setProfileImage({ file })
        toast.success('Avatar updated')
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Upload failed')
      }
    })
  }

  return (
    <AppLayout
      label="User Profile"
      description="Manage your account settings"
    >
      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <Avatar className="size-32 border-2 border-muted shadow-sm">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback className="text-2xl font-bold">
                  {user.firstName?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-all"
              >
                <IconCamera className="size-6 mb-1" />
                <span className="text-[10px] font-bold">
                  CHANGE
                </span>
              </label>

              <input
                id="avatar-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div>
                <p className="text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>

              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                  >
                    <IconPencil className="size-4 mr-2" />
                    Update name
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-80 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      Update name
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Changes will be reflected immediately
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>First name</Label>
                      <Input
                        value={firstName}
                        onChange={(e) =>
                          setFirstName(e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Last name</Label>
                      <Input
                        value={lastName}
                        onChange={(e) =>
                          setLastName(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUpdateProfile}
                      disabled={isPending}
                    >
                      {isPending && (
                        <IconLoader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Save
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email Addresses</h3>
            <div className="grid gap-3">
              {user.emailAddresses.map((email) => (
                <div key={email.id} className="flex items-center justify-between p-4 border rounded-xl bg-card">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{email.emailAddress}</span>
                    {email.id === user.primaryEmailAddressId && <Badge variant="secondary">Primary</Badge>}
                    {email.verification.status === 'verified' ? (
                      <IconCircleCheckFilled className="size-4 text-green-500" />
                    ) : (
                      <IconCircleXFilled className="size-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Connected Accounts
              </h3>
            </div>

            <div className="grid gap-3">
              {user.externalAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-xl bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-full">
                      {account.provider === 'google' && (
                        <IconBrandGoogle className="size-5" />
                      )}
                      {account.provider === 'facebook' && (
                        <IconBrandFacebook className="size-5 text-[#1877F2]" />
                      )}
                      {account.provider === 'apple' && (
                        <IconBrandApple className="size-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold capitalize">
                          {account.provider}
                        </p>
                        {account.verification?.status !==
                          'verified' && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] h-4"
                            >
                              Unverified
                            </Badge>
                          )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {account.emailAddress}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {user.externalAccounts.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                  No social accounts connected.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
