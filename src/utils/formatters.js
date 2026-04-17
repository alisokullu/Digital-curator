export function formatDateTime(value) {
  if (!value) {
    return 'Just now';
  }

  try {
    return new Intl.DateTimeFormat('en', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
    }).format(new Date(value));
  } catch (error) {
    return 'Just now';
  }
}
