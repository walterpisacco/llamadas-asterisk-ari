import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Divider, Grid, Typography, type TypographyProps } from '@mui/material';

type LetterPhase = '' | 'behind' | 'in' | 'out';

export type TypographyAnimatedProps = Omit<TypographyProps, 'children' | 'ref'> & {
    /** Texto fijo antes de la frase que rota (por ejemplo «Top»). */
    prefix: string;
    /** Frases que se alternan; si hay una sola, no hay animación de rotación. */
    rotatingWords: string[];
    /** Intervalo entre rotaciones (ms). */
    rotateIntervalMs?: number;
    /** Retraso entre letras al animar (ms), como en el CodePen (~80). */
    letterStaggerMs?: number;
    /** Retraso antes de entrar las letras de la siguiente palabra (ms). */
    revealDelayMs?: number;
    /** Colores por palabra (cicla si hay más palabras que colores). */
    wordColors?: string[];
};

const defaultWordColors = [
    '#e74c3c',
    '#8e44ad',
    '#3498db',
    '#2ecc71',
    '#f1c40f',
];

function letterKey(wordIndex: number, letterIndex: number) {
    return `${wordIndex}-${letterIndex}`;
}

export default function TypographyAnimated({
    prefix,
    rotatingWords,
    rotateIntervalMs = 4000,
    letterStaggerMs = 80,
    revealDelayMs = 340,
    wordColors = defaultWordColors,
    sx,
    ...typographyProps
}: TypographyAnimatedProps) {
    const words = useMemo(
        () => rotatingWords.map((w) => w.trim()).filter(Boolean),
        [rotatingWords],
    );

    const maxWordLen = useMemo(
        () => words.reduce((m, w) => Math.max(m, w.length), 0),
        [words],
    );

    const [opacities, setOpacities] = useState<number[]>(() =>
        words.length ? words.map((_, i) => (i === 0 ? 1 : 0)) : [],
    );
    const [phases, setPhases] = useState<Record<string, LetterPhase>>({});

    const wordIndexRef = useRef(0);
    const timersRef = useRef<number[]>([]);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach((id) => window.clearTimeout(id));
        timersRef.current = [];
    }, []);

    useEffect(() => {
        setOpacities(words.length ? words.map((_, i) => (i === 0 ? 1 : 0)) : []);
        setPhases({});
        wordIndexRef.current = 0;
    }, [words]);

    useEffect(() => {
        if (words.length < 2) {
            return undefined;
        }

        const runRotate = () => {
            clearTimers();
            const currentIdx = wordIndexRef.current;
            const maxIdx = words.length - 1;
            const nextIdx = currentIdx === maxIdx ? 0 : currentIdx + 1;
            const currentWord = words[currentIdx];
            const nextWord = words[nextIdx];

            currentWord.split('').forEach((_, i) => {
                const id = window.setTimeout(() => {
                    setPhases((p) => ({
                        ...p,
                        [letterKey(currentIdx, i)]: 'out',
                    }));
                }, i * letterStaggerMs);
                timersRef.current.push(id);
            });

            setOpacities((prev) => {
                const next = [...prev];
                if (next.length < words.length) {
                    return words.map((_, i) => (i === nextIdx ? 1 : 0));
                }
                next[nextIdx] = 1;
                return next;
            });

            const behindPatch: Record<string, LetterPhase> = {};
            nextWord.split('').forEach((_, i) => {
                behindPatch[letterKey(nextIdx, i)] = 'behind';
            });
            setPhases((p) => ({ ...p, ...behindPatch }));

            nextWord.split('').forEach((_, i) => {
                const id = window.setTimeout(() => {
                    setPhases((p) => ({
                        ...p,
                        [letterKey(nextIdx, i)]: 'in',
                    }));
                }, revealDelayMs + i * letterStaggerMs);
                timersRef.current.push(id);
            });

            const outEnd =
                Math.max(currentWord.length - 1, 0) * letterStaggerMs + 320;
            const inEnd =
                revealDelayMs +
                Math.max(nextWord.length - 1, 0) * letterStaggerMs +
                380;
            const settleMs = Math.max(outEnd, inEnd) + 100;

            const idSettle = window.setTimeout(() => {
                setOpacities((prev) => {
                    const next = [...prev];
                    if (next.length >= words.length) {
                        next[currentIdx] = 0;
                    }
                    return next;
                });
                const resetPatch: Record<string, LetterPhase> = {};
                currentWord.split('').forEach((_, i) => {
                    resetPatch[letterKey(currentIdx, i)] = 'behind';
                });
                setPhases((p) => ({ ...p, ...resetPatch }));
                wordIndexRef.current = nextIdx;
            }, settleMs);
            timersRef.current.push(idSettle);
        };

        const intervalId = window.setInterval(runRotate, rotateIntervalMs);
        return () => {
            window.clearInterval(intervalId);
            clearTimers();
        };
    }, [
        words,
        rotateIntervalMs,
        letterStaggerMs,
        revealDelayMs,
        clearTimers,
    ]);

    const rotatingLine = useMemo(() => {
        if (!words.length) {
            return null;
        }
        return (
            <Box
                component="span"
                sx={{
                    position: 'relative',
                    display: 'inline-block',
                    margin: 0,
                    verticalAlign: 'baseline',
                    /* Reserva altura sin forzar centrado vertical frente al prefijo */
                    minHeight: '1em',
                    lineHeight: 1,
                    minWidth: maxWordLen ? `${maxWordLen}ch` : undefined,
                }}
            >
                {words.map((word, wi) => (
                    <Box
                        component="span"
                        key={`${wi}-${word}`}
                        sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            display: 'inline-flex',
                            opacity: opacities[wi] ?? 0,
                            color: wordColors[wi % wordColors.length],
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {word.split('').map((char, li) => {
                            const phase = phases[letterKey(wi, li)] ?? '';
                            return (
                                <Box
                                    component="span"
                                    key={letterKey(wi, li)}
                                    sx={{
                                        display: 'inline-block',
                                        transformStyle: 'preserve-3d',
                                        transformOrigin: 'center center 12px',
                                        ...(phase === 'out' && {
                                            transform: 'rotateX(90deg)',
                                            transition:
                                                '0.32s cubic-bezier(0.6, 0, 0.7, 0.2)',
                                        }),
                                        ...(phase === 'in' && {
                                            transform: 'rotateX(0deg)',
                                            transition: '0.38s ease',
                                        }),
                                        ...(phase === 'behind' && {
                                            transform: 'rotateX(-90deg)',
                                            transition: 'none',
                                        }),
                                    }}
                                >
                                    {char === ' ' ? '\u00A0' : char}
                                </Box>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        );
    }, [words, opacities, phases, wordColors, maxWordLen]);

    return (
        <Typography
            {...typographyProps}
            component="div"
            sx={{
                perspective: '320px',
                ...sx,
            }}
        >
            <Box
                component="div"
                sx={{
                    display: 'inline-flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    columnGap: 0.5,
                    rowGap: 0.25,
                }}
                mb={3}
                aria-live="polite"
            >
                <Box component="span" sx={{ margin: 0, lineHeight: 'inherit' }}>
                    {prefix}
                </Box>
                {words.length > 0 ? (
                    <Box
                        component="span"
                        sx={{
                            margin: 0,
                            lineHeight: 'inherit',
                            display: 'inline-block',
                            transform: 'translateY(4px)',
                        }}
                    >
                        {rotatingLine}
                    </Box>
                ) : null}
            </Box>
            <Grid size={{ xs: 12 }}>
                <Divider />
            </Grid>
        </Typography>
        
    );
}
