/**
 * Resolves a generic relationship status into a gender-specific one.
 * @param {string} status - The generic status (e.g., 'Elternteil')
 * @param {string} gender - The gender of the target person ('Männlich', 'Weiblich', or other)
 * @returns {string} - The gendered status
 */
export const getGenderedStatus = (status, gender) => {
    if (!status) return '';
    const s = status.toLowerCase();
    const g = gender ? gender.toLowerCase() : '';

    if (s === 'elternteil') {
        if (g === 'männlich') return 'Vater';
        if (g === 'weiblich') return 'Mutter';
        return 'Elternteil';
    }

    if (s === 'kind') {
        if (g === 'männlich') return 'Sohn';
        if (g === 'weiblich') return 'Tochter';
        return 'Kind';
    }

    if (s === 'geschwister') {
        if (g === 'männlich') return 'Bruder';
        if (g === 'weiblich') return 'Schwester';
        return 'Geschwister';
    }

    if (s === 'großeltern') {
        if (g === 'männlich') return 'Großvater';
        if (g === 'weiblich') return 'Großmutter';
        return 'Großeltern';
    }

    // Add more mappings if needed, or return original
    return status;
};
