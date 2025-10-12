import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Bereinigt Mermaid-Code und escaped Sonderzeichen in Node-Labels
 *
 * Best Practices gemäß Mermaid.js Dokumentation:
 * 1. Konvertiert escaped Newlines (\n) zu echten Zeilenumbrüchen
 * 2. Entfernt problematische Tabs und überflüssige Whitespaces
 * 3. Escaped Sonderzeichen in Node-Labels mit Quotes
 *
 * Problematische Syntax:
 * - A[Text (mit Klammern)] → A["Text (mit Klammern)"]
 * - B[Text: mit Doppelpunkt] → B["Text: mit Doppelpunkt"]
 * - C[Text, mit Komma] → C["Text, mit Komma"]
 * - "flowchart TD\n  Start" → "flowchart TD
 *   Start"
 *
 * @param code - Roher Mermaid-Code von OpenAI
 * @returns Gesäuberter Mermaid-Code
 */
export function sanitizeMermaidCode(code: string): string {
  // 1. Konvertiere \n String-Literale zu echten Zeilenumbrüchen
  // (OpenAI gibt oft \\n zurück, das in JSON als "\n" gespeichert wird)
  let sanitized = code.replace(/\\n/g, "\n");

  // 2. Konvertiere \t zu Spaces (Tabs können Parse-Probleme verursachen)
  sanitized = sanitized.replace(/\\t/g, "  ");

  // 3. Trim leading/trailing whitespace pro Zeile
  sanitized = sanitized
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  // 4. Escape Special Characters in Node-Labels
  // Regex Pattern: Findet Node-Definitionen wie A[Text] oder B(Text) oder C{Text}
  // und setzt Anführungszeichen, falls nicht vorhanden und Sonderzeichen enthalten
  const nodePatterns = [
    /(\w+)\[([^\]"]+)\]/g, // Eckige Klammern: A[Text]
    /(\w+)\(([^)"]+)\)/g, // Runde Klammern: A(Text)
    /(\w+)\{([^}"]+)\}/g, // Geschweifte Klammern: A{Text}
  ];

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
