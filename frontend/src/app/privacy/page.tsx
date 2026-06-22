import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Plainview",
  description: "Privacy Policy for the Plainview Schedule Analytics platform and mobile app.",
};

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li><strong className="text-white">Account information.</strong> Your work email address and account credentials. Plainview accounts are provisioned by your organization&apos;s administrator — there is no public self-signup.</li>
        <li><strong className="text-white">Authentication tokens.</strong> After you sign in, a session token is stored securely on your device (e.g. iOS Keychain / Android Keystore on mobile) to keep you signed in. This token is not shared with third parties.</li>
        <li><strong className="text-white">Schedule data you upload.</strong> Primavera P6 (.xer) schedule files you upload, and the analytics we compute from them — KPIs, S-Curve data, critical path, float erosion, and milestones.</li>
        <li><strong className="text-white">AI Chat messages.</strong> Questions you send to the AI Chat feature, together with the relevant project/schedule context needed to answer them.</li>
      </ul>
    ),
  },
  {
    title: "2. How We Use Information",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li>To authenticate you and give you access to your organization&apos;s projects.</li>
        <li>To process the schedule files you upload and generate the analytics shown in the app.</li>
        <li>To generate AI-powered answers in the AI Chat feature.</li>
        <li>To provide customer support and maintain the security of the Service.</li>
      </ul>
    ),
  },
  {
    title: "3. Third-Party Service Providers",
    body: (
      <>
        <p className="mb-3">We use the following categories of service providers to operate Plainview:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong className="text-white">OpenAI.</strong> When you use AI Chat, your message and the relevant project/schedule context are sent to OpenAI&apos;s API to generate a response. This data is transmitted under our agreement with OpenAI and is not used by OpenAI to train its models.</li>
          <li><strong className="text-white">Hosting infrastructure.</strong> Your account data and uploaded schedule data are stored on servers we operate or contract with, used solely to provide the Service.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Data Storage & Security",
    body: <p>Data is transmitted between the app and our servers over encrypted (HTTPS) connections. Session tokens are stored in your device&apos;s secure credential storage rather than in plain text. Access to your organization&apos;s data within Plainview is restricted to authorized users in your organization.</p>,
  },
  {
    title: "5. Data Retention",
    body: <p>We retain account and schedule data for as long as your organization&apos;s account remains active, or as needed to provide the Service. You may request deletion of your account data by contacting us using the details below.</p>,
  },
  {
    title: "6. Your Rights",
    body: <p>Depending on your location, you may have the right to request access to, correction of, or deletion of your personal data. To make such a request, contact us using the information in Section 9.</p>,
  },
  {
    title: "7. Children's Privacy",
    body: <p>Plainview is a business tool intended for use by project professionals within our customer organizations. It is not directed at, and we do not knowingly collect information from, children under 13.</p>,
  },
  {
    title: "8. Changes to This Policy",
    body: <p>We may update this Privacy Policy from time to time. Material changes will be reflected by updating the &quot;Effective date&quot; above.</p>,
  },
  {
    title: "9. Contact Us",
    body: (
      <p>
        Questions about this Privacy Policy or your data can be sent to{" "}
        <a href="mailto:support@plainview.works" className="text-blue-400 hover:underline">support@plainview.works</a>.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <a href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white">P</div>
          <span className="font-bold text-lg tracking-tight text-white">Plainview</span>
        </a>
        <a
          href="/"
          className="text-white/50 hover:text-white text-sm font-medium transition-colors"
          style={{ textDecoration: "none" }}
        >
          ← Back to home
        </a>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-12">Effective date: June 22, 2026</p>

        <p className="text-white/60 leading-relaxed mb-10">
          This Privacy Policy explains how Elise Enterprise, LLC (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) collects, uses, and
          protects information in connection with the Plainview mobile application and the Plainview platform at{" "}
          <a href="https://www.plainview.works" className="text-blue-400 hover:underline">plainview.works</a> (together, the
          &quot;Service&quot;). Plainview is a schedule analytics tool for Primavera P6 project data, used by project teams
          within our customer organizations.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10 text-sm text-white/70">
          <strong className="text-white">What we don&apos;t collect:</strong> Plainview does not embed advertising SDKs,
          third-party analytics/tracking SDKs, or request access to your location, contacts, photos, or microphone.
          We do not sell your data.
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title} className="mb-10">
            <h2 className="text-xl font-bold mb-3">{s.title}</h2>
            <div className="text-white/60 leading-relaxed text-[15px]">{s.body}</div>
          </section>
        ))}

        <footer className="border-t border-white/10 pt-6 mt-12 text-white/30 text-xs">
          Elise Enterprise, LLC — Plainview
        </footer>
      </article>
    </main>
  );
}
