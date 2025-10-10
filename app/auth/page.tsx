"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { signIn, signUp } from "@/lib/auth-client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AuthPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Client-seitige Validierung
    if (!email || !password) {
      setError("Bitte fülle alle Felder aus.")
      setIsLoading(false)
      return
    }

    try {
      // Better-Auth signIn - alle Secrets bleiben serverseitig
      const result = await signIn.email({
        email,
        password,
      })

      if (result.error) {
        setError("Anmeldung fehlgeschlagen. Überprüfe deine Zugangsdaten.")
        setIsLoading(false)
        return
      }

      setSuccess("Anmeldung erfolgreich! Du wirst weitergeleitet...")

      // Prüfe ob ein Topic gespeichert wurde (von Landing Page)
      const pendingTopic = sessionStorage.getItem("pendingTopic")

      setTimeout(() => {
        if (pendingTopic) {
          // Lösche das gespeicherte Topic
          sessionStorage.removeItem("pendingTopic")
          // Redirect zurück zur Landing Page (die dann automatisch den KI-Flow startet)
          router.push(`/?topic=${encodeURIComponent(pendingTopic)}`)
        } else {
          // Normale Weiterleitung zur Startseite
          router.push("/")
        }
        router.refresh()
      }, 1000)
    } catch (err) {
      console.error("Login error:", err)
      setError("Ein unerwarteter Fehler ist aufgetreten.")
      setIsLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    // Client-seitige Validierung
    if (!email) {
      setError("Bitte gib deine E-Mail-Adresse ein.")
      setIsLoading(false)
      return
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.")
      setIsLoading(false)
      return
    }

    try {
      // Prüfe ob ein Topic gespeichert wurde (von Landing Page)
      const pendingTopic = sessionStorage.getItem("pendingTopic")
      const callbackURL = pendingTopic
        ? `/?topic=${encodeURIComponent(pendingTopic)}`
        : "/"

      const result = await signIn.magicLink({
        email,
        callbackURL,
      })

      if (result.error) {
        setError("Fehler beim Senden des Magic Links. Bitte versuche es erneut.")
        setIsLoading(false)
        return
      }

      setSuccess("Magic Link wurde gesendet! Prüfe deine E-Mails.")
      setIsLoading(false)
    } catch (err) {
      console.error("Magic Link error:", err)
      setError("Ein unerwarteter Fehler ist aufgetreten.")
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const passwordConfirm = formData.get("passwordConfirm") as string

    // Client-seitige Validierung
    if (!email || !password || !passwordConfirm) {
      setError("Bitte fülle alle Felder aus.")
      setIsLoading(false)
      return
    }

    if (password !== passwordConfirm) {
      setError("Die Passwörter stimmen nicht überein.")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.")
      setIsLoading(false)
      return
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.")
      setIsLoading(false)
      return
    }

    try {
      // Better-Auth signUp - DATABASE_URL wird nur serverseitig verwendet
      const result = await signUp.email({
        email,
        password,
        name: email.split("@")[0], // Optional: Name aus E-Mail ableiten
      })

      if (result.error) {
        setError(result.error.message || "Registrierung fehlgeschlagen. Möglicherweise existiert das Konto bereits.")
        setIsLoading(false)
        return
      }

      setSuccess("Registrierung erfolgreich! Du wirst eingeloggt...")

      // Prüfe ob ein Topic gespeichert wurde (von Landing Page)
      const pendingTopic = sessionStorage.getItem("pendingTopic")

      setTimeout(() => {
        if (pendingTopic) {
          // Lösche das gespeicherte Topic
          sessionStorage.removeItem("pendingTopic")
          // Redirect zurück zur Landing Page (die dann automatisch den KI-Flow startet)
          router.push(`/?topic=${encodeURIComponent(pendingTopic)}`)
        } else {
          // Normale Weiterleitung zur Startseite
          router.push("/")
        }
        router.refresh()
      }, 1000)
    } catch (err) {
      console.error("Registration error:", err)
      setError("Ein unerwarteter Fehler ist aufgetreten.")
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-4xl md:text-5xl font-heading mb-2 hover:translate-x-1 hover:translate-y-1 transition-transform inline-block">
              lernfa.st
            </h1>
          </Link>
          <p className="text-foreground/70">Willkommen zurück!</p>
        </div>

        {/* Fehler- und Erfolgs-Meldungen */}
        {error && (
          <div className="mb-4 p-4 border-2 border-red-500 bg-red-50 rounded-base">
            <p className="text-sm text-red-700 font-base">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 border-2 border-green-500 bg-green-50 rounded-base">
            <p className="text-sm text-green-700 font-base">{success}</p>
          </div>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Passwort</TabsTrigger>
            <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
            <TabsTrigger value="register">Registrieren</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Anmelden</CardTitle>
                <CardDescription>
                  Melde dich mit deiner E-Mail und deinem Passwort an.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-heading">
                      E-Mail
                    </label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="deine@email.de"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-heading">
                      Passwort
                    </label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? "Wird angemeldet..." : "Anmelden"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-foreground/70 hover:text-foreground underline"
                      disabled={isLoading}
                    >
                      Passwort vergessen?
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="magic-link">
            <Card>
              <CardHeader>
                <CardTitle>Magic Link</CardTitle>
                <CardDescription>
                  Wir senden dir einen Link zum Anmelden per E-Mail.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="magic-link-email" className="text-sm font-heading">
                      E-Mail
                    </label>
                    <Input
                      id="magic-link-email"
                      name="email"
                      type="email"
                      placeholder="deine@email.de"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? "Wird gesendet..." : "Magic Link senden"}
                  </Button>
                  <p className="text-xs text-center text-foreground/60">
                    Der Link ist 15 Minuten gültig und kann nur einmal verwendet werden.
                  </p>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Konto erstellen</CardTitle>
                <CardDescription>
                  Erstelle ein kostenloses Konto, um loszulegen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="register-email" className="text-sm font-heading">
                      E-Mail
                    </label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="deine@email.de"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-password" className="text-sm font-heading">
                      Passwort
                    </label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="register-password-confirm" className="text-sm font-heading">
                      Passwort bestätigen
                    </label>
                    <Input
                      id="register-password-confirm"
                      name="passwordConfirm"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      minLength={8}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? "Wird registriert..." : "Registrieren"}
                  </Button>
                  <p className="text-xs text-center text-foreground/60">
                    Mit der Registrierung stimmst du unseren{" "}
                    <button type="button" className="underline hover:text-foreground">
                      Nutzungsbedingungen
                    </button>{" "}
                    zu.
                  </p>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
