import { Heart, Users, Gem } from 'lucide-react';

const CARDS = [
  {
    icon: <Gem className="w-6 h-6" />,
    title: 'Bien-etre',
    desc: 'Retrouver energie et equilibre au quotidien grace a un accompagnement adapte a vos besoins.',
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Accompagnement',
    desc: 'Un suivi personnalise et motivant pour atteindre vos objectifs pas a pas.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Opportunite',
    desc: 'Developper une activite independante au sein d\'une equipe bienveillante et motivante.',
  },
];

const AUDIENCE = [
  'Femmes souhaitant retrouver la forme',
  'Femmes cherchant un accompagnement personnalise',
  'Femmes voulant gagner un revenu complementaire',
  'Femmes souhaitant rejoindre une equipe dynamique',
];

export { CARDS, AUDIENCE };
