const plPluralRules = new Intl.PluralRules('pl-PL');

/**
 * Polish plural forms for "pytanie" using built-in Intl.PluralRules.
 */
export function pytaniaPlural(n) {
    const rule = plPluralRules.select(n);
    switch (rule) {
        case 'one':
            return `${n} pytanie`;
        case 'few':
            return `${n} pytania`;
        default: // 'many' and 'other'
            return `${n} pytań`;
    }
}
