import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Bereinigt Mermaid-Code und escaped Sonderzeichen in Node-Labels
 *
 * Problematische Syntax:
 * - A[Text (mit Klammern)] → A["Text (mit Klammern)"]
 * - B[Text: mit Doppelpunkt] → B["Text: mit Doppelpunkt"]
 * - C[Text, mit Komma] → C["Text, mit Komma"]
 *
 * @param code - Roher Mermaid-Code von OpenAI
 * @returns Gesäuberter Mermaid-Code
 */
export function sanitizeMermaidCode(code: string): string {
  // Regex Pattern: Findet Node-Definitionen wie A[Text] oder B(Text) oder C{Text}
  // und setzt Anführungszeichen, falls nicht vorhanden und Sonderzeichen enthalten

  const nodePatterns = [
    /(\w+)\[([^\]"]+)\]/g, // Eckige Klammern: A[Text]
    /(\w+)\(([^)"]+)\)/g, // Runde Klammern: A(Text)
    /(\w+)\{([^}"]+)\}/g, // Geschweifte Klammern: A{Text}
  ];

  let sanitized = code;

  for (const pattern of nodePatterns) {
    sanitized = sanitized.replace(pattern, (match, nodeId, label) => {
      // Prüfe ob Label Sonderzeichen enthält
      const hasSpecialChars = /[():\-,;!?]/.test(label);

      // Falls Sonderzeichen vorhanden und keine Anführungszeichen: hinzufügen
      if (hasSpecialChars && !label.trim().startsWith('"')) {
        const bracket = match.includes("[")
          ? "["
          : match.includes("(")
          ? "("
          : "{";
        const closeBracket =
          bracket === "[" ? "]" : bracket === "(" ? ")" : "}";
        return `${nodeId}${bracket}"${label.trim()}"${closeBracket}`;
      }

      return match;
    });
  }

  return sanitized;
}
