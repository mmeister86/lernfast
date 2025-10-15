"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * SimpleQuiz - Vereinfachte Quiz-Komponente für Debugging
 */
export function SimpleQuiz() {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const question = "Was bedeutet der HTTP-Statuscode 404?";
  const options = [
    "Seite nicht gefunden",
    "Server ist kaputt",
    "Hamster-Code für 'gefressen'",
    "Internet ist ausgefallen",
  ];
  const correctAnswer = 0;

  const handleAnswerClick = (index: number) => {
    console.log("Answer clicked:", index);
    setSelectedAnswer(index);
    setShowResult(true);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <h3 className="text-2xl font-extrabold text-black mb-6 text-center">
          {question}
        </h3>

        <div className="space-y-4">
          {options.map((option, index) => {
            let buttonClass =
              "w-full p-4 text-left font-medium text-lg border-4 border-black rounded-[15px] ";

            if (showResult) {
              if (index === correctAnswer) {
                buttonClass +=
                  "bg-[#00D9BE] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
              } else if (index === selectedAnswer) {
                buttonClass +=
                  "bg-[#FC5A46] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
              } else {
                buttonClass += "bg-gray-100 text-gray-500 border-gray-300";
              }
            } else {
              if (selectedAnswer === index) {
                buttonClass +=
                  "bg-[#FFC667] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";
              } else {
                buttonClass +=
                  "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerClick(index)}
                className={buttonClass}
                disabled={showResult}
                style={{ cursor: showResult ? "default" : "pointer" }}
              >
                <span className="font-extrabold text-lg mr-3">
                  {String.fromCharCode(65 + index)})
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="mt-6 p-4 rounded-[15px] border-4 border-black bg-[#FFC667] text-black">
            <p className="font-extrabold text-lg">
              {selectedAnswer === correctAnswer ? "🎉 Richtig!" : "😅 Falsch!"}
            </p>
            <p className="font-medium mt-2">
              {selectedAnswer === correctAnswer
                ? "404 bedeutet 'Not Found' - die angeforderte Ressource existiert nicht auf dem Server."
                : "Der Hamster hat sie gefressen! 🐹 Aber eigentlich bedeutet 404 'Seite nicht gefunden'."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
