'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <h2 className="text-2xl font-semibold text-destructive">Что-то пошло не так!</h2>
      <p className="max-w-xl text-muted-foreground">
        В приложении произошла непредвиденная ошибка. Вы можете попробовать перезагрузить страницу.
      </p>
      <div className="mt-6 space-y-4">
        <Button onClick={() => reset()}>Попробовать снова</Button>
        <div className="w-full max-w-2xl rounded-md bg-muted p-4 text-left">
            <h3 className="font-semibold">Детали ошибки:</h3>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-destructive">
                {error.message}
            </pre>
            {error.stack && (
                 <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {error.stack}
                </pre>
            )}
        </div>
      </div>
    </div>
  )
}
