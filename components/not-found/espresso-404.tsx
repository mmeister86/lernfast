"use client";

import React, { useState, useEffect } from "react";

/**
 * Espresso404 - Animierte umgefallene Espresso-Tasse für die 404-Seite
 *
 * Eine humorvolle Espresso-Tasse die umgefallen ist und "404" in der Kaffee-Pfütze zeigt.
 * Wiederverwendung des Espresso-Stils mit 404-spezifischen Animationen.
 */
export function Espresso404() {
  const [isSpilling, setIsSpilling] = useState(false);
  const [showThought, setShowThought] = useState(false);
  const [isFallen, setIsFallen] = useState(false);

  useEffect(() => {
    // Tasse fällt sofort beim Load
    setTimeout(() => {
      setIsFallen(true);
    }, 500);

    // Alle 4 Sekunden "verschütten" und Gedanken zeigen
    const interval = setInterval(() => {
      setIsSpilling(true);
      setShowThought(true);

      setTimeout(() => {
        setIsSpilling(false);
      }, 800);

      setTimeout(() => {
        setShowThought(false);
      }, 2500);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const thoughts = [
    "Ups! Verschüttet!",
    "Wo ist die Seite?",
    "404 - Seite nicht gefunden!",
    "Kaffee überall...",
    "Das war ein Missgeschick!",
  ];

  const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="espresso-404-container">
        {/* Umgefallene Tasse */}
        <div className={`espresso-cup ${isFallen ? "fallen" : ""}`}>
          {/* Tasse Körper */}
          <div className="cup-body">
            {/* Tasse Rand */}
            <div className="cup-rim"></div>

            {/* Kaffee in der Tasse */}
            <div className="coffee-in-cup">
              <div className="coffee-surface"></div>
            </div>
          </div>

          {/* Tasse Henkel */}
          <div className="cup-handle"></div>

          {/* 404 Text auf der Tasse */}
          <div className="cup-404-text">404</div>
        </div>

        {/* Verschütteter Kaffee */}
        <div className={`spilled-coffee ${isSpilling ? "spilling" : ""}`}>
          <div className="coffee-puddle">
            <div className="puddle-404">404</div>
          </div>
          <div className="coffee-drops">
            <div className="drop drop-1"></div>
            <div className="drop drop-2"></div>
            <div className="drop drop-3"></div>
          </div>
        </div>

        {/* Dampf */}
        <div className="steam-container">
          <div className="steam steam-1"></div>
          <div className="steam steam-2"></div>
          <div className="steam steam-3"></div>
        </div>

        {/* Gedanken-Bubble */}
        {showThought && (
          <div className="thought-bubble">
            <div className="thought-text">{randomThought}</div>
            <div className="thought-arrow"></div>
          </div>
        )}

        {/* Spill-Effekte */}
        {isSpilling && (
          <>
            <div className="spill-effect spill-effect--1">💧</div>
            <div className="spill-effect spill-effect--2">☕</div>
            <div className="spill-effect spill-effect--3">💦</div>
          </>
        )}
      </div>

      <style jsx>{`
        .espresso-404-container {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          scale: 0.8;
        }

        .espresso-cup {
          position: relative;
          width: 80px;
          height: 60px;
          transition: transform 1s ease-in-out;
          z-index: 3;
        }

        .espresso-cup.fallen {
          transform: rotate(-45deg) translateY(20px);
        }

        /* Tasse Körper */
        .cup-body {
          position: relative;
          width: 60px;
          height: 50px;
          background: #ffffff;
          border: 4px solid #000;
          border-radius: 0 0 30px 30px;
          overflow: hidden;
        }

        .cup-rim {
          position: absolute;
          top: -4px;
          left: -4px;
          width: 60px;
          height: 8px;
          background: #ffffff;
          border: 4px solid #000;
          border-radius: 50%;
        }

        .coffee-in-cup {
          position: absolute;
          top: 5px;
          left: 5px;
          width: 50px;
          height: 35px;
          background: #74372b;
          border-radius: 0 0 25px 25px;
          overflow: hidden;
        }

        .coffee-surface {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 8px;
          background: #8b4513;
          border-radius: 50%;
          animation: coffee-ripple 2s ease-in-out infinite;
        }

        /* Henkel */
        .cup-handle {
          position: absolute;
          top: 10px;
          right: -15px;
          width: 20px;
          height: 30px;
          border: 4px solid #000;
          border-left: none;
          border-radius: 0 20px 20px 0;
          background: transparent;
        }

        /* 404 Text auf Tasse */
        .cup-404-text {
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          font-weight: 800;
          color: #000;
          z-index: 4;
        }

        /* Verschütteter Kaffee */
        .spilled-coffee {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
        }

        .spilled-coffee.spilling {
          opacity: 1;
        }

        .coffee-puddle {
          position: relative;
          width: 120px;
          height: 40px;
          background: #74372b;
          border: 3px solid #000;
          border-radius: 50%;
          animation: puddle-grow 0.8s ease-out forwards;
        }

        .puddle-404 {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 16px;
          font-weight: 800;
          color: #ffc667;
          text-shadow: 2px 2px 0px #000;
        }

        .coffee-drops {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
        }

        .drop {
          position: absolute;
          width: 8px;
          height: 12px;
          background: #74372b;
          border: 2px solid #000;
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          animation: drop-fall 0.8s ease-out forwards;
        }

        .drop-1 {
          left: -15px;
          animation-delay: 0s;
        }

        .drop-2 {
          left: 0px;
          animation-delay: 0.1s;
        }

        .drop-3 {
          left: 15px;
          animation-delay: 0.2s;
        }

        /* Dampf */
        .steam-container {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2;
        }

        .steam {
          position: absolute;
          width: 6px;
          height: 20px;
          background: #b3aeae;
          border-radius: 3px;
          opacity: 0;
          animation: steam-rise 3s ease-in-out infinite;
        }

        .steam-1 {
          left: -10px;
          animation-delay: 0s;
        }

        .steam-2 {
          left: 0px;
          animation-delay: 0.5s;
        }

        .steam-3 {
          left: 10px;
          animation-delay: 1s;
        }

        /* Gedanken-Bubble */
        .thought-bubble {
          position: absolute;
          top: -50px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 4px solid #000;
          border-radius: 15px;
          padding: 8px 12px;
          animation: bubble-appear 2.5s ease-in-out;
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

        /* Spill-Effekte */
        .spill-effect {
          position: absolute;
          font-size: 16px;
          animation: spill-float 0.8s ease-out forwards;
          z-index: 5;
        }

        .spill-effect--1 {
          top: 30px;
          left: 20px;
          animation-delay: 0s;
        }

        .spill-effect--2 {
          top: 40px;
          right: 20px;
          animation-delay: 0.1s;
        }

        .spill-effect--3 {
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          animation-delay: 0.2s;
        }

        /* Animationen */
        @keyframes coffee-ripple {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        @keyframes puddle-grow {
          0% {
            transform: translateX(-50%) scale(0);
            opacity: 0;
          }
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes drop-fall {
          0% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(20px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes steam-rise {
          0% {
            transform: translateY(0px);
            opacity: 0;
          }
          40% {
            opacity: 0.6;
          }
          50% {
            transform: translateY(-10px);
            opacity: 0.4;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-25px);
            opacity: 0;
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

        @keyframes spill-float {
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
