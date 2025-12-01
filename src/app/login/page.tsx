'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '@/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    async function handleLogin(formData: FormData) {
        startTransition(async () => {
            const result = await login(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Logged in successfully')
            }
        })
    }

    async function handleSignup(formData: FormData) {
        startTransition(async () => {
            const result = await signup(formData)
            if (result?.error) {
                toast.error(result.error)
            } else if (result?.success) {
                toast.success(result.message)
            }
        })
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                        Welcome back
                    </CardTitle>
                    <CardDescription>
                        Sign in to your account to continue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="signup">Sign Up</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form action={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            required
                                            className="pl-9"
                                            suppressHydrationWarning
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            className="pl-9"
                                            suppressHydrationWarning
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form action={handleSignup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="signup-email"
                                            name="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            required
                                            className="pl-9"
                                            suppressHydrationWarning
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="signup-password"
                                            name="password"
                                            type="password"
                                            required
                                            className="pl-9"
                                            suppressHydrationWarning
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        'Create Account'
                                    )}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-xs text-slate-500 text-center px-4">
                        By clicking continue, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
