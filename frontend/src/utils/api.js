export async function parseApiError(res) {
    try {
        const data = await res.json();
        if (data.error) return data.error;
        if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        return `Błąd serwera (${res.status})`;
    } catch {
        try {
            const text = await res.text();
            return text?.substring(0, 200) || `Błąd serwera (${res.status})`;
        } catch {
            return `Błąd serwera (${res.status})`;
        }
    }
}

export async function apiFetch(url, options = {}) {
    const headers = {
        ...(options.body && !(options.body instanceof FormData)
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        const message = await parseApiError(res);
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }

    if (res.status === 204) return null;

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return res.json();
    }

    return res;
}
