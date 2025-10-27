"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AVATAR_ACCESSORIES,
  AVATAR_BODIES,
  AVATAR_FACES,
  AVATAR_FACIAL_HAIRS,
  AVATAR_HEADS,
  AVATAR_MOUTHS,
  AVATAR_NOSES,
  generateRandomAvatar,
  type AvatarConfig,
} from "@/lib/avatar.types";
import { AvatarPreview } from "./avatar-preview";
import { CategoryPanel } from "./category-panel";

interface AvatarEditorProps {
  initialConfig?: AvatarConfig;
  onSave: (config: AvatarConfig) => Promise<void>;
  onCancel?: () => void;
}

export function AvatarEditor({
  initialConfig = {},
  onSave,
  onCancel,
}: AvatarEditorProps) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);

  const updateConfig = useCallback(
    (key: keyof AvatarConfig, value: string | string[] | undefined) => {
      setConfig((prev) => {
        if (value === undefined) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const handleRandom = useCallback(() => {
    setConfig(generateRandomAvatar());
  }, []);

  const handleReset = useCallback(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(config);
    } catch (error) {
      console.error("Fehler beim Speichern des Avatars:", error);
    } finally {
      setIsSaving(false);
    }
  }, [config, onSave]);

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex justify-center">
        <AvatarPreview config={config} size={192} />
      </div>

      {/* Tabs für Kategorien */}
      <Tabs defaultValue="accessory" className="w-full">
        <TabsList className="grid w-full grid-cols-8 overflow-x-auto">
          <TabsTrigger value="accessory">Zubehör</TabsTrigger>
          <TabsTrigger value="body">Körper</TabsTrigger>
          <TabsTrigger value="face">Gesicht</TabsTrigger>
          <TabsTrigger value="facialHair">Bart</TabsTrigger>
          <TabsTrigger value="head">Frisur</TabsTrigger>
          <TabsTrigger value="mouth">Mund</TabsTrigger>
          <TabsTrigger value="nose">Nase</TabsTrigger>
          <TabsTrigger value="background">Hintergrund</TabsTrigger>
        </TabsList>

        <TabsContent value="accessory" className="space-y-4">
          <CategoryPanel
            title="Accessoire"
            options={AVATAR_ACCESSORIES}
            selectedValue={config.accessory}
            onSelect={(value) => updateConfig("accessory", value)}
          />
        </TabsContent>

        <TabsContent value="body" className="space-y-4">
          <CategoryPanel
            title="Körper"
            options={AVATAR_BODIES}
            selectedValue={config.body}
            onSelect={(value) => updateConfig("body", value)}
          />
        </TabsContent>

        <TabsContent value="face" className="space-y-4">
          <CategoryPanel
            title="Gesichtsausdruck"
            options={AVATAR_FACES}
            selectedValue={config.face}
            onSelect={(value) => updateConfig("face", value)}
          />
        </TabsContent>

        <TabsContent value="facialHair" className="space-y-4">
          <CategoryPanel
            title="Gesichtsbehaarung"
            options={AVATAR_FACIAL_HAIRS}
            selectedValue={config.facialHair}
            onSelect={(value) => updateConfig("facialHair", value)}
          />
        </TabsContent>

        <TabsContent value="head" className="space-y-4">
          <CategoryPanel
            title="Frisur"
            options={AVATAR_HEADS}
            selectedValue={config.head}
            onSelect={(value) => updateConfig("head", value)}
          />
        </TabsContent>

        <TabsContent value="mouth" className="space-y-4">
          <CategoryPanel
            title="Mund"
            options={AVATAR_MOUTHS}
            selectedValue={config.mouth}
            onSelect={(value) => updateConfig("mouth", value)}
          />
        </TabsContent>

        <TabsContent value="nose" className="space-y-4">
          <CategoryPanel
            title="Nase"
            options={AVATAR_NOSES}
            selectedValue={config.nose}
            onSelect={(value) => updateConfig("nose", value)}
          />
        </TabsContent>

        <TabsContent value="background" className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-foreground">
              Hintergrundfarbe
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {[
                { value: "#FFC667", label: "Peach" },
                { value: "#FB7DA8", label: "Pink" },
                { value: "#FC5A46", label: "Coral" },
                { value: "#662CB7", label: "Purple" },
                { value: "#00D9BE", label: "Teal" },
                { value: "#0CBCD7", label: "Blue" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => updateConfig("backgroundColor", [value])}
                  className={`aspect-square rounded-[15px] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-100 ${
                    config.backgroundColor?.[0] === value
                      ? "ring-4 ring-[#00D9BE]"
                      : ""
                  }`}
                  style={{ backgroundColor: value }}
                  aria-label={label}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button
          onClick={handleRandom}
          variant="outline"
          className="flex-1 max-w-xs"
        >
          🎲 Zufällig
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          className="flex-1 max-w-xs"
        >
          ↺ Zurücksetzen
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 max-w-xs"
        >
          {isSaving ? "Speichere..." : "✓ Speichern"}
        </Button>
      </div>
    </div>
  );
}
