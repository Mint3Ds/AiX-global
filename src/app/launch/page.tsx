import type { Metadata } from "next";
import Link from "next/link";
import { BrandIdentity } from "@/components/design/BrandIdentity";

export const metadata: Metadata = {
  title: "Introducing Clarity | Launch film",
  description:
    "Every review. A clearer next step. Watch the Clarity launch film.",
};

export default function LaunchPage() {
  return (
    <main className="launch-page">
      <header className="launch-page-header">
        <Link href="/" className="brand-lockup launch-page-brand">
          <BrandIdentity />
        </Link>
        <Link href="/" className="launch-page-back">
          Open workspace
        </Link>
      </header>
      <section className="launch-page-intro">
        <p className="eyebrow">00 / The Clarity launch film</p>
        <h1>
          Every review.<span> A clearer next step.</span>
        </h1>
        <p className="page-description">
          Turn customer feedback into clear priorities, accountable work, and
          thoughtful responses.
        </p>
      </section>
      <video
        className="launch-page-video"
        controls
        playsInline
        preload="metadata"
        poster="/clarity-launch-poster.jpg"
        aria-label="Clarity launch film: from customer feedback to verified action"
      >
        <source src="/clarity-launch.mp4" type="video/mp4" />
        Your browser does not support video. Download the film below.
      </video>
      <div className="launch-film-footer">
        <p>42 seconds · Original soundtrack · Synthetic demo</p>
        <a href="/clarity-launch.mp4" download="Clarity-Launch.mp4">
          Download the MP4
        </a>
      </div>
    </main>
  );
}
