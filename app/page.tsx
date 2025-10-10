import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="text-6xl md:text-7xl font-heading mb-4">
          lernfa.st
        </h1>
        <p className="text-xl md:text-2xl text-foreground/70 mb-12">
          What do you want to learn today?
        </p>
        <div className="max-w-3xl mx-auto">
          <Input
            type="text"
            placeholder="Enter a topic..."
            className="h-14 text-lg shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
          />
        </div>
      </div>
    </main>
  );
}
