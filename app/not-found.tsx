import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GradientBackground } from "@/components/landing/gradient-background";
import { Espresso404 } from "@/components/not-found/espresso-404";
import { SimpleQuiz } from "@/components/not-found/simple-quiz";
import { getRandomFunFact } from "@/components/not-found/fun-facts";

export const metadata: Metadata = {
  title: "404 - Seite nicht gefunden | lernfa.st",
  description:
    "Diese Seite ist verschüttet! Aber keine Sorge - wir helfen dir dabei, sie wiederzufinden.",
};

/**
 * 404 Not Found Seite
 *
 * Humorvolle 404-Seite im Neobrutalism-Stil mit:
 * - Animierter umgefallener Espresso-Tasse
 * - Zufälligen Lern-Tipps/Fun Facts
 * - Interaktivem Quiz zum "Finden" der Seite
 * - Navigation zurück zur Homepage
 */
export default function NotFoundPage() {
  // Zufälligen Fun Fact bei jedem Seitenaufruf laden
  const randomFact = getRandomFunFact();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <GradientBackground />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-6">
            {/* Espresso Animation */}
            <div className="flex justify-center mb-8">
              <Espresso404 />
            </div>

            {/* Hauptüberschrift */}
            <h1 className="text-5xl md:text-6xl font-extrabold text-black leading-tight">
              Diese Seite ist verschüttet! ☕
            </h1>

            {/* Untertitel */}
            <p className="text-xl md:text-2xl font-medium text-gray-700 max-w-2xl mx-auto">
              Oder sie hat sich einfach verlaufen. Wer weiß das schon?
              <br />
              <span className="text-lg text-gray-600">
                Aber keine Sorge - wir helfen dir dabei, sie wiederzufinden!
              </span>
            </p>
          </div>

          {/* Fun Fact Card */}
          <Card className="bg-[#FB7DA8] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">{randomFact.emoji}</span>
              <div>
                <h3 className="text-lg font-extrabold text-black mb-2">
                  Fun Fact des Tages:
                </h3>
                <p className="text-base font-medium text-black leading-relaxed">
                  {randomFact.text}
                </p>
              </div>
            </div>
          </Card>

          {/* Quiz Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-black mb-2">
                Kannst du die Seite wiederfinden? 🕵️‍♂️
              </h2>
              <p className="text-lg font-medium text-gray-700">
                Beantworte ein paar Fragen und vielleicht finden wir sie wieder!
              </p>
            </div>

            <SimpleQuiz />
          </div>

          {/* Navigation Section */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button
              asChild
              className="bg-[#FFC667] text-black border-4 border-black hover:bg-[#e6b259] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] px-8 py-4 text-lg font-extrabold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-100"
            >
              <Link href="/">🏠 Zurück zur Homepage</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="bg-white text-black border-4 border-black hover:bg-gray-50 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] px-8 py-4 text-lg font-extrabold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-100"
            >
              <Link href="/dashboard">📚 Zum Dashboard</Link>
            </Button>
          </div>

          {/* Additional Help Section */}
          <Card className="bg-[#00D9BE] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-extrabold text-black">
                Immer noch nicht gefunden? 🤔
              </h3>
              <p className="text-lg font-medium text-black">
                Unser Espresso ist ein bisschen durcheinander. Versuche es mit:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <p className="font-extrabold text-black">
                    • Überprüfe die URL
                  </p>
                  <p className="font-medium text-black text-sm">
                    Vielleicht ist ein Tippfehler in der Adresse?
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-extrabold text-black">
                    • Gehe zur Startseite
                  </p>
                  <p className="font-medium text-black text-sm">
                    Von dort aus findest du alle verfügbaren Seiten.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-extrabold text-black">
                    • Nutze die Navigation
                  </p>
                  <p className="font-medium text-black text-sm">
                    Im Dashboard findest du deine Lerninhalte.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-extrabold text-black">• Kontaktiere uns</p>
                  <p className="font-medium text-black text-sm">
                    Unser Espresso hilft gerne weiter!
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Footer Message */}
          <div className="text-center pt-8">
            <p className="text-lg font-medium text-gray-600">
              ☕ <span className="font-extrabold">lernfa.st</span> - Lerne
              schneller mit unserem Espresso!
            </p>
            <p className="text-sm font-medium text-gray-500 mt-2">
              Diese Seite wurde mit ❤️ und viel Kaffee erstellt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
