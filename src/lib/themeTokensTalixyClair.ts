import type { ThemeTokens } from './themeTokensTypes';
import type { TalixyClairPalette } from '../talixy/talixyPaletteClair';

/*
 * TALIXY « Gris bleuté » — tokens construits depuis la palette mesurée sur la maquette.
 *
 * Principes de la maquette :
 *   - AUCUN trait de séparation : coquilles (sidebar, barre du haut) transparentes et sans bordure ;
 *   - le fond vignetté est peint par une couche dédiée (TalixyBackdrop) : main.bg est transparent ;
 *   - les cartes sont à peine plus claires que le fond (1,19:1 mesuré) : c'est le liseré fin qui
 *     les dessine ; ombre très douce, jamais de gros contraste ;
 *   - texte sombre sur les zones claires, texte lumineux sur les zones sombres du vignettage.
 *
 * Contrainte dure : surface.primary, surface.secondary, accent.text, text.quaternary,
 * topbar.notifPillBg, sidebar.divider et chat.listBg sont concaténés `${token}NN` dans
 * l'application : ils DOIVENT rester des hexadécimaux 6 chiffres.
 */

export function talixyClairAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function buildTalixyClairTokens(p: TalixyClairPalette): ThemeTokens {
  const a = talixyClairAlpha;
  return {
    sidebar: {
      bg: 'transparent',
      border: 'transparent',
      logoText: p.pure,
      logoSub: p.lumenSoft,
      sectionTitle: p.lumenMuted,
      itemText: p.lumenSoft,
      itemTextHover: p.pure,
      itemIcon: p.inkSoft,
      itemIconHover: p.inkDeep,
      activeItemBg: 'transparent',
      activeItemShadow: 'none',
      activeItemText: p.pure,
      activeItemIcon: p.inkDeep,
      activeItemDot: p.pure,
      divider: p.inkFaint,
      logoutText: p.lumenMuted,
      logoutHover: '#FFCDD8',
      collapseText: p.lumenMuted,
      collapseHover: p.pure,
    },
    topbar: {
      bg: 'transparent',
      border: 'transparent',
      breadcrumbPrefix: p.lumenMuted,
      breadcrumbText: p.pure,
      notifPillBg: '#C9D3E0',
      notifPillBorder: a(p.pure, 0.5),
      notifIcon: p.inkSoft,
      notifIconHover: p.inkDeep,
      notifLabel: p.inkSoft,
      notifLabelHover: p.inkDeep,
      notifDivider: 'transparent',
      profileBtnBg: a(p.pure, 0.12),
      profileBtnBgOpen: a(p.pure, 0.26),
      profileBtnBgHover: a(p.pure, 0.18),
      profileBtnBorder: a(p.pure, 0.35),
      profileName: p.pure,
      profileRole: p.lumenSoft,
      chevron: p.lumenMuted,
    },
    dropdown: {
      bg: '#F0F4FA',
      border: a(p.ink, 0.08),
      shadow: '0 18px 50px rgba(30,40,60,0.18)',
      itemText: p.inkSoft,
      itemTextHover: p.inkDeep,
      itemBgHover: a(p.steel, 0.08),
      activeCheck: p.steel,
    },
    main: { bg: 'transparent' },
    card: {
      bg: a(p.pure, 0.16),
      border: a(p.pure, 0.45),
      shadow: '0 15px 50px rgba(30,40,60,0.08)',
    },
    heading: { primary: p.inkDeep, secondary: p.inkSoft, tertiary: p.inkMuted },
    label: { text: p.inkSoft, muted: p.inkMuted, hint: p.inkFaint },
    input: {
      bg: a(p.pure, 0.55),
      border: a(p.ink, 0.15),
      borderFocus: p.steel,
      text: p.ink,
      placeholder: p.inkMuted,
    },
    badge: {
      liveBg: a(p.success, 0.12),
      liveBorder: a(p.success, 0.35),
      liveText: p.success,
    },
    stat: { valuePrimary: p.inkDeep, glowOpacity: 0.15 },
    button: {
      toggleBg: a(p.pure, 0.4),
      toggleText: p.inkSoft,
      toggleBorder: a(p.ink, 0.15),
    },
    pin: {
      bg: a(p.pure, 0.5),
      bgFilled: a(p.pure, 0.85),
      border: a(p.ink, 0.18),
      borderFilled: p.steel,
      borderFocus: p.steel,
      text: p.ink,
    },
    table: {
      headerBg: a(p.pure, 0.35),
      headerText: p.inkSoft,
      headerBorder: a(p.ink, 0.1),
      rowBorder: a(p.ink, 0.07),
      rowHover: a(p.pure, 0.35),
      rowSelected: a(p.steel, 0.1),
      cellText: p.ink,
      cellTextMuted: p.inkMuted,
      cellIcon: p.inkMuted,
      colSep: a(p.ink, 0.06),
      footerBg: a(p.pure, 0.3),
      footerText: p.inkMuted,
      indexText: p.inkFaint,
    },
    modal: {
      overlayBg: 'rgba(31,41,55,0.40)',
      bg: '#EFF3FA',
      border: a(p.pure, 0.6),
      shadow: '0 30px 90px rgba(20,28,39,0.25)',
      closeBtnBg: a(p.ink, 0.06),
      closeBtnText: p.inkMuted,
      closeBtnHoverBg: a(p.ink, 0.12),
      closeBtnHoverText: p.inkDeep,
      title: p.inkDeep,
      subtitle: p.inkMuted,
      fieldBg: a(p.pure, 0.6),
      fieldBorder: a(p.ink, 0.12),
      fieldLabel: p.inkMuted,
      fieldValue: p.ink,
    },
    tab: {
      bg: a(p.pure, 0.25),
      border: a(p.ink, 0.08),
      inactiveText: p.inkMuted,
      inactiveTextHover: p.inkSoft,
      inactiveIcon: p.inkFaint,
      activeText: p.inkDeep,
      activeIcon: p.steel,
      activeBg: a(p.pure, 0.7),
      activeBorder: a(p.pure, 0.9),
      sectionLabel: p.inkFaint,
      divider: a(p.ink, 0.06),
    },
    chat: {
      bg: a(p.pure, 0.2),
      border: a(p.ink, 0.08),
      listBg: '#DEE5EF',
      listItemHover: a(p.pure, 0.5),
      listItemActive: a(p.steel, 0.1),
      listItemText: p.ink,
      listItemSub: p.inkMuted,
      messageBubbleOwn: p.steel,
      messageBubbleOther: a(p.pure, 0.75),
      messageTextOwn: p.white,
      messageTextOther: p.ink,
      inputBg: a(p.pure, 0.6),
      inputBorder: a(p.ink, 0.12),
      inputText: p.ink,
      emptyText: p.inkMuted,
      timestamp: p.inkFaint,
      contactAvatarBg: '#C9D6E6',
      contactAvatarText: p.steel,
    },
    agenda: {
      bg: a(p.pure, 0.2),
      border: a(p.ink, 0.08),
      dayHeaderBg: a(p.pure, 0.4),
      dayHeaderText: p.inkSoft,
      dayNumber: p.inkMuted,
      dayNumberToday: p.white,
      dayNumberTodayBg: p.steel,
      slotBorder: a(p.ink, 0.06),
      slotText: p.inkMuted,
      eventBg: a(p.steel, 0.12),
      eventBorder: a(p.steel, 0.3),
      eventText: p.steelDeep,
      navBtnBg: a(p.pure, 0.4),
      navBtnText: p.inkSoft,
      navBtnHover: a(p.pure, 0.7),
    },
    text: {
      primary: p.ink,
      secondary: p.inkSoft,
      tertiary: p.inkMuted,
      quaternary: p.inkFaint,
      inverse: p.white,
      link: '#2E5E8C',
      linkHover: '#1F4568',
    },
    surface: {
      primary: '#E4EAF3',
      secondary: p.card,
      tertiary: a(p.pure, 0.35),
      hover: a(p.pure, 0.45),
      selected: a(p.steel, 0.1),
      overlay: 'rgba(31,41,55,0.40)',
      border: a(p.ink, 0.1),
      borderLight: a(p.pure, 0.45),
    },
    accent: {
      bg: a(p.ice, 0.5),
      bgHover: a(p.ice, 0.75),
      border: a(p.steel, 0.28),
      text: p.steel,
      solid: p.steel,
    },
    danger: { bg: a(p.danger, 0.1), border: a(p.danger, 0.3), text: p.danger },
    success: { bg: a(p.success, 0.1), border: a(p.success, 0.3), text: p.success },
    warning: { bg: a(p.warning, 0.12), border: a(p.warning, 0.32), text: p.warning },
    selectBg: '#EFF3FA',
  };
}
