import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-border bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-heading mb-3">lernfa.st</h3>
            <p className="text-sm text-foreground/70 max-w-md">
              Die modernste Lernplattform für Entwickler und Berufstätige.
              Komplexe Themen visuell und spielerisch meistern.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-heading text-sm mb-3">Produkt</h4>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>
                <Link href="/" className="hover:text-main transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-main transition-colors">
                  Preise
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-main transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading text-sm mb-3">Unternehmen</h4>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>
                <Link href="/" className="hover:text-main transition-colors">
                  Über uns
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-main transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-main transition-colors">
                  Kontakt
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t-2 border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-foreground/60">
            © {currentYear} lernfa.st. Alle Rechte vorbehalten.
          </p>

          <div className="flex gap-6 text-sm text-foreground/60">
            <Link href="/" className="hover:text-main transition-colors">
              Datenschutz
            </Link>
            <Link href="/" className="hover:text-main transition-colors">
              Impressum
            </Link>
            <Link href="/" className="hover:text-main transition-colors">
              AGB
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
