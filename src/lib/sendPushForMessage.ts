import { supabase } from './supabase';

interface PushMessageParams {
  targetUserId: string;
  title: string;
  body: string;
  url?: string;
}

export async function sendPushForMessage({ targetUserId, title, body, url = '/' }: PushMessageParams): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'message',
          target_user_id: targetUserId,
          title,
          body,
          url,
          tag: `talvex-msg-${targetUserId}`,
        }),
      },
    );
  } catch {
    // push notification is best-effort, never block the chat flow
  }
}
