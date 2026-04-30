import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get('BOT_TOKEN');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Require shared-secret header to prevent unauthenticated webhook calls
    if (!WEBHOOK_SECRET) {
      console.error('WEBHOOK_SECRET is not configured');
      return new Response('Server misconfigured', { status: 500 });
    }
    const provided = req.headers.get('x-webhook-secret') ?? '';
    if (!provided || !timingSafeEqual(provided, WEBHOOK_SECRET)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = await req.json();

    if (payload.type !== 'INSERT' || payload.table !== 'tickets') {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const ticket = payload.record;
    const userTelegramId = ticket?.user_telegram_id;
    const ticketId = ticket?.id;

    if (!userTelegramId || !BOT_TOKEN) {
      return new Response(JSON.stringify({ success: true, message: 'Nothing to send' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Idempotency: skip if we already notified for this ticket
    if (supabase && ticketId) {
      const { data: existing, error: lookupError } = await supabase
        .from('webhook_notifications')
        .select('ticket_id')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (lookupError && lookupError.code !== '42P01') {
        console.error('Idempotency lookup failed:', lookupError);
      }
      if (existing) {
        return new Response(JSON.stringify({ success: true, message: 'Already notified' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    const messageText = "Құттықтаймыз! Төлеміңіз қабылданды. Сіздің Premium статусыңыз қосылды";
    const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: userTelegramId, text: messageText }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error(`Telegram API error: ${errorText}`);
      return new Response(`Telegram API error: ${errorText}`, { status: 500 });
    }

    if (supabase && ticketId) {
      const { error: insertError } = await supabase
        .from('webhook_notifications')
        .insert({ ticket_id: ticketId, kind: 'ticket_created' });
      if (insertError && insertError.code !== '42P01') {
        console.error('Idempotency insert failed:', insertError);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Message sent' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
});
