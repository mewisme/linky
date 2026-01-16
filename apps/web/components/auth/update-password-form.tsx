'use client'

import * as React from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  HookFormZodPrimitive,
  ReactHookFormPrimitive,
  ZodPrimitive
} from '@repo/ui/components/ui/form'
import {
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconLock,
  IconShieldLock
} from '@tabler/icons-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@repo/ui/components/ui/input-group'

import { BorderBeam } from '@repo/ui/components/ui/border-beam'
import { Button } from '@repo/ui/components/ui/button'
import { cn } from '@repo/ui/lib/utils'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

// Use the same strong password logic as Sign Up for consistency
const passwordSchema = ZodPrimitive.z.object({
  password: ZodPrimitive.z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Must include lowercase")
    .regex(/[A-Z]/, "Must include uppercase")
    .regex(/[0-9]/, "Must include a number")
    .regex(/[^a-zA-Z0-9]/, "Must include a special character"),
  confirmPassword: ZodPrimitive.z.string()
}).refine((data: ZodPrimitive.z.infer<typeof passwordSchema>) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = ReactHookFormPrimitive.useForm<ZodPrimitive.z.infer<typeof passwordSchema>>({
    resolver: HookFormZodPrimitive.zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: ZodPrimitive.z.infer<typeof passwordSchema>) {
    setIsLoading(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) throw error

      toast.success('Password updated successfully')
      router.push('/user/profile')
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Card className="relative overflow-hidden border-muted/50 bg-background/50 backdrop-blur-xl shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconShieldLock size={28} />
          </div>
          <CardTitle className="text-2xl font-bold">Secure Your Account</CardTitle>
          <CardDescription>
            Enter your new password to regain full access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          type={showPassword ? 'text' : 'password'}
                          className="pl-10 pr-10"
                          placeholder="••••••••"
                          {...field}
                        />
                        <InputGroupAddon>
                          <IconLock className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        </InputGroupAddon>
                        <InputGroupButton variant="ghost" size="icon-xs" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                        </InputGroupButton>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          type={showPassword ? 'text' : 'password'}
                          className="pl-10"
                          placeholder="••••••••"
                          {...field}
                        />
                        <InputGroupAddon>
                          <IconLock className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        </InputGroupAddon>
                        <InputGroupButton variant="ghost" size="icon-xs" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                        </InputGroupButton>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                className="w-full transition-all active:scale-[0.98]"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Update Password <IconCheck className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <BorderBeam size={200} duration={8} colorFrom="#3b82f6" colorTo="#8b5cf6" />
      </Card>

      {/* Quick Security Tip */}
      <p className="px-8 text-center text-sm text-muted-foreground">
        Make sure your password is at least 8 characters long and includes a mix of numbers and symbols.
      </p>
    </div>
  )
}