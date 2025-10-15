/**
 * Fun Facts für die 404-Seite
 * 
 * Sammlung von humorvollen und lehrreichen Fakten rund um
 * HTTP-Codes, Web-Entwicklung und Hamster-Referenzen.
 */

export interface FunFact {
  id: string;
  category: "http" | "learning" | "humor" | "tech";
  text: string;
  emoji: string;
}

export const funFacts: FunFact[] = [
  // HTTP & Web Facts
  {
    id: "http-418",
    category: "http",
    text: "418 I'm a teapot ist ein echter HTTP-Statuscode! Er wurde als Aprilscherz für Teekannen-Webserver erfunden.",
    emoji: "🫖"
  },
  {
    id: "http-codes-count",
    category: "http",
    text: "Es gibt über 70 verschiedene HTTP-Statuscodes - von 100 (Continue) bis 511 (Network Authentication Required).",
    emoji: "📊"
  },
  {
    id: "404-origin",
    category: "http",
    text: "Der 404-Fehler kommt von Raum 404 im CERN, wo ursprünglich die Web-Server standen. Der Raum existiert nicht mehr!",
    emoji: "🏢"
  },
  {
    id: "first-404",
    category: "humor",
    text: "Die erste 404-Seite wurde 1993 von Tim Berners-Lee selbst erstellt. Sie war sehr langweilig - zum Glück haben wir Hamster!",
    emoji: "🐹"
  },

  // Learning Facts
  {
    id: "hamster-learning",
    category: "learning",
    text: "Wusstest du? Unser Hamster lernt 47 neue Fakten pro Minute und vergisst nie etwas - außer wo er seine Nüsse versteckt hat.",
    emoji: "🧠"
  },
  {
    id: "learning-method",
    category: "learning",
    text: "Die beste Lernmethode? Spaced Repetition! Wiederhole Lernstoff in immer größeren Abständen - genau wie unser Hamster seine Nüsse sammelt.",
    emoji: "🔄"
  },
  {
    id: "microlearning",
    category: "learning",
    text: "Micro-Learning ist 17% effektiver als lange Lerneinheiten. Deshalb liebt unser Hamster die 'Micro-Dose' Flashcards!",
    emoji: "⚡"
  },
  {
    id: "visual-learning",
    category: "learning",
    text: "65% der Menschen sind visuelle Lerner. Unser Hamster ist 100% visuell - er liebt bunte Graphen und Mindmaps!",
    emoji: "👁️"
  },

  // Humor Facts
  {
    id: "page-world-trip",
    category: "humor",
    text: "Diese Seite ist auf Weltreise gegangen. Ohne GPS. Und ohne Rückfahrkarte. Wir schicken einen Hamster zur Suche!",
    emoji: "🌍"
  },
  {
    id: "hamster-server",
    category: "humor",
    text: "Unser Server läuft auf Hamsterkraft! 12 Hamster im Laufrad = 1 Gigabyte pro Sekunde. Sie sind gerade in der Pause.",
    emoji: "🏃‍♂️"
  },
  {
    id: "missing-page",
    category: "humor",
    text: "Die Seite wurde von unserem Hamster gefressen. Er dachte, es wäre eine Nuss. Wir arbeiten an einem Anti-Nuss-Algorithmus.",
    emoji: "🥜"
  },
  {
    id: "404-quiz",
    category: "humor",
    text: "404-Seiten sind wie Hamster: Man findet sie überall, aber nie dort, wo man sie erwartet. Quiz-Zeit!",
    emoji: "🎯"
  },

  // Tech Facts
  {
    id: "internet-invention",
    category: "tech",
    text: "Das Internet wurde 1989 von Tim Berners-Lee erfunden. Unser Hamster war damals noch ein Baby und konnte noch nicht programmieren.",
    emoji: "🌐"
  },
  {
    id: "first-website",
    category: "tech",
    text: "Die erste Website der Welt (info.cern.ch) existiert noch heute! Sie ist 33 Jahre alt und funktioniert besser als manche moderne Seiten.",
    emoji: "🏛️"
  },
  {
    id: "web-speed",
    category: "tech",
    text: "Die erste Webseite lud in 0,3 Sekunden. Heute brauchen manche Seiten 15 Sekunden. Unser Hamster ist schneller!",
    emoji: "⚡"
  },
  {
    id: "hamster-memory",
    category: "tech",
    text: "Unser Hamster hat ein Gedächtnis wie ein Computer: Er vergisst nie eine gelernte Flashcard, aber manchmal wo er seine Nüsse versteckt hat.",
    emoji: "💾"
  }
];

/**
 * Gibt einen zufälligen Fun Fact zurück
 */
export function getRandomFunFact(): FunFact {
  const randomIndex = Math.floor(Math.random() * funFacts.length);
  return funFacts[randomIndex];
}

/**
 * Gibt Fun Facts nach Kategorie gefiltert zurück
 */
export function getFunFactsByCategory(category: FunFact['category']): FunFact[] {
  return funFacts.filter(fact => fact.category === category);
}

/**
 * Gibt eine zufällige Anzahl von Fun Facts zurück (für Quiz-Fragen)
 */
export function getRandomFunFacts(count: number = 3): FunFact[] {
  const shuffled = [...funFacts].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, funFacts.length));
}
