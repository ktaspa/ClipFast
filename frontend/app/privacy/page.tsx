import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · ClixFair",
  description: "Privacy Policy for ClixFair — AI video clipping platform.",
};

export default function PrivacyPage() {
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
          <h1 className="mt-6 text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: May 3, 2025</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Overview</h2>
            <p>
              ClixFair ("we", "us", "our") is committed to protecting your privacy. This policy explains
              what data we collect when you use ClixFair, how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Information We Collect</h2>

            <h3 className="mb-2 mt-4 font-medium text-slate-200">Account information</h3>
            <p>
              When you sign up, we collect your email address and any profile information provided through
              your authentication provider (Google or email/password via Firebase Authentication).
            </p>

            <h3 className="mb-2 mt-4 font-medium text-slate-200">Video processing data</h3>
            <p>
              When you submit a YouTube URL, we temporarily download the video to our servers for
              processing. The video file, its transcript, and the generated clips are stored on our
              servers and associated with your account. We do not sell or share this content.
            </p>

            <h3 className="mb-2 mt-4 font-medium text-slate-200">Usage data</h3>
            <p>
              We collect standard server logs including IP addresses, request timestamps, and HTTP status
              codes. This data is used for debugging and security purposes and is not linked to your
              identity for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-6 text-slate-400">
              <li>To provide, operate, and improve the Service.</li>
              <li>To process videos and generate clips associated with your account.</li>
              <li>To send transactional emails (e.g., clip-ready notifications) if you opt in.</li>
              <li>To detect and prevent abuse or fraudulent activity.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data to third parties. We do not use your content to train AI
              models.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Third-Party Services</h2>
            <p className="mb-3">
              ClixFair uses the following third-party services to operate. Each has its own privacy policy:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-slate-400">
              <li>
                <strong className="text-slate-300">Firebase (Google)</strong> — Authentication and user
                identity management.
              </li>
              <li>
                <strong className="text-slate-300">AssemblyAI</strong> — Audio transcription. Your video
                audio is sent to AssemblyAI for transcription. See their privacy policy at
                assemblyai.com/privacy.
              </li>
              <li>
                <strong className="text-slate-300">Google Gemini</strong> — AI analysis to identify viral
                clip moments. Transcript text is sent to Google's Gemini API. See Google's privacy policy
                at policies.google.com/privacy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Data Retention</h2>
            <p>
              Processed videos and clips are stored on our servers while your account is active. You can
              delete individual jobs from your dashboard at any time, which permanently removes the
              associated video and clip files. If you close your account, we will delete your data within
              30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Cookies</h2>
            <p>
              We use only essential cookies required for authentication (Firebase session tokens stored in
              your browser). We do not use tracking or advertising cookies. No third-party ad networks
              have access to your data.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Data Security</h2>
            <p>
              We use HTTPS for all data in transit. Your account is protected by Firebase Authentication.
              While we take reasonable measures to protect your data, no system is 100% secure and we
              cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc space-y-1 pl-6 text-slate-400">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Object to or restrict certain processing activities.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:support@clixfair.ai" className="text-violet-400 hover:underline">
                support@clixfair.ai
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Children's Privacy</h2>
            <p>
              ClixFair is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If you believe a child has provided us with personal
              data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by updating the "last updated" date at the top of this page. Continued use of the
              Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">11. Contact</h2>
            <p>
              Questions or concerns about this Privacy Policy? Reach us at{" "}
              <a href="mailto:support@clixfair.ai" className="text-violet-400 hover:underline">
                support@clixfair.ai
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-white/[0.05] pt-8 text-center text-sm text-slate-600">
          <Link href="/terms" className="hover:text-slate-400 transition-colors">
            Terms of Service
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
