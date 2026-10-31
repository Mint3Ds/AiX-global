"use client";
import { useEffect, useState, useRef, useCallback } from "react";

interface BrandLoadingScreenProps {
  isDataReady: boolean;
  error?: string | null;
  onRetry?: () => void;
  onComplete: () => void;
  minDurationMs?: number;
}

/**
 * Brand Loading Screen for Clarity.
 * Displays the signature logo fade-in, stroke draw, zoom-out, and wordmark pull animation
 * when the website loads, and transitions seamlessly into the workspace.
 */
export function BrandLoadingScreen({
  isDataReady,
  error = null,
  onRetry,
  onComplete,
  minDurationMs = 2800,
}: BrandLoadingScreenProps) {
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);

  const finishAndExit = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsExiting(true);
    const exitTimer = setTimeout(() => {
      onComplete();
    }, 480);
    return () => clearTimeout(exitTimer);
  }, [onComplete]);

  // Set animationFinished after minDurationMs so the full intro is appreciated
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationFinished(true);
    }, minDurationMs);
    return () => clearTimeout(timer);
  }, [minDurationMs]);

  // When animation has finished AND backend data is ready (and no blocking error), smoothly exit
  useEffect(() => {
    if (animationFinished && isDataReady && !error) {
      finishAndExit();
    }
  }, [animationFinished, isDataReady, error, finishAndExit]);

  // Keyboard shortcut to quickly skip if in a rush
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Escape" || e.key === "Enter") {
        if (isDataReady && !error) {
          finishAndExit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDataReady, error, finishAndExit]);

  return (
    <div
      className={`brand-loading-screen ${isExiting ? "is-exiting" : ""}`}
      role="status"
      aria-label="Loading Clarity review workspace"
      aria-live="polite"
    >
      <div className="brand-loading-backdrop" aria-hidden="true" />
      <div className="brand-loading-halo" aria-hidden="true" />

      <div className="brand-loading-lockup">
        <div className="brand-loading-symbol-wrap">
          <svg
            className="brand-loading-svg"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              className="path-left"
              d="M26 8C17 14 9 24 5 32c4 10 12 19 22 25l11-10c-7-5-13-11-16-15 4-8 9.5-15.5 17.5-21.5"
            />
            <path
              className="path-right"
              d="M38 56c9-6 17-16 21-24-4-10-12-19-22-25L26 17c7 5 13 11 16 15-4 8-9.5 15.5-17.5 21.5"
            />
          </svg>
        </div>

        <div className="brand-loading-wordmark-mask">
          <div className="brand-loading-wordmark-track">
            <div className="brand-loading-title" aria-label="Clarity">
              <span>C</span>
              <span>l</span>
              <span>a</span>
              <span>r</span>
              <span>i</span>
              <span>t</span>
              <span>y</span>
            </div>
            <div className="brand-loading-sub">
              <span className="brand-loading-sub-line" aria-hidden="true" />
              <span className="brand-loading-sub-text">Review workspace</span>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="brand-loading-error" role="alert">
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              className="brand-loading-retry-btn"
              onClick={onRetry}
            >
              Retry load
            </button>
          )}
        </div>
      ) : (
        <div className="brand-loading-meta">
          <span>
            {isDataReady ? "Workspace ready" : "Loading workspace…"}
          </span>
          {isDataReady && (
            <button
              type="button"
              className="brand-loading-skip-btn"
              onClick={finishAndExit}
            >
              Enter workspace →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

