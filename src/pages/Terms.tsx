import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[var(--color-background)]/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="rounded-full p-2 hover:bg-white/5"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">Terms of Use</h1>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 text-sm leading-relaxed text-[var(--color-text)]/85">
        <p>Last updated: 2026-04-30.</p>

        <h2 className="pt-4 text-base font-semibold">1. Eligibility</h2>
        <p>
          You may use Focus only if you have a valid Telegram account and are at least 13 years old (or
          the minimum age in your country). The mini app is provided as-is for entertainment and
          self-improvement.
        </p>

        <h2 className="pt-4 text-base font-semibold">2. Account &amp; identity</h2>
        <p>
          We identify you by your Telegram user id. You are responsible for activity performed under
          that account. We may suspend access if we suspect abuse, automation, or attempts to bypass
          rate limits or anti-fraud protections.
        </p>

        <h2 className="pt-4 text-base font-semibold">3. Purchases &amp; in-app currency</h2>
        <p>
          In-app currency (coins, gems, tickets) has no real-world value, is non-refundable except where
          required by law, and is non-transferable. Premium plans renew per the option you select at
          checkout. Telegram Stars and TON payments are processed by Telegram and the connected wallet
          respectively; we do not store payment instruments.
        </p>

        <h2 className="pt-4 text-base font-semibold">4. Acceptable use</h2>
        <p>
          Do not attempt to interfere with the service, exploit bugs to gain rewards, share account
          access, or use third-party tools to automate gameplay. We reserve the right to revert
          ill-gotten balances and ban offenders.
        </p>

        <h2 className="pt-4 text-base font-semibold">5. Disclaimer</h2>
        <p>
          Focus is provided “as is” without warranties. We do not guarantee uninterrupted availability
          or that the service is free of defects. To the maximum extent permitted by law, we are not
          liable for indirect or consequential damages.
        </p>

        <h2 className="pt-4 text-base font-semibold">6. Changes</h2>
        <p>
          We may update these terms; the “Last updated” date will reflect the change. Continued use
          after the update constitutes acceptance.
        </p>

        <h2 className="pt-4 text-base font-semibold">7. Contact</h2>
        <p>Questions? Use the in-app feedback form (Settings → Feedback).</p>
      </main>
    </div>
  );
};

export default Terms;
