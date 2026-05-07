const SAVED_EMAILS_KEY = 'login_saved_emails';

export function getSavedEmails(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_EMAILS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveEmail(email: string) {
  const emails = getSavedEmails();
  const filtered = emails.filter((e) => e !== email);
  filtered.unshift(email);
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(filtered.slice(0, 10)));
}
