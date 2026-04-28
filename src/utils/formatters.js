import { isTr } from './i18n';

export function formatDateTime(value) {
  if (!value) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-GB', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      hour12: false
    }).format(new Date(value));
  } catch (error) {
    return '';
  }
}
