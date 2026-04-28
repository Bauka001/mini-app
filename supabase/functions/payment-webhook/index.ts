import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const BOT_TOKEN = Deno.env.get('BOT_TOKEN');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

serve(async (req) => {
  try {
    // Check for secret header for security
    const signature = req.headers.get('x-webhook-signature');
    
    if (!WEBHOOK_SECRET || signature !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if request is a POST (webhook payload from Supabase)
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const payload = await req.json();

    // Ensure it's an insert event for the tickets table
    if (payload.type === 'INSERT' && payload.table === 'tickets') {
      const ticket = payload.record;
      const userTelegramId = ticket.user_telegram_id;

      if (userTelegramId && BOT_TOKEN) {
        const messageText = "Құттықтаймыз! Төлеміңіз қабылданды. Сіздің Premium статусыңыз қосылды";
        
        // Send message via Telegram Bot API
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: userTelegramId,
            text: messageText,
          }),
        });

        if (!telegramResponse.ok) {
          const errorText = await telegramResponse.text();
          console.error(`Telegram API error: ${errorText}`);
          return new Response(`Telegram API error: ${errorText}`, { status: 500 });
        }

        return new Response(JSON.stringify({ success: true, message: 'Message sent' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});