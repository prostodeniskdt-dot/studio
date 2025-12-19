'use client' // Error components must be Client Components

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { AlertCircle, Home, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    logger.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-background via-background to-destructive/5 p-4 text-center">
      <div className="space-y-4 animate-fade-in">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight gradient-text">Что-то пошло не так!</h1>
          <p className="max-w-xl text-muted-foreground text-lg">
            В приложении произошла непредвиденная ошибка. Вы можете попробовать перезагрузить страницу или вернуться на главную.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-8">
          <Button onClick={() => reset()} size="lg" className="min-w-[200px]">
            <RefreshCw className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
          <Button 
            onClick={() => router.push('/dashboard')} 
            variant="outline" 
            size="lg"
            className="min-w-[200px]"
          >
            <Home className="mr-2 h-4 w-4" />
            Вернуться на главную
          </Button>
        </div>

        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen} className="mt-8 max-w-2xl mx-auto">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full">
              {isDetailsOpen ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Скрыть детали ошибки
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Показать детали ошибки
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-4 border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-left flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Детали ошибки
                </CardTitle>
              </CardHeader>
              <CardContent className="text-left space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Сообщение об ошибке</AlertTitle>
                  <AlertDescription>
                    <pre className="mt-2 whitespace-pre-wrap text-sm">
                      {error.message}
                    </pre>
                  </AlertDescription>
                </Alert>
                
                {error.digest && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Digest:</h4>
                    <code className="block p-2 rounded bg-muted text-xs break-all">
                      {error.digest}
                    </code>
                  </div>
                )}

                {error.stack && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Stack trace:</h4>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground p-3 rounded bg-muted/50 overflow-auto max-h-64">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
