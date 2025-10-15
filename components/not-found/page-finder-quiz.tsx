"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * PageFinderQuiz - Interaktives Quiz zum "Finden" der 404-Seite
 *
 * Mini-Quiz mit 404- und Web-Development-Fragen.
 * Bei richtiger Antwort: Konfetti-Animation + Weiterleitung zur Homepage.
 * Bei falscher Antwort: Humorvolles Feedback.
 */

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  humorResponse: string;
}

const quizQuestions: QuizQuestion[] = [
  {
    id: "what-is-404",
    question: "Was bedeutet der HTTP-Statuscode 404?",
    options: [
      "Seite nicht gefunden",
      "Server ist kaputt",
      "Hamster-Code für 'gefressen'",
      "Internet ist ausgefallen",
    ],
    correctAnswer: 0,
    explanation:
      "404 bedeutet 'Not Found' - die angeforderte Ressource existiert nicht auf dem Server.",
    humorResponse:
      "Der Hamster hat sie gefressen! 🐹 Aber eigentlich bedeutet 404 'Seite nicht gefunden'.",
  },
  {
    id: "http-codes-count",
    question: "Wie viele verschiedene HTTP-Statuscodes gibt es ungefähr?",
    options: [
      "Über 70 verschiedene",
      "Genau 404 Stück",
      "Unendlich viele",
      "Nur 4 Stück",
    ],
    correctAnswer: 0,
    explanation:
      "Es gibt über 70 verschiedene HTTP-Statuscodes, von 100 (Continue) bis 511 (Network Authentication Required).",
    humorResponse: "Unser Hamster hat alle gezählt: Es sind über 70! 🧮",
  },
  {
    id: "internet-inventor",
    question: "Wer hat das World Wide Web erfunden?",
    options: [
      "Tim Berners-Lee",
      "Der Hamster (1989)",
      "Steve Jobs",
      "Bill Gates",
    ],
    correctAnswer: 0,
    explanation:
      "Tim Berners-Lee erfand das World Wide Web 1989 am CERN. Unser Hamster war damals noch ein Baby!",
    humorResponse:
      "Tim Berners-Lee! Unser Hamster war 1989 noch zu jung zum Programmieren. 🐹",
  },
  {
    id: "first-website",
    question: "Was war die erste Website der Welt?",
    options: ["info.cern.ch", "google.com", "hamster-lernfa.st", "youtube.com"],
    correctAnswer: 0,
    explanation:
      "info.cern.ch war die erste Website der Welt und existiert noch heute! Sie ist über 30 Jahre alt.",
    humorResponse:
      "info.cern.ch! Sie ist älter als unser Hamster und funktioniert noch immer perfekt. 🏛️",
  },
  {
    id: "teapot-code",
    question: "Welcher HTTP-Statuscode ist ein echter Aprilscherz?",
    options: [
      "418 I'm a teapot",
      "404 Not Found",
      "500 Internal Server Error",
      "200 OK",
    ],
    correctAnswer: 0,
    explanation:
      "418 I'm a teapot ist ein echter HTTP-Code, der als Aprilscherz für Teekannen-Webserver erfunden wurde!",
    humorResponse:
      "418 I'm a teapot! 🫖 Ein echter Code für Teekannen-Webserver. Unser Hamster liebt Tee!",
  },
];

interface QuizState {
  currentQuestion: number;
  selectedAnswer: number | null;
  showResult: boolean;
  score: number;
  isComplete: boolean;
  showConfetti: boolean;
}

export function PageFinderQuiz() {
  const [isMounted, setIsMounted] = useState(false);
  const [state, setState] = useState<QuizState>({
    currentQuestion: 0,
    selectedAnswer: null,
    showResult: false,
    score: 0,
    isComplete: false,
    showConfetti: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Verhindere Hydration-Mismatch durch SSR
  if (!isMounted) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="w-full bg-gray-100 border-4 border-black rounded-[15px] h-8 overflow-hidden">
          <div className="h-full bg-[#FFC667] border-r-4 border-black w-0" />
        </div>
        <Card className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          <div className="text-center">
            <h3 className="text-2xl font-extrabold text-black mb-6">
              Quiz wird geladen... 🐹
            </h3>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const currentQ = quizQuestions[state.currentQuestion];
  const progress = ((state.currentQuestion + 1) / quizQuestions.length) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    console.log(
      "Answer selected:",
      answerIndex,
      "showResult:",
      state.showResult
    );
    if (state.showResult) return;

    setState((prev) => ({
      ...prev,
      selectedAnswer: answerIndex,
    }));
  };

  const handleSubmitAnswer = () => {
    console.log("Submit answer:", state.selectedAnswer);
    if (state.selectedAnswer === null) return;

    const isCorrect = state.selectedAnswer === currentQ.correctAnswer;
    const newScore = isCorrect ? state.score + 1 : state.score;

    setState((prev) => ({
      ...prev,
      showResult: true,
      score: newScore,
    }));

    // Nach 2 Sekunden zur nächsten Frage oder Quiz-Ende
    setTimeout(() => {
      if (state.currentQuestion < quizQuestions.length - 1) {
        setState((prev) => ({
          ...prev,
          currentQuestion: prev.currentQuestion + 1,
          selectedAnswer: null,
          showResult: false,
        }));
      } else {
        // Quiz beendet
        setState((prev) => ({
          ...prev,
          isComplete: true,
          showConfetti: newScore >= 3, // Konfetti bei 3+ richtigen Antworten
        }));
      }
    }, 2000);
  };

  const resetQuiz = () => {
    setState({
      currentQuestion: 0,
      selectedAnswer: null,
      showResult: false,
      score: 0,
      isComplete: false,
      showConfetti: false,
    });
  };

  const getScoreMessage = () => {
    const percentage = (state.score / quizQuestions.length) * 100;

    if (percentage >= 80) {
      return {
        title: "Perfekt! 🎉",
        message: "Du bist ein echter Web-Experte! Der Hamster ist beeindruckt.",
        color: "bg-[#00D9BE]",
      };
    } else if (percentage >= 60) {
      return {
        title: "Sehr gut! 👏",
        message: "Du kennst dich aus! Nur ein paar Details fehlen noch.",
        color: "bg-[#FFC667]",
      };
    } else {
      return {
        title: "Nicht schlecht! 🐹",
        message: "Der Hamster kann dir noch ein paar Tricks beibringen!",
        color: "bg-[#FB7DA8]",
      };
    }
  };

  if (state.isComplete) {
    const scoreInfo = getScoreMessage();

    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Konfetti Animation */}
        {state.showConfetti && (
          <div className="confetti-container">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`confetti confetti-${i}`}
                style={{
                  backgroundColor: ["#FFC667", "#FB7DA8", "#00D9BE", "#662CB7"][
                    i % 4
                  ],
                }}
              />
            ))}
          </div>
        )}

        {/* Quiz-Ergebnis */}
        <Card
          className={`${scoreInfo.color} border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 text-center`}
        >
          <h2 className="text-3xl font-extrabold text-black mb-4">
            {scoreInfo.title}
          </h2>
          <p className="text-lg font-medium text-black mb-6">
            {scoreInfo.message}
          </p>
          <div className="text-2xl font-extrabold text-black mb-6">
            {state.score} von {quizQuestions.length} richtig
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={resetQuiz}
              variant="outline"
              className="bg-white text-black border-4 border-black hover:bg-gray-50"
            >
              Nochmal spielen
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              className="bg-[#662CB7] text-white border-4 border-black hover:bg-[#4a1f8a]"
            >
              Zur Homepage
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Fortschrittsbalken */}
      <div className="w-full bg-gray-100 border-4 border-black rounded-[15px] h-8 overflow-hidden">
        <div
          className="h-full bg-[#FFC667] border-r-4 border-black transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Frage-Nummer */}
      <div className="text-center">
        <span className="inline-block px-4 py-2 bg-[#FB7DA8] text-black font-extrabold text-lg border-4 border-black rounded-[15px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          Frage {state.currentQuestion + 1} von {quizQuestions.length}
        </span>
      </div>

      {/* Quiz-Karte */}
      <Card className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <h3 className="text-2xl font-extrabold text-black mb-6 text-center">
          {currentQ.question}
        </h3>

        {/* Antwort-Optionen */}
        <div className="space-y-4 mb-6">
          {currentQ.options.map((option, index) => {
            let buttonClass =
              "w-full p-4 text-left font-medium text-lg border-4 border-black rounded-[15px] transition-all duration-100 ";

            if (state.showResult) {
              if (index === currentQ.correctAnswer) {
                buttonClass +=
                  "bg-[#00D9BE] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
              } else if (
                index === state.selectedAnswer &&
                index !== currentQ.correctAnswer
              ) {
                buttonClass +=
                  "bg-[#FC5A46] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
              } else {
                buttonClass += "bg-gray-100 text-gray-500 border-gray-300";
              }
            } else {
              if (state.selectedAnswer === index) {
                buttonClass +=
                  "bg-[#FFC667] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]";
              } else {
                buttonClass +=
                  "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={buttonClass}
                disabled={state.showResult}
              >
                <span className="font-extrabold text-lg mr-3">
                  {String.fromCharCode(65 + index)})
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Ergebnis-Anzeige */}
        {state.showResult && (
          <div
            className={`p-4 rounded-[15px] border-4 border-black mb-6 ${
              state.selectedAnswer === currentQ.correctAnswer
                ? "bg-[#00D9BE] text-black"
                : "bg-[#FC5A46] text-white"
            }`}
          >
            <p className="font-extrabold text-lg mb-2">
              {state.selectedAnswer === currentQ.correctAnswer
                ? "🎉 Richtig!"
                : "😅 Falsch!"}
            </p>
            <p className="font-medium mb-2">
              {state.selectedAnswer === currentQ.correctAnswer
                ? currentQ.explanation
                : currentQ.humorResponse}
            </p>
          </div>
        )}

        {/* Submit Button */}
        {state.selectedAnswer !== null && !state.showResult && (
          <div className="text-center">
            <Button
              onClick={handleSubmitAnswer}
              className="bg-[#662CB7] text-white border-4 border-black hover:bg-[#4a1f8a] px-8 py-4 text-lg font-extrabold"
            >
              Antwort abgeben
            </Button>
          </div>
        )}
      </Card>

      <style jsx>{`
        .confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          border: 2px solid #000;
          animation: confetti-fall 3s ease-out forwards;
        }

        .confetti-0 {
          left: 10%;
          animation-delay: 0s;
        }
        .confetti-1 {
          left: 20%;
          animation-delay: 0.1s;
        }
        .confetti-2 {
          left: 30%;
          animation-delay: 0.2s;
        }
        .confetti-3 {
          left: 40%;
          animation-delay: 0.3s;
        }
        .confetti-4 {
          left: 50%;
          animation-delay: 0.4s;
        }
        .confetti-5 {
          left: 60%;
          animation-delay: 0.5s;
        }
        .confetti-6 {
          left: 70%;
          animation-delay: 0.6s;
        }
        .confetti-7 {
          left: 80%;
          animation-delay: 0.7s;
        }
        .confetti-8 {
          left: 90%;
          animation-delay: 0.8s;
        }
        .confetti-9 {
          left: 15%;
          animation-delay: 0.9s;
        }
        .confetti-10 {
          left: 25%;
          animation-delay: 1s;
        }
        .confetti-11 {
          left: 35%;
          animation-delay: 1.1s;
        }
        .confetti-12 {
          left: 45%;
          animation-delay: 1.2s;
        }
        .confetti-13 {
          left: 55%;
          animation-delay: 1.3s;
        }
        .confetti-14 {
          left: 65%;
          animation-delay: 1.4s;
        }
        .confetti-15 {
          left: 75%;
          animation-delay: 1.5s;
        }
        .confetti-16 {
          left: 85%;
          animation-delay: 1.6s;
        }
        .confetti-17 {
          left: 95%;
          animation-delay: 1.7s;
        }
        .confetti-18 {
          left: 12%;
          animation-delay: 1.8s;
        }
        .confetti-19 {
          left: 88%;
          animation-delay: 1.9s;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
