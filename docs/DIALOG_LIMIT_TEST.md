# Dialog-Phase Limit - Test-Guide

## Feature: Maximal 5 User-Antworten in der Dialog-Phase

### Änderungen im Überblick

1. **Client Component:** `components/learning/dialog-phase.tsx`
   - ✅ Counter für User-Antworten (0-5)
   - ✅ Progress-Badge mit Farbcodierung
   - ✅ Progress-Bar mit dynamischer Breite
   - ✅ Warning bei letzter Frage
   - ✅ Input deaktiviert nach 5 Antworten
   - ✅ forceAssessment-Call bei 5. Antwort

2. **Server Actions:** `app/lesson/[id]/actions.tsx`
   - ✅ `continueDialog()` angepasst: neue Parameter `currentAnswerCount`, `maxAnswers`
   - ✅ System-Prompt verschärft mit strikten Regeln
   - ✅ `forceAssessment()` neu: automatisches Assessment nach 5 Fragen

3. **Dokumentation:** `INTERACTIVE-LEARNING.md`
   - ✅ V1.1 Dialog-Phase Limit dokumentiert

## Manueller Test-Workflow

### Schritt 1: Lesson starten
1. Navigation zu Homepage
2. Topic eingeben (z.B. "React Hooks")
3. Lesson-Typ wählen (Micro-Dose oder Deep-Dive)
4. "Starten" klicken → Dialog-Phase startet

### Schritt 2: Dialog-Phase testen
```
1. User antwortet auf Frage 1
   ✅ Counter zeigt: "1/5"
   ✅ Progress-Bar: ~20% gefüllt (Grün)
   
2. User antwortet auf Frage 2
   ✅ Counter zeigt: "2/5"
   ✅ Progress-Bar: ~40% gefüllt (Grün)
   
3. User antwortet auf Frage 3
   ✅ Counter zeigt: "3/5"
   ✅ Progress-Bar: ~60% gefüllt (Grün)
   
4. User antwortet auf Frage 4
   ✅ Counter zeigt: "4/5"
   ✅ Progress-Bar: ~80% gefüllt (Gelb)
   ✅ Warning angezeigt: "⚠️ Das ist deine letzte Frage!"
   
5. User antwortet auf Frage 5
   ✅ Counter zeigt: "5/5"
   ✅ Progress-Bar: 100% gefüllt (Orange)
   ✅ Message: "✅ Dialog abgeschlossen! Analysiere dein Wissen..."
   ✅ Input-Feld deaktiviert + Placeholder: "Dialog abgeschlossen ✓"
   ✅ forceAssessment wird aufgerufen
   ✅ Assessment-Ergebnis angezeigt:
      - Dein Level: [beginner/intermediate/advanced]
      - Konfidenz: [%]
      - Analyse: [Begründung]
      - "🚀 Los geht's mit deiner Lerngeschichte!"
   
6. Automatischer Übergang zur Story-Phase
   ✅ Phase ändert sich zu "story"
   ✅ Story-Kapitel werden geladen
```

## Browser-Konsole Debugging

### Useful Logs zum Prüfen:

```javascript
// In Dialog-Phase Component:
console.log("userAnswerCount:", userAnswerCount);
console.log("remainingAnswers:", remainingAnswers);

// In Server Actions:
console.log("continueDialog called with:", {
  currentAnswerCount, 
  maxAnswers,
  topic
});
console.log("forceAssessment triggered for conversation:", 
  conversationHistory
);
```

## Erwartetes Verhalten

### ✅ Sollte funktionieren:

- Dialog wird nach maximal 5 User-Antworten beendet
- Progress-Badge zeigt immer aktuelle Anzahl (X/5)
- Progress-Bar füllt sich schrittweise
- Farbcodierung ändert sich bei 3 und 1 verbleibenden Fragen
- Warning bei letzter Frage angezeigt
- Input deaktiviert nach 5 Antworten
- forceAssessment erstellt finales Assessment
- Phase ändert sich zu "story"

### ❌ Sollte NICHT funktionieren:

- 6+ Fragen nach der 5. User-Antwort
- KI fragt nach der 5. Antwort nochmal weiter
- User kann nach der 5. Antwort noch Input schreiben
- Dialog bleibt in "dialog" Phase stecken

## Regression-Test

Stelle sicher, dass folgende Szenarien noch funktionieren:

1. **Early Assessment:** User kann `assessKnowledge` Tool schon nach 3 Fragen verwenden
   - ✅ Sollte zu Story-Phase führen bevor 5 Fragen gestellt sind
   
2. **Error Handling:** API-Fehler werden korrekt verarbeitet
   - ✅ ErrorMessage angezeigt
   - ✅ Erneutes Versuchen möglich
   
3. **Story-Phase:** Nach Assessment wird Story korrekt geladen
   - ✅ Kapitel werden angezeigt
   - ✅ Visualisierungen rendern
   
4. **Quiz-Phase:** Nach Story wird Quiz korrekt geladen
   - ✅ Fragen werden angezeigt
   - ✅ Scoring funktioniert

## Performance Check

- **Dialog-Phase Dauer:** Sollte typisch 3-5 Minuten dauern (nicht unbegrenzt)
- **API-Kosten:** Max. 5-6 gpt-4o-mini API Calls pro User (vorhersehbar)
- **Netzwerk:** Sollte nicht mehrfach fehlschlagen bei stabiler Verbindung

## Commit-Nachricht

```
feat(dialog): limit dialog phase to max 5 user answers

- Add answer counter and MAX_DIALOG_ANSWERS constant
- Implement progress indicator with color coding
- Display warning on last question
- Disable input after 5 answers reached
- Create forceAssessment() for automatic end
- Tighten system prompt with strict 5-question rule
- Update UI with visual feedback (badge, progress bar)

Fixes: Dialog-Phase dauert zu lange und LLM verwickelt in langes Gespräch
Performance: Dialog endet garantiert nach max. 5 User-Antworten
