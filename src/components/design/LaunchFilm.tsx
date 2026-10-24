"use client";

import { useRef } from "react";

export function LaunchFilm() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  return (
    <>
      <button
        className="launch-film-trigger"
        onClick={() => dialog.current?.showModal()}
      >
        <span aria-hidden="true">▶</span> Watch launch film
      </button>
      <dialog
        className="launch-film-dialog"
        ref={dialog}
        aria-labelledby="launch-film-title"
        onClose={() => video.current?.pause()}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="launch-film-heading">
          <div>
            <span className="launch-film-label">INTRODUCING CLARITY</span>
            <h2 id="launch-film-title">Every review. A clearer next step.</h2>
          </div>
          <button
            className="launch-film-close"
            aria-label="Close launch film"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <video
          ref={video}
          controls
          playsInline
          preload="none"
          poster="/clarity-launch-poster.jpg"
          aria-label="Clarity launch film: from customer feedback to verified action"
        >
          <source src="/clarity-launch.mp4" type="video/mp4" />
          Your browser does not support video. Download the film below.
        </video>
        <div className="launch-film-footer">
          <p>42 seconds of Clarity. Sound on for the full experience.</p>
          <a href="/clarity-launch.mp4" download="Clarity-Launch.mp4">
            Download film ↓
          </a>
        </div>
      </dialog>
    </>
  );
}
