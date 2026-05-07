export interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  status: 'pending' | 'accepted' | 'refused';
  registered_at: string;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
