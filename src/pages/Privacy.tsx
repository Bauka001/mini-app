import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy = () => {
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
        <h1 className="text-lg font-semibold">Privacy Policy</h1>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 text-sm leading-relaxed text-[var(--color-text)]/85">
        <p>Last updated: 2026-04-30.</p>

        <h2 className="pt-4 text-base font-semibold">What we collect</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Telegram identity</strong>: numeric user id, first/last name, username, and photo
            URL — provided by Telegram via the WebApp <code>initData</code> handshake.
          </li>
          <li>
            <strong>Game state</strong>: scores, coins/gems/XP, equipped skin, completed quests, and
            the timestamps that drive streaks and daily quests.
          </li>
          <li>
            <strong>Optional feedback</strong>: text and image you submit through the in-app feedback
            form.
          </li>
          <li>
            <strong>Operational logs</strong>: rate-limit counters keyed on IP, audit logs of
            moderator/admin actions, and error reports — kept only as long as needed to investigate
            abuse and incidents.
          </li>
        </ul>

        <h2 className="pt-4 text-base font-semibold">What we do NOT collect</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Your phone number, email, or contacts.</li>
          <li>Payment instrument data — Telegram Stars and TON wallets handle payments directly.</li>
          <li>Location, microphone, or camera input.</li>
        </ul>

        <h2 className="pt-4 text-base font-semibold">How we use it</h2>
        <p>
          To run the game, sync progress across devices via Supabase, prevent abuse, and reply to
          support requests. We never sell your data.
        </p>

        <h2 className="pt-4 text-base font-semibold">Storage &amp; retention</h2>
        <p>
          Game state lives in Supabase (Postgres) under your Telegram id. Backups follow the provider’s
          standard retention. Feedback and audit logs are kept for up to 24 months unless we’re
          required to retain them longer for safety reasons.
        </p>

        <h2 className="pt-4 text-base font-semibold">Third parties</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Supabase — database &amp; realtime sync.</li>
          <li>Telegram — identity, in-app payments (Stars), notifications.</li>
          <li>TON Connect &amp; the wallet you choose — for on-chain payments.</li>
          <li>Vercel — static hosting and edge delivery.</li>
        </ul>

        <h2 className="pt-4 text-base font-semibold">Your rights under the GDPR</h2>
        <p>
          If the GDPR applies to you, you have the following rights with respect to the personal
          data we hold about you. To exercise any of them, contact us using the support channels
          below — we will respond within one calendar month.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Access</strong>: ask us for a copy of your data.
          </li>
          <li>
            <strong>Rectification</strong>: ask us to correct data that is inaccurate or
            incomplete.
          </li>
          <li>
            <strong>Erasure</strong>: ask us to delete your data (your progress, balances, and
            membership records will be permanently removed).
          </li>
          <li>
            <strong>Restriction</strong>: ask us to pause processing while a dispute is resolved.
          </li>
          <li>
            <strong>Portability</strong>: receive your data in a structured, machine-readable
            format.
          </li>
          <li>
            <strong>Objection</strong>: object to processing based on our legitimate interests.
          </li>
          <li>
            <strong>Complaint</strong>: lodge a complaint with your local data protection
            supervisory authority. You can find the relevant contacts at{' '}
            <a
              href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              edpb.europa.eu
            </a>
            .
          </li>
        </ul>
        <p>
          The legal basis for processing is your consent (collected on first launch and re-asked
          when our policies change), the performance of our agreement with you (Terms of Use), and
          our legitimate interest in preventing fraud and abuse.
        </p>

        <h2 className="pt-4 text-base font-semibold">Your choices</h2>
        <p>
          You can request export or deletion of your data via the support channels listed below.
          Deletion is irreversible: your progress, balances, and membership records will be erased.
        </p>

        <h2 className="pt-4 text-base font-semibold">Contact &amp; support</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Email:{' '}
            <a href="mailto:support@focus-game-nine.vercel.app" className="underline">
              support@focus-game-nine.vercel.app
            </a>
          </li>
          <li>
            Telegram:{' '}
            <a
              href="https://t.me/Focus_game_bot"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              @Focus_game_bot
            </a>{' '}
            (start a chat and write to support)
          </li>
          <li>In-app: Settings → Feedback</li>
        </ul>

        <h2 className="pt-4 text-base font-semibold">Changes</h2>
        <p>
          We will update this page if practices change. The “Last updated” date reflects the latest
          revision. If a change materially affects how we process your data, we will re-prompt you
          for consent on next launch.
        </p>
      </main>
    </div>
  );
};

export default Privacy;
