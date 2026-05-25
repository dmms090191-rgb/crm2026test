import { Shield, Users, UserCheck, User, Target, Clock, Zap, TrendingUp, ArrowRight, Layers } from 'lucide-react';

const ROLES = [
  { icon: <Shield className="w-5 h-5" />, title: 'Super Admin', color: '#0ea5e9', desc: 'Le Super Admin garde une vision globale : sociétés clientes, accès, sites, domaines, modules, données, IA et évolution de la plateforme.' },
  { icon: <Users className="w-5 h-5" />, title: 'Admin', color: '#10b981', desc: 'Chaque société dispose de son espace pour gérer ses leads, ses vendeurs, ses messages, ses rendez-vous, ses inscriptions et son site.' },
  { icon: <UserCheck className="w-5 h-5" />, title: 'Vendeur', color: '#f59e0b', desc: 'Les vendeurs suivent leurs prospects, leurs conversations, leurs rendez-vous et leurs actions commerciales.' },
  { icon: <User className="w-5 h-5" />, title: 'Client', color: '#8b5cf6', desc: 'Le client final dispose d\'un espace simple pour échanger, suivre ses rendez-vous et consulter ses propositions.' },
];

const PROMISES = [
  { icon: <Layers className="w-5 h-5" />, title: 'Tout centraliser', color: '#0ea5e9', desc: 'Une seule plateforme pour suivre les prospects, les clients, les vendeurs, les messages, les rendez-vous et les sites.' },
  { icon: <Target className="w-5 h-5" />, title: 'Simplifier le quotidien', color: '#10b981', desc: 'Une interface claire, pensée pour être comprise rapidement par les entreprises locales.' },
  { icon: <Clock className="w-5 h-5" />, title: 'Faire gagner du temps', color: '#f59e0b', desc: 'Moins d\'outils séparés, moins d\'oublis, plus de suivi et une meilleure organisation.' },
  { icon: <Zap className="w-5 h-5" />, title: 'Préparer l\'avenir', color: '#06b6d4', desc: 'Talvex prépare l\'intégration de l\'IA, des automatisations et des sites intelligents pour accompagner la croissance.' },
];

const TIMELINE = [
  { step: '01', label: 'CRM centralisé', color: '#0ea5e9' },
  { step: '02', label: 'Sites et templates', color: '#10b981' },
  { step: '03', label: 'Domaines personnalisés', color: '#f59e0b' },
  { step: '04', label: 'IA d\'assistance', color: '#8b5cf6' },
  { step: '05', label: 'Automatisations intelligentes', color: '#06b6d4' },
  { step: '06', label: 'Évolution continue 24/48h', color: '#ec4899' },
];

export default function TalvexVisionView() {
  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-cyan-500/3" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-6">
            <Target className="w-3.5 h-3.5" />
            Vision Talvex
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Talvex, la plateforme qui centralise{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
              toute l'activité
            </span>{' '}
            d'une entreprise locale
          </h1>
          <p className="text-sm sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Talvex a été créé pour simplifier la gestion des petites entreprises : prospects, clients, vendeurs, rendez-vous, messages, sites internet, domaines, IA et automatisations réunis dans une seule plateforme claire.
          </p>
        </div>
      </section>

      {/* Why Talvex */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-6">Pourquoi Talvex existe</h2>
          <div className="space-y-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            <p>Beaucoup de petites entreprises utilisent trop d'outils séparés : un outil pour les prospects, un autre pour les messages, un autre pour les rendez-vous, un autre pour le site internet, un autre pour les vendeurs. Résultat : les informations se perdent, les clients ne sont pas toujours relancés, les équipes manquent de visibilité et la croissance devient difficile à suivre.</p>
            <p>Talvex a été pensé pour résoudre ce problème. La plateforme rassemble les éléments essentiels d'une entreprise dans un seul espace simple, français, moderne et adapté aux sociétés locales.</p>
            <p className="font-medium text-white/80">Talvex a été créé pour éviter aux petites entreprises de recommencer à zéro à chaque changement.</p>
          </div>
        </div>
      </section>

      {/* Central platform */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-3 text-center">Une plateforme centrale</h2>
          <p className="text-sm sm:text-base text-slate-400 text-center max-w-2xl mx-auto mb-10">
            Depuis le Super Admin, Talvex permet de gérer plusieurs sociétés clientes dans une seule plateforme. Chaque société peut avoir son propre espace Admin, ses vendeurs, ses clients, ses leads, ses rendez-vous, ses messages et son site internet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLES.map((r, i) => (
              <div key={i} className="rounded-2xl p-5 sm:p-6 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${r.color}12`, border: `1px solid ${r.color}25` }}>
                    <span style={{ color: r.color }}>{r.icon}</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{r.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promise */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-10 text-center">La promesse Talvex</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROMISES.map((p, i) => (
              <div key={i} className="rounded-2xl p-5 sm:p-6 border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${p.color}12`, border: `1px solid ${p.color}25` }}>
                  <span style={{ color: p.color }}>{p.icon}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-2">{p.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What makes Talvex different */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-6">Ce qui rend Talvex différent</h2>
          <div className="space-y-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            <p>Talvex est pensé comme une base évolutive. La plateforme ne se limite pas à gérer des clients : elle peut évoluer avec les besoins de chaque société. Site internet, domaine, CRM, vendeurs, messages, rendez-vous, IA, automatisations, demandes d'amélioration et suivi des données peuvent être connectés progressivement.</p>
            <p>Une entreprise évolue : ses services changent, son site change, ses besoins changent. Talvex doit pouvoir suivre cette évolution.</p>
            <p className="font-medium text-white/80">L'objectif n'est pas seulement de donner un CRM, mais d'offrir une base centrale qui accompagne la société dans sa croissance.</p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-10 text-center">Feuille de route</h2>
          <div className="relative">
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-sky-500/30 via-cyan-500/20 to-transparent" />
            <div className="space-y-6">
              {TIMELINE.map((t, i) => (
                <div key={i} className="flex items-start gap-4 sm:gap-6 relative">
                  <div
                    className="relative z-10 w-12 sm:w-16 h-12 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-bold text-white"
                    style={{ background: `${t.color}15`, border: `1px solid ${t.color}30` }}
                  >
                    {t.step}
                  </div>
                  <div className="pt-3 sm:pt-4">
                    <h3 className="text-sm sm:text-base font-bold text-white">{t.label}</h3>
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <ArrowRight className="absolute left-[22px] sm:left-[30px] top-14 sm:top-[68px] w-3 h-3 text-white/10 rotate-90" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto rounded-2xl p-8 sm:p-12 text-center border border-sky-500/20" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(6,182,212,0.04))' }}>
          <TrendingUp className="w-8 h-8 text-sky-400 mx-auto mb-4" />
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Votre activité évolue ? Talvex évolue avec vous.
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Talvex ne vous donne pas seulement un logiciel. Talvex vous donne une base pour lancer, gérer et faire évoluer votre entreprise.
          </p>
        </div>
      </section>
    </div>
  );
}
