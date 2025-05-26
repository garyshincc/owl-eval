'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function CLIAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginCode = searchParams.get('code');
  const user = useUser();
  
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [error, setError] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (!loginCode) {
      setStatus('error');
      setError('No authentication code provided');
      return;
    }

    // Check if user is authenticated
    if (user === undefined) {
      // Still loading
      return;
    }

    if (!user) {
      // Not authenticated, redirect to sign in
      router.push(`/handler/sign-in?redirect=/cli-auth?code=${loginCode}`);
      return;
    }

    // User is authenticated, complete the CLI auth
    // Prevent double execution
    if (!isAuthenticating && status === 'pending') {
      setIsAuthenticating(true);
      completeAuthentication();
    }
  }, [loginCode, user, router, isAuthenticating, status]);

  const completeAuthentication = async () => {
    try {
      // Add a small delay to ensure the login code is still valid
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Complete CLI authentication on the server side
      const response = await fetch('/api/cli-auth/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete authentication');
      }

      setStatus('success');
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        window.close();
      }, 3000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>CLI Authentication</CardTitle>
          <CardDescription>
            Authenticating your CLI session...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'pending' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Completing authentication...
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div className="text-center">
                <p className="font-semibold">Authentication successful!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You can now return to your terminal.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  This window will close automatically...
                </p>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="text-center">
                <p className="font-semibold">Authentication failed</p>
                <p className="text-sm text-red-600 mt-2">{error}</p>
              </div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}