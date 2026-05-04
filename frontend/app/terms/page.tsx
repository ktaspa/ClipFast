import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service · ClixFair",
  description: "Terms of Service for ClixFair — AI video clipping platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-slate-300">
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            ← Back to ClixFair
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-white">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: May 3, 2025</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ClixFair ("the Service"), you agree to be bound by these Terms of
              Service. If you do not agree, do not use the Service. We reserve the right to update these
              terms at any time; continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Description of Service</h2>
            <p>
              ClixFair is an AI-powered video clipping platform that downloads publicly available YouTube
              videos, transcribes them, identifies viral-worthy moments, and produces short-form clips
              suitable for TikTok, Instagram Reels, and YouTube Shorts.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Eligibility</h2>
            <p>
              You must be at least 13 years old to use the Service. By using ClixFair, you represent that
              you meet this age requirement and that all information you provide is accurate and complete.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Your Content and Copyright</h2>
            <p className="mb-3">
              You are solely responsible for ensuring you have the right to process any video you submit
              to the Service. By submitting a video URL, you represent and warrant that:
            </p>
            <ul className="list-disc space-y-1 pl-6 text-slate-400">
              <li>You own the content or have explicit permission from the copyright holder to clip and redistribute it.</li>
              <li>Processing and republishing the resulting clips does not violate any third-party rights.</li>
              <li>The content does not violate YouTube's Terms of Service or any applicable law.</li>
            </ul>
            <p className="mt-3">
              ClixFair does not claim ownership of clips you generate. All intellectual property rights in
              the output clips belong to you, subject to the rights of the original content creator.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Prohibited Uses</h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc space-y-1 pl-6 text-slate-400">
              <li>Process content you do not have rights to redistribute.</li>
              <li>Produce clips that contain hate speech, harassment, illegal activity, or graphic violence.</li>
              <li>Automate requests in a way that places unreasonable load on our infrastructure.</li>
              <li>Attempt to reverse-engineer, scrape, or abuse the Service's APIs.</li>
              <li>Circumvent any usage limits or authentication mechanisms.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Intellectual Property</h2>
            <p>
              The ClixFair name, logo, website design, and underlying software are the exclusive property
              of ClixFair and are protected by copyright and other intellectual property laws. You may not
              reproduce, distribute, or create derivative works from any part of the Service without our
              prior written consent.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Disclaimers</h2>
            <p>
              The Service is provided <strong className="text-slate-200">"as is"</strong> without
              warranties of any kind, express or implied, including but not limited to merchantability,
              fitness for a particular purpose, or non-infringement. We do not guarantee that the Service
              will be uninterrupted, error-free, or that generated clips will meet your expectations.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, ClixFair shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the
              Service, including lost profits, lost data, or business interruption, even if we have been
              advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time, with or without
              notice, for conduct that we believe violates these Terms or is harmful to other users, us,
              or third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of the State of Texas, United States, without
              regard to its conflict of law provisions. Any disputes shall be resolved exclusively in the
              courts located in Austin, Texas.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">11. Contact</h2>
            <p>
              Questions about these Terms? Email us at{" "}
              <a
                href="mailto:support@clixfair.ai"
                className="text-violet-400 hover:underline"
              >
                support@clixfair.ai
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-white/[0.05] pt-8 text-center text-sm text-slate-600">
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">
            Privacy Policy
          </Link>
          <span className="mx-3">·</span>
          <Link href="/" className="hover:text-slate-400 transition-colors">
            Back to ClixFair
          </Link>
        </div>
      </div>
    </div>
  );
}
