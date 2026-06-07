import { useEffect } from 'react';

const BASE = 'Jaki to sygnał';

export default function usePageTitle(pageTitle) {
    useEffect(() => {
        document.title = pageTitle ? `${pageTitle} · ${BASE}` : BASE;
        return () => {
            document.title = BASE;
        };
    }, [pageTitle]);
}
