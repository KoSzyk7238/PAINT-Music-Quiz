export function buildShareUrl({ quizId, score, difficulty } = {}) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    if (quizId != null) params.set('quiz', String(quizId));
    if (score != null) params.set('score', String(score));
    if (difficulty != null) params.set('difficulty', String(difficulty));
    const qs = params.toString();
    return qs ? `${origin}/?${qs}` : origin;
}

export function buildSessionShareText({
    quizTitle,
    score,
    correctCount,
    totalQuestions,
    accuracyPercent,
    quizId,
    difficulty,
}) {
    const title = quizTitle || 'Quiz muzyczny';
    const ratio =
        totalQuestions > 0
            ? Math.round((correctCount / totalQuestions) * 100)
            : accuracyPercent ?? 0;
    const url = buildShareUrl({ quizId, score, difficulty });
    const diffLabels = { EASY: 'Łatwy', MEDIUM: 'Średni', HARD: 'Trudny' };
    const diffText = difficulty ? ` · Poziom: ${diffLabels[difficulty] || difficulty}` : '';
    return (
        `🎵 Jaki to sygnał? — ${title}\n` +
        `Wynik: ${score} pkt${diffText} · ${correctCount}/${totalQuestions} poprawnych (${ratio}%)\n` +
        `Pobij mnie: ${url}`
    );
}

export async function copyShareText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
}

/** @returns {'shared' | 'copied' | 'cancelled' | 'failed'} */
export async function shareSession(payload) {
    const text = buildSessionShareText(payload);

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Jaki to sygnał?',
                text,
            });
            return 'shared';
        } catch (err) {
            if (err?.name === 'AbortError') return 'cancelled';
        }
    }

    const ok = await copyShareText(text);
    return ok ? 'copied' : 'failed';
}
