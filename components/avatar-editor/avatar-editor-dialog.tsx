"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AvatarEditor } from "./avatar-editor";
import type { AvatarConfig } from "@/lib/avatar.types";

interface AvatarEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: AvatarConfig | null;
  onSave: (config: AvatarConfig) => Promise<void>;
}

export function AvatarEditorDialog({
  open,
  onOpenChange,
  initialConfig,
  onSave,
}: AvatarEditorDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (config: AvatarConfig) => {
    setIsSaving(true);
    try {
      await onSave(config);
      onOpenChange(false);
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-extrabold">
            Dein Avatar erstellen
          </DialogTitle>
          <DialogDescription className="text-base font-medium">
            Gestalte deinen eigenen Avatar mit verschiedenen Elementen
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AvatarEditor
            initialConfig={initialConfig || {}}
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
