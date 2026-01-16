'use client'

import * as React from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import {
  IconChevronLeft,
  IconCircleCheck,
  IconLoader2,
  IconMail,
  IconSend,
} from '@tabler/icons-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@repo/ui/components/ui/input-group'

import { BorderBeam } from '@repo/ui/components/ui/border-beam'
import { Button } from '@repo/ui/components/ui/button'
import { Label } from '@repo/ui/components/ui/label'
import Link from 'next/link'
import { Separator } from '@repo/ui/components/ui/separator'
import { cn } from '@repo/ui/lib/utils'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useState } from 'react'

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')

  async function handleResetPassword() {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error

      setSuccess(true)
      toast.success('Reset link sent to your email')
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <Card className="relative w-full overflow-hidden border-muted/50 bg-background/50 backdrop-blur-xl shadow-xl">
        {success ? (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <IconCircleCheck size={32} />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight">
                Check your email
              </CardTitle>
              <CardDescription>
                We have sent password reset instructions to your email address.
              </CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
            </CardContent>

            <CardFooter className="w-full">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSuccess(false)}
              >
                Try another email
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-3xl font-bold tracking-tight">
                Forgot password?
              </CardTitle>
              <CardDescription>
                Enter your email and we&apos;ll send you a link to reset your
                password.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="space-y-4">
                <Label>Email Address</Label>

                <InputGroup>
                  <InputGroupInput
                    className="transition-all duration-200"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <InputGroupAddon>
                    <IconMail className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  </InputGroupAddon>
                </InputGroup>

                <Button
                  className="w-full transition-all active:scale-[0.98]"
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Send Reset Link
                      <IconSend className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex w-full flex-col gap-4 pt-6">
              <Separator className="w-full opacity-50" />

              <div className="w-full text-center text-sm">
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <IconChevronLeft className="mr-1 h-4 w-4" />
                  Back to Sign in
                </Link>
              </div>
            </CardFooter>
          </>
        )}

        <BorderBeam size={100} duration={4} delay={10} />
      </Card>
    </div>
  )
}
