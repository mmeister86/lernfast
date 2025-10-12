"use client";

import React from "react";

/**
 * BrainLoader - Humorvoller neobrutalistische Loader
 *
 * Ein Gehirn das "denkt" und verschiedene lustige Zustände durchläuft.
 * Perfekt für KI-Generierung mit humorvollen Sprüchen.
 */
export function BrainLoader() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="brain-container">
        {/* Gehirn */}
        <div className="brain">
          <div className="brain-lobe brain-lobe--left"></div>
          <div className="brain-lobe brain-lobe--right"></div>
          <div className="brain-lobe brain-lobe--center"></div>

          {/* Denk-Blinken */}
          <div className="brain-spark brain-spark--1">💡</div>
          <div className="brain-spark brain-spark--2">⚡</div>
          <div className="brain-spark brain-spark--3">✨</div>
          <div className="brain-spark brain-spark--4">🔥</div>
        </div>

        {/* Gedanken-Bubbles */}
        <div className="thought-bubble thought-bubble--1">?</div>
        <div className="thought-bubble thought-bubble--2">!</div>
        <div className="thought-bubble thought-bubble--3">...</div>
      </div>

      <style jsx>{`
        .brain-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brain {
          position: relative;
          width: 80px;
          height: 60px;
          animation: brain-pulse 2s ease-in-out infinite;
        }

        .brain-lobe {
          position: absolute;
          background: #ffc667;
          border: 4px solid #000;
          border-radius: 50%;
          animation: lobe-bounce 1.5s ease-in-out infinite;
        }

        .brain-lobe--left {
          width: 35px;
          height: 45px;
          top: 5px;
          left: 5px;
          animation-delay: 0s;
        }

        .brain-lobe--right {
          width: 35px;
          height: 45px;
          top: 5px;
          right: 5px;
          animation-delay: 0.5s;
        }

        .brain-lobe--center {
          width: 25px;
          height: 35px;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          animation-delay: 0.25s;
        }

        .brain-spark {
          position: absolute;
          font-size: 16px;
          animation: spark-float 1s ease-in-out infinite;
        }

        .brain-spark--1 {
          top: -10px;
          left: 20px;
          animation-delay: 0s;
        }

        .brain-spark--2 {
          top: 10px;
          right: -15px;
          animation-delay: 0.25s;
        }

        .brain-spark--3 {
          bottom: -5px;
          left: 10px;
          animation-delay: 0.5s;
        }

        .brain-spark--4 {
          bottom: -5px;
          right: 10px;
          animation-delay: 0.75s;
        }

        .thought-bubble {
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border: 3px solid #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          animation: bubble-float 2s ease-in-out infinite;
        }

        .thought-bubble--1 {
          top: -25px;
          left: 30px;
          animation-delay: 0s;
        }

        .thought-bubble--2 {
          top: 20px;
          right: -30px;
          animation-delay: 0.7s;
        }

        .thought-bubble--3 {
          bottom: -25px;
          left: 40px;
          animation-delay: 1.4s;
        }

        @keyframes brain-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes lobe-bounce {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes spark-float {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes bubble-float {
          0%,
          100% {
            transform: translateY(0px) scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-8px) scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Export als HamsterSpinner für Rückwärtskompatibilität
export { BrainLoader as HamsterSpinner };
