interface ErrorPageProps {
  error: Error | string
}

export default async function ErrorPage({ error }: ErrorPageProps) {
  if (typeof error === 'string') {
    throw new Error(error)
  }
  throw error
}