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

        <h2 className="pt-4 text-base font-semibold">Your choices</h2>
        <p>
          You can request export or deletion of your data via the in-app feedback form. Deletion is
          irreversible: your progress, balances, and tickets will be erased.
        </p>

        <h2 className="pt-4 text-base font-semibold">Changes</h2>
        <p>
          We will update this page if practices change. The “Last updated” date reflects the latest
          revision.
        </p>
      </main>
    </div>
  );
};

export default Privacy;
