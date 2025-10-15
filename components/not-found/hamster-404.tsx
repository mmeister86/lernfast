"use client";

import React, { useState, useEffect } from "react";

/**
 * Hamster404 - Animierter Hamster für die 404-Seite
 * 
 * Ein humorvoller Hamster der die "gefressene" Seite darstellt.
 * Wiederverwendung des BrainLoader-Stils mit Hamster-spezifischen Animationen.
 */
export function Hamster404() {
  const [isMunching, setIsMunching] = useState(false);
  const [showThought, setShowThought] = useState(false);

  useEffect(() => {
    // Alle 3 Sekunden "mampfen" und Gedanken zeigen
    const interval = setInterval(() => {
      setIsMunching(true);
      setShowThought(true);
      
      setTimeout(() => {
        setIsMunching(false);
      }, 600);
      
      setTimeout(() => {
        setShowThought(false);
      }, 2000);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const thoughts = [
    "Mmmh... lecker Seite!",
    "Wo ist die nächste?",
    "Das war eine 404-Nuss!",
    "Ich bin satt... fast!",
    "Mehr Seiten bitte!"
  ];

  const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="hamster-container">
        {/* Hamster Body */}
        <div className={`hamster ${isMunching ? 'munching' : ''}`}>
          {/* Hamster Gesicht */}
          <div className="hamster-face">
            {/* Augen */}
            <div className="hamster-eye hamster-eye--left">
              <div className="eye-pupil"></div>
            </div>
            <div className="hamster-eye hamster-eye--right">
              <div className="eye-pupil"></div>
            </div>
            
            {/* Nase */}
            <div className="hamster-nose"></div>
            
            {/* Mund (wird beim Mampfen größer) */}
            <div className={`hamster-mouth ${isMunching ? 'munching' : ''}`}>
              <div className="tooth"></div>
              <div className="tooth"></div>
            </div>
          </div>

          {/* Hamster Ohren */}
          <div className="hamster-ear hamster-ear--left"></div>
          <div className="hamster-ear hamster-ear--right"></div>

          {/* Hamster Körper */}
          <div className="hamster-body"></div>

          {/* Füße */}
          <div className="hamster-foot hamster-foot--left"></div>
          <div className="hamster-foot hamster-foot--right"></div>
        </div>

        {/* Gedanken-Bubble */}
        {showThought && (
          <div className="thought-bubble">
            <div className="thought-text">{randomThought}</div>
            <div className="thought-arrow"></div>
          </div>
        )}

        {/* Mampf-Effekte */}
        {isMunching && (
          <>
            <div className="munch-effect munch-effect--1">📄</div>
            <div className="munch-effect munch-effect--2">💻</div>
            <div className="munch-effect munch-effect--3">🌐</div>
          </>
        )}
      </div>

      <style jsx>{`
        .hamster-container {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hamster {
          position: relative;
          width: 120px;
          height: 100px;
          animation: hamster-bounce 2s ease-in-out infinite;
        }

        .hamster.munching {
          animation: hamster-munch 0.6s ease-in-out;
        }

        /* Hamster Gesicht */
        .hamster-face {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 50px;
          background: #FFC667;
          border: 4px solid #000;
          border-radius: 50%;
          z-index: 3;
        }

        /* Augen */
        .hamster-eye {
          position: absolute;
          width: 12px;
          height: 12px;
          background: white;
          border: 2px solid #000;
          border-radius: 50%;
          top: 8px;
          animation: eye-blink 3s ease-in-out infinite;
        }

        .hamster-eye--left {
          left: 8px;
        }

        .hamster-eye--right {
          right: 8px;
        }

        .eye-pupil {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: #000;
          border-radius: 50%;
          animation: pupil-move 2s ease-in-out infinite;
        }

        /* Nase */
        .hamster-nose {
          position: absolute;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 4px;
          background: #000;
          border-radius: 50%;
        }

        /* Mund */
        .hamster-mouth {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 8px;
          border: 2px solid #000;
          border-top: none;
          border-radius: 0 0 16px 16px;
          background: #000;
          transition: all 0.3s ease;
        }

        .hamster-mouth.munching {
          width: 24px;
          height: 12px;
          border-radius: 0 0 24px 24px;
        }

        .tooth {
          position: absolute;
          top: -2px;
          width: 2px;
          height: 4px;
          background: white;
          border: 1px solid #000;
        }

        .tooth:first-child {
          left: 4px;
        }

        .tooth:last-child {
          right: 4px;
        }

        /* Ohren */
        .hamster-ear {
          position: absolute;
          width: 20px;
          height: 25px;
          background: #FB7DA8;
          border: 3px solid #000;
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          top: 5px;
          z-index: 2;
        }

        .hamster-ear--left {
          left: 15px;
          animation: ear-twitch 4s ease-in-out infinite;
        }

        .hamster-ear--right {
          right: 15px;
          animation: ear-twitch 4s ease-in-out infinite 0.5s;
        }

        /* Körper */
        .hamster-body {
          position: absolute;
          top: 35px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 50px;
          background: #FFC667;
          border: 4px solid #000;
          border-radius: 50%;
          z-index: 1;
        }

        /* Füße */
        .hamster-foot {
          position: absolute;
          width: 12px;
          height: 8px;
          background: #FFC667;
          border: 2px solid #000;
          border-radius: 50%;
          top: 75px;
        }

        .hamster-foot--left {
          left: 30px;
          animation: foot-tap 2.5s ease-in-out infinite;
        }

        .hamster-foot--right {
          right: 30px;
          animation: foot-tap 2.5s ease-in-out infinite 0.3s;
        }

        /* Gedanken-Bubble */
        .thought-bubble {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 4px solid #000;
          border-radius: 15px;
          padding: 8px 12px;
          animation: bubble-appear 2s ease-in-out;
          z-index: 10;
        }

        .thought-text {
          font-size: 12px;
          font-weight: 800;
          color: #000;
          white-space: nowrap;
        }

        .thought-arrow {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid #000;
        }

        /* Mampf-Effekte */
        .munch-effect {
          position: absolute;
          font-size: 16px;
          animation: munch-float 0.6s ease-out forwards;
          z-index: 5;
        }

        .munch-effect--1 {
          top: 20px;
          left: 20px;
          animation-delay: 0s;
        }

        .munch-effect--2 {
          top: 30px;
          right: 20px;
          animation-delay: 0.1s;
        }

        .munch-effect--3 {
          top: 50px;
          left: 50%;
          transform: translateX(-50%);
          animation-delay: 0.2s;
        }

        /* Animationen */
        @keyframes hamster-bounce {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes hamster-munch {
          0% {
            transform: translateY(0px) scale(1);
          }
          25% {
            transform: translateY(-8px) scale(1.1);
          }
          50% {
            transform: translateY(-5px) scale(1.05);
          }
          75% {
            transform: translateY(-8px) scale(1.1);
          }
          100% {
            transform: translateY(0px) scale(1);
          }
        }

        @keyframes eye-blink {
          0%, 90%, 100% {
            height: 12px;
          }
          95% {
            height: 2px;
          }
        }

        @keyframes pupil-move {
          0%, 100% {
            transform: translate(-50%, -50%);
          }
          50% {
            transform: translate(-30%, -50%);
          }
        }

        @keyframes ear-twitch {
          0%, 90%, 100% {
            transform: rotate(0deg);
          }
          95% {
            transform: rotate(5deg);
          }
        }

        @keyframes foot-tap {
          0%, 90%, 100% {
            transform: translateY(0px);
          }
          95% {
            transform: translateY(-3px);
          }
        }

        @keyframes bubble-appear {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.8);
          }
          20% {
            opacity: 1;
            transform: translateX(-50%) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }

        @keyframes munch-float {
          0% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(0.5);
          }
        }
      `}</style>
    </div>
  );
}
