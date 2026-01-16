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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  HookFormZodPrimitive,
  ReactHookFormPrimitive,
  ZodPrimitive,
} from '@repo/ui/components/ui/form'
import {
  IconBrandDiscord,
  IconBrandGithub,
  IconBrandGoogle,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconLock,
  IconMail
} from '@tabler/icons-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@repo/ui/components/ui/input-group'

import { BorderBeam } from '@repo/ui/components/ui/border-beam'
import { Button } from '@repo/ui/components/ui/button'
import Link from 'next/link'
import { Separator } from '@repo/ui/components/ui/separator'
import { cn } from '@repo/ui/lib/utils'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const strongPasswordSchema = ZodPrimitive.z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Lowercase letter required")
  .regex(/[A-Z]/, "Uppercase letter required")
  .regex(/[0-9]/, "Number required")
  .regex(/[^a-zA-Z0-9]/, "Special character required");

const formSchema = ZodPrimitive.z.object({
  email: ZodPrimitive.z.email('Invalid email address'),
  password: strongPasswordSchema,
  repeatPassword: ZodPrimitive.z.string()
}).refine(data => data.password === data.repeatPassword, {
  message: "Passwords do not match",
  path: ["repeatPassword"],
});

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)

  const form = ReactHookFormPrimitive.useForm<ZodPrimitive.z.infer<typeof formSchema>>({
    resolver: HookFormZodPrimitive.zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      repeatPassword: '',
    },
  })

  function handleSignUpOauth(provider: 'github' | 'google' | 'discord') {
    const supabase = createClient()
    return supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/auth/oauth?next=/`
      }
    })
  }

  async function onSubmit(values: ZodPrimitive.z.infer<typeof formSchema>) {
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/sign-up-success`
        }
      })
      if (error) throw error
      toast.success('Account created! Please check your email.')
      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Something went wrong')
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Card className="relative overflow-hidden border-muted/50 bg-background/50 backdrop-blur-xl shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-row gap-4">
            <Button variant="outline" className="flex-1 flex justify-center md:justify-start" onClick={() => handleSignUpOauth('github')}>
              <IconBrandGithub className="h-5 w-5 md:mr-2 text-gray-500" />
              <span className="hidden md:inline">Github</span>
            </Button>

            <Button variant="outline" className="flex-1 flex justify-center md:justify-start" onClick={() => handleSignUpOauth('google')}>
              <IconBrandGoogle className="h-5 w-5 text-red-500 md:mr-2 " />
              <span className="hidden md:inline">Google</span>
            </Button>

            <Button variant="outline" className="flex-1 flex justify-center md:justify-start" onClick={() => handleSignUpOauth('discord')}>
              <IconBrandDiscord className="h-5 w-5 md:mr-2 text-blue-500" />
              <span className="hidden md:inline">Discord</span>
            </Button>
          </div>


          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput className="transition-all duration-200" placeholder="name@example.com" {...field} />
                        <InputGroupAddon>
                          <IconMail className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        </InputGroupAddon>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput type={showPassword ? 'text' : 'password'} className="transition-all duration-200" placeholder="••••••••" {...field} />
                        <InputGroupButton variant="ghost" size="icon-xs" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                        </InputGroupButton>
                        <InputGroupAddon>
                          <IconLock className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        </InputGroupAddon>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="repeatPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput type={showPassword ? 'text' : 'password'} className="transition-all duration-200" placeholder="••••••••" {...field} />
                        <InputGroupButton className="rounded-full" size="icon-xs" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                        </InputGroupButton>
                        <InputGroupAddon>
                          <IconLock className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        </InputGroupAddon>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button className="w-full h-11 transition-all active:scale-[0.98]" type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Get Started <IconChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4  pt-6">
          <p className="text-center text-xs text-muted-foreground px-6 leading-relaxed">
            By clicking Get Started, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-primary">Terms of Service</Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">Privacy Policy</Link>.
          </p>
          <Separator className="opacity-50" />
          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </div>
        </CardFooter>
        <BorderBeam size={250} duration={12} delay={9} />
      </Card>
    </div>
  )
}