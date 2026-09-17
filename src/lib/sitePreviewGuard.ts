/*
 * Garde-fous de l'apercu du site (iframe /site-apercu).
 * L'iframe charge sa PROPRE instance du client Supabase (autre contexte JavaScript) mais partage
 * le stockage de session de l'onglet. Dans l'apercu on neutralise donc, sur cette instance
 * uniquement : connexion, inscription, changement de session et toute ecriture en base.
 * Les boutons des templates restent visibles mais n'ont aucun effet reel.
 * Aucun import : testable avec node --test (scripts/site-interface).
 */

export const PREVIEW_ACTION_MESSAGE = "Action indisponible dans l'aperçu.";

const AUTH_METHODS = [
  'signInWithPassword', 'signInWithOtp', 'signInWithOAuth', 'signInWithIdToken', 'signInAnonymously', 'signUp',
  'updateUser', 'signOut', 'resetPasswordForEmail', 'setSession', 'refreshSession', 'exchangeCodeForSession', 'verifyOtp',
] as const;

const WRITE_METHODS = ['insert', 'update', 'upsert', 'delete'] as const;

function blockedResult() {
  return { data: null, error: { message: PREVIEW_ACTION_MESSAGE, code: 'preview_blocked' } };
}

/* Chaine bloquee : accepte n'importe quel enchainement (.select().single()...) et se resout en erreur. */
export function blockedChain(): unknown {
  const fn = function blocked() { /* chaine bloquee */ };
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(blockedResult()).then(resolve, reject);
      }
      return () => blockedChain();
    },
    apply() { return blockedChain(); },
  });
}

interface ClientLike {
  auth: Record<string, unknown> & { stopAutoRefresh?: () => unknown };
  from: (table: string) => unknown;
  rpc?: (...args: unknown[]) => unknown;
  functions?: { invoke?: (...args: unknown[]) => unknown };
}

export function neutralizePreviewClient(client: ClientLike): void {
  try { void client.auth.stopAutoRefresh?.(); } catch { /* ignore */ }

  for (const method of AUTH_METHODS) {
    client.auth[method] = async () => ({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', status: 400, message: PREVIEW_ACTION_MESSAGE },
    });
  }

  const originalFrom = client.from.bind(client);
  client.from = (table: string) => {
    const builder = originalFrom(table) as Record<string, unknown>;
    for (const method of WRITE_METHODS) builder[method] = () => blockedChain();
    return builder;
  };

  client.rpc = () => blockedChain();
  if (client.functions) client.functions.invoke = async () => blockedResult();
}
