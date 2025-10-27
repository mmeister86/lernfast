"use client";

/**
 * Profile Form Component - Neobrutalismus Design
 * Client Component für Form-Interaktivität
 *
 * Erhält initiale Daten vom Server Component (app/dashboard/profile/page.tsx)
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import {
  AVATAR_LABELS,
  AVATAR_PREFERENCES,
  DIALOG_MODE_LABELS,
  DIALOG_MODES,
  DIFFICULTY_LEVEL_LABELS,
  DIFFICULTY_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
  LANGUAGE_LABELS,
  LANGUAGES,
  TTS_VOICES,
  TTS_VOICE_LABELS,
  profileUpdateSchema,
  type AvatarPreference,
  type DialogMode,
  type ProfileUpdatePayload,
  type TTSVoice,
} from "@/lib/profile.types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AvatarEditorDialog } from "@/components/avatar-editor/avatar-editor-dialog";
import { UserAvatar } from "@/components/avatar/user-avatar";
import { generateAvatarDataUri } from "@/lib/avatar.types";
import type { AvatarConfig } from "@/lib/avatar.types";

type ProfileFormProps = {
  initialData: {
    name?: string;
    email: string;
    age?: number;
    language?: string;
    learningGoals?: string;
    experienceLevel?: string;
    preferredDifficulty?: string;
    preferredCardCount?: number;
    ttsVoice?: string;
    avatarPreference?: string;
    dialogMode?: string;
    customAvatarConfig?: AvatarConfig;
  };
  userId: string;
};

export function ProfileForm({ initialData, userId }: ProfileFormProps) {
  const router = useRouter();

  // Form State (initialisiert mit Server-Daten)
  const [formData, setFormData] = useState<ProfileUpdatePayload>({
    name: initialData.name || "",
    age: initialData.age || undefined,
    language: (initialData.language as any) || "de",
    learningGoals: initialData.learningGoals || undefined,
    experienceLevel: (initialData.experienceLevel as any) || "beginner",
    preferredDifficulty: (initialData.preferredDifficulty as any) || "medium",
    preferredCardCount: initialData.preferredCardCount || 5,
    ttsVoice: (initialData.ttsVoice as TTSVoice) || "nova",
    avatarPreference:
      (initialData.avatarPreference as AvatarPreference) || "hanne",
    dialogMode: (initialData.dialogMode as DialogMode) || "text",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isPlayingPreview, setIsPlayingPreview] = useState<TTSVoice | null>(
    null
  );

  // E-Mail-Änderung State
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState("");

  // Avatar Editor State
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [currentAvatarConfig, setCurrentAvatarConfig] =
    useState<AvatarConfig | null>(null);

  // Load customAvatarConfig from initialData on mount
  useEffect(() => {
    // [AVATAR-DEBUG] Log initial config
    console.log("[AVATAR-DEBUG] ProfileForm Initial Config:", {
      customAvatarConfig: initialData.customAvatarConfig,
      type: typeof initialData.customAvatarConfig,
      keys: initialData.customAvatarConfig
        ? Object.keys(initialData.customAvatarConfig)
        : null,
    });

    if (initialData.customAvatarConfig) {
      setCurrentAvatarConfig(initialData.customAvatarConfig);
    }
  }, [initialData.customAvatarConfig]);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    // Client-side Validation
    const validationResult = profileUpdateSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const errorMessages: Record<string, string> = {};
      Object.entries(fieldErrors).forEach(([key, value]) => {
        if (value && value.length > 0) {
          errorMessages[key] = value[0];
        }
      });
      setErrors(errorMessages);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage("Profil erfolgreich gespeichert! 🎉");

        // 1. Better-Auth Session clientseitig neu laden
        await authClient.getSession({
          query: { disableCookieCache: true },
        });

        // 2. Next.js Cache invalidieren (Server Components)
        router.refresh();

        // Erfolgs-Nachricht nach 3 Sekunden ausblenden
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrors({ general: data.error || "Fehler beim Speichern" });
      }
    } catch (error) {
      setErrors({ general: "Netzwerkfehler. Bitte versuche es erneut." });
    } finally {
      setIsLoading(false);
    }
  };

  // Voice Preview Handler
  const playVoicePreview = (voice: TTSVoice) => {
    if (isPlayingPreview === voice) {
      // Stop current preview
      setIsPlayingPreview(null);
      return;
    }

    const audio = new Audio(`/audio/voice-previews/${voice}-preview.mp3`);
    setIsPlayingPreview(voice);

    audio.play().catch((error) => {
      console.error("Audio playback failed:", error);
      setIsPlayingPreview(null);
    });

    audio.onended = () => setIsPlayingPreview(null);
    audio.onerror = () => setIsPlayingPreview(null);
  };

  // E-Mail-Änderung Handler
  const handleEmailChange = async () => {
    if (!newEmail) return;

    setIsChangingEmail(true);
    setEmailChangeMessage("");

    try {
      await authClient.changeEmail({
        newEmail: newEmail,
        callbackURL: "/dashboard/profile",
      });
      setEmailChangeMessage(
        `Bestätigungs-E-Mail wurde an ${initialData.email} gesendet! Bitte prüfe dein Postfach.`
      );
      setNewEmail("");
    } catch (error) {
      console.error("Email change error:", error);
      setEmailChangeMessage(
        "Fehler beim Senden der Bestätigungs-E-Mail. Bitte versuche es erneut."
      );
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-background mt-16 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <Button
            variant="neutral"
            onClick={() => router.push("/dashboard")}
            className="mb-4"
          >
            ← Zurück zum Dashboard
          </Button>
          <h1 className="text-4xl font-extrabold text-foreground">
            Dein Profil
          </h1>
          <p className="text-lg font-medium text-foreground/70">
            Personalisiere deine Lernerfahrung
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-[#00D9BE] border-4 border-black rounded-[15px] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-extrabold text-black text-center">
              {successMessage}
            </p>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="bg-[#FC5A46] border-4 border-black rounded-[15px] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-extrabold text-white text-center">
              {errors.general}
            </p>
          </div>
        )}

        {/* Profile Form - Grid Layout: 1 column on mobile, 2 columns on large screens */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Persönliche Daten */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-[#FFC667] border-b-4 border-black px-6 py-6 -m-6 ">
              <CardTitle className="pl-6 text-2xl">Persönliche Daten</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Name (editierbar) */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-lg font-extrabold">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Dein vollständiger Name"
                  maxLength={100}
                />
                {errors.name && (
                  <p className="text-sm font-medium text-[#FC5A46]">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email (read-only mit Info) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-lg font-extrabold">
                  E-Mail-Adresse
                </Label>
                <Input
                  id="email"
                  value={initialData.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm font-medium text-foreground/60">
                  E-Mail-Änderung wird per E-Mail bestätigt (siehe unten)
                </p>

                {/* E-Mail-Änderung Form */}
                <div className="mt-4 p-4 bg-gray-50 border-2 border-black rounded-[15px]">
                  <h3 className="text-lg font-extrabold mb-3">
                    E-Mail-Adresse ändern
                  </h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Neue E-Mail-Adresse"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleEmailChange}
                        disabled={isChangingEmail || !newEmail}
                        variant="neutral"
                        size="default"
                      >
                        {isChangingEmail ? "Senden..." : "Ändern"}
                      </Button>
                    </div>
                    {emailChangeMessage && (
                      <p
                        className={`text-sm font-medium ${
                          emailChangeMessage.includes("Bestätigungs-E-Mail")
                            ? "text-[#00D9BE]"
                            : "text-[#FC5A46]"
                        }`}
                      >
                        {emailChangeMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Alter */}
              <div className="space-y-2">
                <Label htmlFor="age" className="text-lg font-extrabold">
                  Alter (optional)
                </Label>
                <Input
                  id="age"
                  type="number"
                  min="6"
                  max="120"
                  value={formData.age || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      age: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="z.B. 25"
                />
                {errors.age && (
                  <p className="text-sm font-medium text-[#FC5A46]">
                    {errors.age}
                  </p>
                )}
              </div>

              {/* Bevorzugte Sprache */}
              <div className="space-y-2">
                <Label htmlFor="language" className="text-lg font-extrabold">
                  Bevorzugte Sprache
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, language: lang })
                      }
                      className={cn(
                        "px-4 py-3 font-extrabold rounded-[15px] border-4 border-black transition-all duration-100",
                        formData.language === lang
                          ? "bg-[#FFC667] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]"
                          : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                      )}
                    >
                      {LANGUAGE_LABELS[lang]}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lernziele & Lernpräferenzen */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-[#FB7DA8] border-b-4 border-black px-6 py-6 -m-6">
              <CardTitle className="pl-6 text-2xl">
                Lernziele & Präferenzen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Lernziele Bereich */}
              <div className="space-y-4">
                <div className="bg-[#FFC667] border-4 border-black rounded-[15px] p-4">
                  <h3 className="text-xl font-extrabold text-black mb-4">
                    🎯 Lernziele
                  </h3>

                  {/* Lernziele Freitext */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="learningGoals"
                      className="text-lg font-extrabold"
                    >
                      Was möchtest du lernen?
                    </Label>
                    <Textarea
                      id="learningGoals"
                      value={formData.learningGoals || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          learningGoals: e.target.value,
                        })
                      }
                      placeholder="z.B. Ich möchte Python lernen, um Webseiten zu entwickeln..."
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-sm font-medium text-foreground/60">
                      {formData.learningGoals?.length || 0}/500 Zeichen
                    </p>
                    {errors.learningGoals && (
                      <p className="text-sm font-medium text-[#FC5A46]">
                        {errors.learningGoals}
                      </p>
                    )}
                  </div>

                  {/* Erfahrungslevel */}
                  <div className="space-y-2 mt-4">
                    <Label className="text-lg font-extrabold">
                      Dein Erfahrungslevel
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {EXPERIENCE_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, experienceLevel: level })
                          }
                          className={cn(
                            "px-6 py-4 font-extrabold rounded-[15px] border-4 border-black transition-all duration-100 text-left",
                            formData.experienceLevel === level
                              ? "bg-[#FB7DA8] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]"
                              : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                          )}
                        >
                          <div className="text-lg">
                            {EXPERIENCE_LEVEL_LABELS[level]}
                          </div>
                          <div className="text-sm font-medium text-foreground/70 mt-1">
                            {level === "beginner" && "Ich fange gerade erst an"}
                            {level === "intermediate" &&
                              "Ich habe Grundkenntnisse"}
                            {level === "advanced" && "Ich bin sehr erfahren"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lernpräferenzen Bereich */}
              <div className="space-y-4">
                <div className="bg-[#0CBCD7] border-4 border-black rounded-[15px] p-4">
                  <h3 className="text-xl font-extrabold text-black mb-4">
                    ⚙️ Lernpräferenzen
                  </h3>

                  {/* Schwierigkeitsgrad */}
                  <div className="space-y-2">
                    <Label className="text-lg font-extrabold">
                      Bevorzugter Schwierigkeitsgrad
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {DIFFICULTY_LEVELS.map((difficulty) => (
                        <button
                          key={difficulty}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              preferredDifficulty: difficulty,
                            })
                          }
                          className={cn(
                            "px-6 py-4 font-extrabold rounded-[15px] border-4 border-black transition-all duration-100",
                            formData.preferredDifficulty === difficulty
                              ? "bg-[#0CBCD7] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]"
                              : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                          )}
                        >
                          {DIFFICULTY_LEVEL_LABELS[difficulty]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Anzahl Karten pro Session */}
                  <div className="space-y-2 mt-4">
                    <Label
                      htmlFor="preferredCardCount"
                      className="text-lg font-extrabold"
                    >
                      Karten pro Lernsession
                    </Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="preferredCardCount"
                        type="number"
                        min="3"
                        max="20"
                        value={formData.preferredCardCount || 5}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            preferredCardCount: parseInt(e.target.value) || 5,
                          })
                        }
                        className="w-24"
                      />
                      <span className="font-medium text-foreground/70">
                        (3-20 Karten)
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground/60">
                      Bestimmt, wie viele Karten pro Session generiert werden
                    </p>
                    {errors.preferredCardCount && (
                      <p className="text-sm font-medium text-[#FC5A46]">
                        {errors.preferredCardCount}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dialog-Modus */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-[#662CB7] border-b-4 border-black px-6 py-6 -m-6">
              <CardTitle className="pl-6 text-2xl text-white">
                💬 Dialog-Modus
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-lg font-extrabold">
                  Wie möchtest du in der Dialog-Phase antworten?
                </Label>
                <p className="text-sm font-medium text-foreground/60 mb-4">
                  Wähle zwischen Text-Chat (Tippen) oder Voice-Chat (Sprechen
                  mit Avatar).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DIALOG_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, dialogMode: mode })
                      }
                      className={cn(
                        "p-6 rounded-[15px] border-4 border-black transition-all duration-100",
                        formData.dialogMode === mode
                          ? "bg-[#662CB7] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]"
                          : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                      )}
                    >
                      <div className="text-center">
                        <p className="text-2xl mb-2">
                          {mode === "text" ? "✍️" : "🎤"}
                        </p>
                        <p
                          className={cn(
                            "font-extrabold text-lg mb-1",
                            formData.dialogMode === mode
                              ? "text-white"
                              : "text-black"
                          )}
                        >
                          {DIALOG_MODE_LABELS[mode].name}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            formData.dialogMode === mode
                              ? "text-white/80"
                              : "text-black/70"
                          )}
                        >
                          {DIALOG_MODE_LABELS[mode].description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voice-Einstellungen */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-[#662CB7] border-b-4 border-black px-6 py-6 -m-6">
              <CardTitle className="pl-6 text-2xl text-white">
                Stimmen-Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-lg font-extrabold">
                  Bevorzugte TTS-Stimme für Voice-Chat
                </Label>
                <p className="text-sm font-medium text-foreground/60 mb-4">
                  Wähle die Stimme, die dir am besten gefällt. Klicke auf
                  "Anhören" für eine Vorschau.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TTS_VOICES.map((voice) => (
                    <div
                      key={voice}
                      className={cn(
                        "p-4 rounded-[15px] border-4 border-black transition-all duration-100",
                        formData.ttsVoice === voice
                          ? "bg-[#662CB7] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                          : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, ttsVoice: voice })
                          }
                          className="flex-1 text-left"
                        >
                          <p
                            className={cn(
                              "font-extrabold text-lg",
                              formData.ttsVoice === voice
                                ? "text-white"
                                : "text-black"
                            )}
                          >
                            {TTS_VOICE_LABELS[voice].name}
                          </p>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              formData.ttsVoice === voice
                                ? "text-white/80"
                                : "text-black/70"
                            )}
                          >
                            {TTS_VOICE_LABELS[voice].description}
                          </p>
                        </button>

                        <Button
                          type="button"
                          size="sm"
                          variant="neutral"
                          onClick={(e) => {
                            e.stopPropagation();
                            playVoicePreview(voice);
                          }}
                          disabled={isPlayingPreview === voice}
                          className="ml-3"
                        >
                          {isPlayingPreview === voice ? "⏸️" : "🔊"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avatar-Einstellungen */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-[#00D9BE] border-b-4 border-black px-6 py-6 -m-6">
              <CardTitle className="pl-6 text-2xl text-black">
                Avatar-Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-lg font-extrabold">
                  Bevorzugter Avatar für Voice-Chat
                </Label>
                <p className="text-sm font-medium text-foreground/60 mb-4">
                  Wähle den Avatar, der als dein Gesprächspartner im Voice-Chat
                  angezeigt wird.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {AVATAR_PREFERENCES.map((avatar) => (
                    <div
                      key={avatar}
                      className={cn(
                        "p-4 rounded-[15px] border-4 border-black transition-all duration-100 cursor-pointer",
                        formData.avatarPreference === avatar
                          ? "bg-[#00D9BE] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]"
                          : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
                      )}
                      onClick={() =>
                        setFormData({ ...formData, avatarPreference: avatar })
                      }
                    >
                      <div className="flex flex-col items-center text-center">
                        <img
                          src={`/teachers/${avatar}.jpeg`}
                          alt={AVATAR_LABELS[avatar].name}
                          className="w-24 h-24 rounded-[15px] border-4 border-black object-cover mb-3"
                        />
                        <p
                          className={cn(
                            "font-extrabold text-lg mb-1",
                            formData.avatarPreference === avatar
                              ? "text-black"
                              : "text-black"
                          )}
                        >
                          {AVATAR_LABELS[avatar].name}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            formData.avatarPreference === avatar
                              ? "text-black/80"
                              : "text-black/70"
                          )}
                        >
                          {AVATAR_LABELS[avatar].description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Avatar */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-[#FB7DA8] border-b-4 border-black px-6 py-6 -m-6">
              <CardTitle className="pl-6 text-2xl text-black">
                Dein Avatar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-extrabold">
                    Avatar erstellen und anpassen
                  </Label>
                  <p className="text-sm font-medium text-foreground/60">
                    Erstelle deinen eigenen Avatar, der in der Navbar und im
                    Chat angezeigt wird.
                  </p>
                </div>

                {/* Avatar Preview */}
                <div className="flex items-center gap-6">
                  {currentAvatarConfig ? (
                    <img
                      src={generateAvatarDataUri(currentAvatarConfig, 80, userId)}
                      alt="Dein Avatar"
                      className="w-20 h-20 rounded-[15px] border-4 border-black object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-[15px] border-4 border-black bg-gray-50 flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                  )}
                  <Button
                    type="button"
                    onClick={() => setIsAvatarEditorOpen(true)}
                    variant="default"
                  >
                    {currentAvatarConfig
                      ? "Avatar bearbeiten"
                      : "Avatar erstellen"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button - Spans full width on large screens */}
          <div className="col-span-1 lg:col-span-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Speichern..." : "Profil speichern"}
            </Button>
          </div>
        </form>

        {/* Avatar Editor Dialog */}
        <AvatarEditorDialog
          open={isAvatarEditorOpen}
          onOpenChange={setIsAvatarEditorOpen}
          initialConfig={currentAvatarConfig}
          onSave={async (config: AvatarConfig) => {
            try {
              // [AVATAR-DEBUG] Log save payload
              console.log("[AVATAR-DEBUG] ProfileForm Save Payload:", {
                config,
                configKeys: Object.keys(config),
                stringified: JSON.stringify({ customAvatarConfig: config }),
              });

              setCurrentAvatarConfig(config);

              // Save to backend
              const response = await fetch("/api/profile/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customAvatarConfig: config }),
              });

              // [AVATAR-DEBUG] Log response status
              console.log("[AVATAR-DEBUG] ProfileForm Save Response Status:", {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
              });

              if (!response.ok) {
                const error = await response.json();
                console.error("[AVATAR-DEBUG] ProfileForm Save Error:", error);
                throw new Error(error.error || "Failed to save avatar");
              }

              const responseData = await response.json();

              // [AVATAR-DEBUG] Log response data
              console.log("[AVATAR-DEBUG] ProfileForm Save Response Data:", {
                customAvatarConfig: responseData.user?.customAvatarConfig,
                type: typeof responseData.user?.customAvatarConfig,
              });

              // 1. Better-Auth Session clientseitig neu laden
              await authClient.getSession({
                query: { disableCookieCache: true },
              });

              // 2. Next.js Cache invalidieren (Server Components)
              router.refresh();

              setSuccessMessage("Avatar erfolgreich gespeichert!");
              setTimeout(() => setSuccessMessage(""), 3000);
            } catch (error) {
              console.error("Avatar save error:", error);
              setErrors({
                general:
                  error instanceof Error
                    ? error.message
                    : "Fehler beim Speichern des Avatars",
              });
            }
          }}
        />
      </div>
    </div>
  );
}
