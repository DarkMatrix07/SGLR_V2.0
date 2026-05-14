// Centralized color palette + small UI helpers used across the app.
export const colors = {
    primary: '#0D9DA8',
    primaryDark: '#0D7377',
    primaryLight: '#D5EFEF',
    bg: '#EEF4F5',
    surface: '#FFFFFF',
    border: '#E0E8EA',
    textPrimary: '#1A1A2E',
    textMuted: '#8A9BAE',
    success: '#2ECC71',
    warning: '#F4A423',
    danger: '#E63946',
    orange: '#FF6B35',
    star: '#F4A423',
    rejectBg: '#FFF4F4',
};

export function formatStars(stars: number): string {
    const safe = Math.max(0, Math.min(5, stars || 0));
    return '★'.repeat(safe) + '☆'.repeat(5 - safe);
}

export function formatDate(input: string | Date | null | undefined): string {
    if (!input) return '';
    return new Date(input).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(input: string | Date | null | undefined): string {
    if (!input) return '';
    return new Date(input).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function capitalize(s: string | null | undefined): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
