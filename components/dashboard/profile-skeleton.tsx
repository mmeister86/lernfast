/**
 * Profile Page Skeleton - Neobrutalismus Design
 * Lernfa.st Dashboard
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-12 w-56 bg-gray-200 rounded-[15px] border-4 border-black animate-pulse" />
          <div className="h-12 bg-[#FFC667]/30 rounded-[15px] w-1/2 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded-[15px] w-2/3 animate-pulse" />
        </div>

        {/* Persönliche Daten Card Skeleton */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-[#FFC667]/50 border-b-4 border-black px-6 py-6 -m-6 mb-6">
            <div className="pl-6 h-8 w-48 bg-white/50 rounded-[15px] animate-pulse" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <div className="h-6 w-16 bg-gray-200 rounded-[15px] animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-[15px] border-4 border-black animate-pulse" />
            </div>
            {/* Email Field */}
            <div className="space-y-2">
              <div className="h-6 w-32 bg-gray-200 rounded-[15px] animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-[15px] border-4 border-black animate-pulse" />
              <div className="h-4 w-64 bg-gray-200 rounded-[15px] animate-pulse" />
            </div>
            {/* Age Field */}
            <div className="space-y-2">
              <div className="h-6 w-28 bg-gray-200 rounded-[15px] animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-[15px] border-4 border-black animate-pulse" />
            </div>
            {/* Language Selection */}
            <div className="space-y-2">
              <div className="h-6 w-40 bg-gray-200 rounded-[15px] animate-pulse" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-gray-100 rounded-[15px] border-4 border-black animate-pulse"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lernziele Card Skeleton */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-[#FB7DA8]/50 border-b-4 border-black px-6 py-6 -m-6 mb-6">
            <div className="pl-6 h-8 w-32 bg-white/50 rounded-[15px] animate-pulse" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Learning Goals Textarea */}
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded-[15px] animate-pulse" />
              <div className="h-32 bg-gray-100 rounded-[15px] border-4 border-black animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded-[15px] animate-pulse" />
            </div>
            {/* Experience Level */}
            <div className="space-y-2">
              <div className="h-6 w-44 bg-gray-200 rounded-[15px] animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded-[15px] border-4 border-black animate-pulse"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lernpräferenzen Card Skeleton */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-[#0CBCD7]/50 border-b-4 border-black px-6 py-6 -m-6 mb-6">
            <div className="pl-6 h-8 w-40 bg-white/50 rounded-[15px] animate-pulse" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Difficulty Level */}
            <div className="space-y-2">
              <div className="h-6 w-56 bg-gray-200 rounded-[15px] animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 rounded-[15px] border-4 border-black animate-pulse"
                  />
                ))}
              </div>
            </div>
            {/* Card Count */}
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded-[15px] animate-pulse" />
              <div className="flex items-center gap-4">
                <div className="h-12 w-24 bg-gray-100 rounded-[15px] border-4 border-black animate-pulse" />
                <div className="h-6 w-32 bg-gray-200 rounded-[15px] animate-pulse" />
              </div>
              <div className="h-4 w-full bg-gray-200 rounded-[15px] animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button Skeleton */}
        <div className="h-14 bg-[#FFC667]/30 rounded-[15px] border-4 border-black animate-pulse" />
      </div>
    </div>
  );
}
