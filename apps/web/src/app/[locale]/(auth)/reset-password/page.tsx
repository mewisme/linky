import { TaskResetPassword } from '@clerk/nextjs'

export default function TaskResetPasswordPage() {

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <TaskResetPassword redirectUrlComplete="/user/security" />
    </div>
  )
}