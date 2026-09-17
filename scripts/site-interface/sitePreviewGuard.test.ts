// Tests du garde-fou de l'apercu (connexion, inscription et ecritures neutralisees dans l'iframe).
//   node --test scripts/site-interface/sitePreviewGuard.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { neutralizePreviewClient, PREVIEW_ACTION_MESSAGE } from '../../src/lib/sitePreviewGuard.ts';

function fakeClient() {
  const calls: string[] = [];
  const builder = {
    select: () => { calls.push('select'); return Promise.resolve({ data: [{ id: 1 }], error: null }); },
    insert: () => { calls.push('insert'); return Promise.resolve({ data: 'ECRIT', error: null }); },
    update: () => { calls.push('update'); return Promise.resolve({ data: 'ECRIT', error: null }); },
    upsert: () => { calls.push('upsert'); return Promise.resolve({ data: 'ECRIT', error: null }); },
    delete: () => { calls.push('delete'); return Promise.resolve({ data: 'ECRIT', error: null }); },
  };
  const client = {
    auth: {
      stopAutoRefresh: () => { calls.push('stopAutoRefresh'); },
      signInWithPassword: async () => { calls.push('signIn'); return { data: { session: 'REELLE' }, error: null }; },
      signUp: async () => { calls.push('signUp'); return { data: {}, error: null }; },
      updateUser: async () => { calls.push('updateUser'); return { data: {}, error: null }; },
      signOut: async () => { calls.push('signOut'); return { error: null }; },
    } as Record<string, unknown>,
    from: (_table: string) => builder,
    rpc: () => { calls.push('rpc'); return Promise.resolve({ data: 'RPC', error: null }); },
    functions: { invoke: async () => { calls.push('invoke'); return { data: 'FN', error: null }; } },
  };
  return { client, calls };
}

test('connexion, inscription, profil et deconnexion : refuses sans effet', async () => {
  const { client, calls } = fakeClient();
  neutralizePreviewClient(client as never);
  assert.ok(calls.includes('stopAutoRefresh'));
  for (const m of ['signInWithPassword', 'signUp', 'updateUser', 'signOut']) {
    const res = await (client.auth[m] as () => Promise<{ data: { session: unknown }; error: { message: string } }>)();
    assert.equal(res.error.message, PREVIEW_ACTION_MESSAGE);
    assert.equal(res.data.session, null);
  }
  assert.deepEqual(calls.filter(c => ['signIn', 'signUp', 'updateUser', 'signOut'].includes(c)), []);
});

test('ecritures en base, RPC et fonctions : bloquees, meme enchainees', async () => {
  const { client, calls } = fakeClient();
  neutralizePreviewClient(client as never);
  const qb = client.from('registrations') as Record<string, (...a: unknown[]) => unknown>;
  const inserted = await (qb.insert({ email: 'x' }) as { select: () => { single: () => Promise<{ error: { message: string } }> } }).select().single();
  assert.equal(inserted.error.message, PREVIEW_ACTION_MESSAGE);
  for (const m of ['update', 'upsert', 'delete']) {
    const r = await (qb[m]() as Promise<{ data: unknown; error: { message: string } }>);
    assert.equal(r.data, null);
    assert.equal(r.error.message, PREVIEW_ACTION_MESSAGE);
  }
  const rpc = await (client.rpc() as Promise<{ error: { message: string } }>);
  assert.equal(rpc.error.message, PREVIEW_ACTION_MESSAGE);
  const fn = await client.functions.invoke();
  assert.equal((fn as { error: { message: string } }).error.message, PREVIEW_ACTION_MESSAGE);
  assert.deepEqual(calls.filter(c => ['insert', 'update', 'upsert', 'delete', 'rpc', 'invoke'].includes(c)), []);
  // La lecture reste possible (aucune lecture n'est faite par l'apercu, mais rien n'est casse).
  const read = await (qb.select() as Promise<{ data: unknown }>);
  assert.deepEqual(read.data, [{ id: 1 }]);
});
