"use client";
import { useState } from "react";

/**
 * Standalone Clarity Logo Intro Animation component.
 *
 * Choreography:
 * 1. Logo mark fades in and draws its strokes in the center at a zoomed-in scale.
 * 2. Logo smoothly zooms out and glides left, towing "Clarity" out in its wake
 *    with a mathematically locked clearance and slightly elevated optical alignment.
 * 3. Subtitle ("Review workspace") settles in underneath.
 */
export function LogoAnimationPreview({
  compact = false,
  onComplete,
}: {
  compact?: boolean;
  onComplete?: () => void;
}) {
  const [playKey] = useState(0);

  return (
    <div
      key={playKey}
      className={`clarity-logo-intro ${compact ? "clarity-logo-intro-compact" : ""}`}
      onAnimationEnd={(e) => {
        if (e.animationName === "claritySubtitleSettle") {
          onComplete?.();
        }
      }}
    >
      <div className="clarity-logo-lockup" aria-label="Clarity Review workspace">
        <div className="clarity-symbol-stage">
          <svg
            className="clarity-symbol-svg"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="clarity-path-left"
              d="M26 8C17 14 9 24 5 32c4 10 12 19 22 25l11-10c-7-5-13-11-16-15 4-8 9.5-15.5 17.5-21.5"
            />
            <path
              className="clarity-path-right"
              d="M38 56c9-6 17-16 21-24-4-10-12-19-22-25L26 17c7 5 13 11 16 15-4 8-9.5 15.5-17.5 21.5"
            />
          </svg>
        </div>

        <div className="clarity-wordmark-mask">
          <div className="clarity-wordmark-inner">
            <span className="clarity-wordmark-title">
              {"Clarity".split("").map((char, idx) => (
                <span
                  key={idx}
                  style={{ animationDelay: `${0.98 + idx * 0.08}s` }}
                >
                  {char}
                </span>
              ))}
            </span>
            <span className="clarity-wordmark-subtitle">
              <i aria-hidden="true" />
              Review workspace
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .clarity-logo-intro {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          padding: 32px;
        }
        .clarity-logo-intro-compact .clarity-logo-lockup {
          transform: scale(0.45);
        }
        .clarity-logo-lockup {
          display: inline-flex;
          align-items: center;
          gap: 20px;
        }
        .clarity-symbol-stage {
          width: 76px;
          height: 76px;
          flex-shrink: 0;
          opacity: 0;
          transform: translate3d(120px, -8px, 0) scale(2.05);
          filter: blur(6px);
          will-change: transform, opacity, filter;
          animation: claritySymbolZoomPull 3s cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }
        .clarity-symbol-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .clarity-symbol-svg path {
          stroke: var(--ink, #17232d);
          stroke-width: 5.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 160;
          stroke-dashoffset: 160;
        }
        .clarity-path-left {
          animation: clarityDrawStroke 1.05s cubic-bezier(0.25, 1, 0.5, 1) 0.06s
            forwards;
        }
        .clarity-path-right {
          animation: clarityDrawStroke 1.05s cubic-bezier(0.25, 1, 0.5, 1) 0.18s
            forwards;
        }
        .clarity-wordmark-mask {
          overflow: hidden;
          padding: 4px 10px 12px 2px;
          transform: translate3d(148.5px, 0, 0);
          clip-path: inset(0 100% 0 0);
          will-change: transform, clip-path;
          animation: clarityPullMask 2.04s cubic-bezier(0.22, 1, 0.36, 1) 0.96s
            forwards;
        }
        .clarity-wordmark-inner {
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translate3d(-20px, 0, 0);
          transform-origin: left center;
          will-change: transform, opacity;
          animation: clarityPullText 2.04s cubic-bezier(0.22, 1, 0.36, 1) 0.96s
            forwards;
        }
        .clarity-wordmark-title {
          display: flex;
          font-size: 68px;
          font-weight: 720;
          line-height: 1.14;
          letter-spacing: -0.055em;
          color: var(--ink, #17232d);
        }
        .clarity-wordmark-title span {
          display: inline-block;
          opacity: 0;
          transform: translate3d(-10px, 0, 0);
          filter: blur(3px);
          will-change: transform, opacity, filter;
          animation: clarityLetterPull 0.85s cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }
        .clarity-wordmark-subtitle {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted, #586978);
          opacity: 0;
          transform: translate3d(0, 6px, 0);
          animation: claritySubtitleSettle 0.85s cubic-bezier(0.22, 1, 0.36, 1)
            1.95s forwards;
        }
        .clarity-wordmark-subtitle i {
          display: inline-block;
          width: 20px;
          height: 1.5px;
          background: var(--accent, #496b86);
        }
        @keyframes claritySymbolZoomPull {
          0% {
            opacity: 0;
            transform: translate3d(120px, -8px, 0) scale(2.05);
            filter: blur(6px);
            animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
          }
          32% {
            opacity: 1;
            transform: translate3d(120px, -8px, 0) scale(1.75);
            filter: blur(0px);
            animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          }
          100% {
            opacity: 1;
            transform: translate3d(0px, -8px, 0) scale(1);
            filter: blur(0px);
          }
        }
        @keyframes clarityDrawStroke {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes clarityPullMask {
          0% {
            transform: translate3d(148.5px, 0, 0);
            clip-path: inset(0 100% 0 0);
          }
          100% {
            transform: translate3d(0px, 0, 0);
            clip-path: inset(0 0% 0 0);
          }
        }
        @keyframes clarityPullText {
          0% {
            opacity: 0;
            transform: translate3d(-20px, 0, 0);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translate3d(0px, 0, 0);
          }
        }
        @keyframes clarityLetterPull {
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0px);
          }
        }
        @keyframes claritySubtitleSettle {
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
