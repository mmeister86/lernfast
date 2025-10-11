import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: "⚡",
    title: "KI-generierte Lernkarten",
    description:
      "Komplexe Themen werden automatisch in leicht verdauliche Flashcards transformiert.",
  },
  {
    icon: "🎨",
    title: "Visuelle Mindmaps",
    description:
      "Jede Karte enthält interaktive Graphen für besseres Verständnis und Merkfähigkeit.",
  },
  {
    icon: "🎯",
    title: "Micro-Dose Learning",
    description:
      "Lerne effektiv in kleinen Häppchen - perfekt für schnelle Einarbeitung.",
  },
  {
    icon: "🚀",
    title: "Deep Dive Modus",
    description:
      "Für Premium-Nutzer: Ausführliche 10-15 Karten für tiefgreifendes Verständnis.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading mb-4">
            Warum lernfa.st?
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Die modernste Lernplattform für Entwickler und Berufstätige, die
            schnell neue Themen meistern wollen.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, index) => (
            <Card
              key={index}
              className="hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
            >
              <CardHeader>
                <div className="text-5xl mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/70">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="inline-block p-8 border-2 border-border rounded-base shadow-shadow bg-main/10">
            <h3 className="text-2xl font-heading mb-2">
              Bereit loszulegen? 🎓
            </h3>
            <p className="text-foreground/70">
              Erstelle deine erste Lesson kostenlos - keine Kreditkarte nötig!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
