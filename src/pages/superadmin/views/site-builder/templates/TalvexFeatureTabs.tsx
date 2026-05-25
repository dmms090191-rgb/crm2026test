import { useState } from 'react';
import { Users, UserCheck, User, MessageSquare, Calendar, Globe, Zap } from 'lucide-react';

const TABS = [
  {
    id: 'crm', label: 'CRM', icon: <Users className="w-4 h-4" />,
    title: 'CRM centralisé', color: '#0ea5e9',
    text: 'Suivez vos prospects, vos statuts, vos actions et vos opportunités. Filtrez, triez, commentez et organisez tous vos leads dans un espace clair et structuré.',
    features: ['Statuts personnalisables', 'Filtres avancés', 'Commentaires par lead', 'Export CSV/Excel', 'Colonnes personnalisées'],
  },
  {
    id: 'vendeurs', label: 'Vendeurs', icon: <UserCheck className="w-4 h-4" />,
    title: 'Gestion des vendeurs', color: '#10b981',
    text: 'Attribuez vos leads, suivez les actions commerciales et gardez une vue claire sur la performance de chaque vendeur.',
    features: ['Attribution de leads', 'Suivi des actions', 'Chat admin-vendeur', 'Agenda vendeur', 'Propositions de RDV'],
  },
  {
    id: 'clients', label: 'Clients', icon: <User className="w-4 h-4" />,
    title: 'Espace client', color: '#f59e0b',
    text: 'Offrez un espace simple à vos clients pour leurs messages et rendez-vous. Le client peut échanger, consulter ses propositions et suivre ses demandes.',
    features: ['Messagerie client', 'Propositions de RDV', 'Contre-propositions', 'Agenda client', 'Vue d\'ensemble'],
  },
  {
    id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />,
    title: 'Messagerie intégrée', color: '#06b6d4',
    text: 'Centralisez les conversations entre admin, vendeur et client. Envoyez des fichiers, recevez des notifications et gardez un historique complet.',
    features: ['Chat en temps réel', 'Fichiers et pièces jointes', 'Notifications push', 'Historique complet', 'Multi-conversations'],
  },
  {
    id: 'rdv', label: 'Rendez-vous', icon: <Calendar className="w-4 h-4" />,
    title: 'Gestion des rendez-vous', color: '#8b5cf6',
    text: 'Gérez les propositions, confirmations, agendas et rappels. Les clients peuvent accepter, refuser ou proposer un autre créneau.',
    features: ['Propositions de RDV', 'Confirmations', 'Contre-propositions', 'Agenda visuel', 'Rappels automatiques'],
  },
  {
    id: 'sites', label: 'Sites', icon: <Globe className="w-4 h-4" />,
    title: 'Sites & Templates', color: '#ec4899',
    text: 'Créez un site pour chaque société, avec template et domaine personnalisé. Choisissez parmi des templates sectoriels prêts à l\'emploi.',
    features: ['Templates sectoriels', 'Prévisualisation', 'Domaine personnalisé', 'Slug personnalisé', 'Activation/désactivation'],
  },
  {
    id: 'ia', label: 'IA', icon: <Zap className="w-4 h-4" />,
    title: 'Intelligence artificielle', color: '#0ea5e9',
    text: 'Préparez l\'avenir avec une IA capable d\'aider à qualifier, répondre et automatiser. Configurez le cerveau IA pour chaque société.',
    features: ['Qualification de leads', 'Réponses assistées', 'Cerveau configurable', 'Automatisations futures', 'Analyse intelligente'],
  },
];

export default function TalvexFeatureTabs() {
  const [active, setActive] = useState('crm');
  const tab = TABS.find(t => t.id === active) ?? TABS[0];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-4xl font-bold text-white text-center mb-3">
          Tout gérer au même endroit
        </h2>
        <p className="text-sm sm:text-base text-slate-400 text-center max-w-xl mx-auto mb-10 sm:mb-14">
          Une plateforme modulaire qui couvre tous les besoins de votre entreprise.
        </p>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 sm:mb-12">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all"
              style={{
                background: active === t.id ? `${t.color}15` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active === t.id ? `${t.color}40` : 'rgba(255,255,255,0.06)'}`,
                color: active === t.id ? t.color : 'rgba(255,255,255,0.5)',
              }}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Active tab content */}
        <div
          className="rounded-2xl p-6 sm:p-10 border transition-all"
          style={{
            background: `linear-gradient(135deg, ${tab.color}08, transparent)`,
            borderColor: `${tab.color}20`,
          }}
        >
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${tab.color}15`, border: `1px solid ${tab.color}30` }}
                >
                  <span style={{ color: tab.color }}>{tab.icon}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{tab.title}</h3>
              </div>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{tab.text}</p>
            </div>
            <div className="w-full lg:w-auto lg:min-w-[240px] space-y-2">
              {tab.features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tab.color }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
