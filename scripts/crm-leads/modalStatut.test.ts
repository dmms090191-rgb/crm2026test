// Releve : le modal « Choisir un statut » est rendu dans document.body, lie a la fenetre.
//   node --import tsx --test scripts/crm-leads/modalStatut.test.ts
//
// La carte du tableau porte un backdrop-filter : un `position: fixed` rendu DANS la ligne
// se rapportait a cette carte (voile de 11 585 px, modal centre des milliers de pixels hors
// de l'ecran). Ce releve garde le rendu par portail et le defilement interne.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const code = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('MS1 le modal de statut est rendu dans document.body, en fixed plein ecran', () => {
  const m = code('src/pages/admin/views/crm/MobileStatutModal.tsx');
  assert.match(m, /return createPortal\(/, 'rendu par portail');
  assert.match(m, /document\.body,\s*\);\s*\}\s*$/, 'dans document.body');
  assert.match(m, /position: 'fixed', inset: 0/, 'voile lie a la fenetre');
  assert.match(m, /maxHeight: 'min\(85vh, calc\(100dvh - 32px\)\)'/, 'hauteur bornee par la fenetre');
  assert.match(m, /overflow-y-auto[^"]*" style=\{\{ overscrollBehavior: 'contain' \}\}/, 'la liste defile dedans');
  assert.match(m, /document\.body\.style\.overflow = 'hidden'/, 'la page derriere ne defile pas');
});

test('MS2 les quatre lignes et cartes (Admin, Commercial) passent par ce modal', () => {
  for (const f of [
    'src/pages/admin/views/crm/CrmTableRow.tsx', 'src/pages/admin/views/crm/CrmMobileLeadCard.tsx',
    'src/pages/vendor/views/leads/VendorLeadDesktopRow.tsx', 'src/pages/vendor/views/leads/VendorLeadMobileCard.tsx',
  ]) assert.match(code(f), /<MobileStatutModal/, f);
});
