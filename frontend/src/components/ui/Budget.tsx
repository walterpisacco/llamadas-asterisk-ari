import { useLocale } from '../../context/LocaleContext';
import { METRICS_WITHOUT_BUDGET_ROW, type StatMetricKey } from '../../types/stats.ts';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/** Claves en `lang/{locale}/dash.php` por bloque de métrica. */
const DASH_KEY_BY_METRIC: Record<StatMetricKey, string> = {
    totalAudios: 'total_audios',
    totalSegundos: 'tiempo_procesado',
    totalIndicadores: 'total_indicators',
    promedioLlamada: 'promedio_llamada',
    promedioRing: 'promedio_ring',
    promedioSilences: 'promedio_silences',
    promedioHold: 'promedio_hold',
    promedioMute: 'promedio_mute',
    promedioTransfer: 'promedio_transfer',
    totalAgentes: 'agentes',
};

const METRICS_WITHOUT_BUDGET_ROW_SET: ReadonlySet<StatMetricKey> = new Set(METRICS_WITHOUT_BUDGET_ROW);

type BudgetProps = {
    metricKey: StatMetricKey;
    stats?: Partial<any> | null;
};

type BudgetTone = {
    cardGlow: string;
    border: string;
    progressFrom: string;
    progressTo: string;
};

const TONE_BY_METRIC: Record<StatMetricKey, BudgetTone> = {
    totalAudios: {
        cardGlow: 'rgba(17, 210, 188, 0.42)',
        border: 'rgba(76, 235, 216, 0.55)',
        progressFrom: '#11d2bc',
        progressTo: '#2af0de',
    },
    totalSegundos: {
        cardGlow: 'rgba(250, 180, 63, 0.42)',
        border: 'rgba(255, 197, 101, 0.56)',
        progressFrom: '#f5b33f',
        progressTo: '#ffd26d',
    },
    promedioLlamada: {
        cardGlow: 'rgba(240, 91, 75, 0.4)',
        border: 'rgba(245, 130, 113, 0.55)',
        progressFrom: '#f05b4b',
        progressTo: '#ff8d6f',
    },
    promedioRing: {
        cardGlow: 'rgba(47, 146, 255, 0.4)',
        border: 'rgba(91, 177, 255, 0.55)',
        progressFrom: '#2f92ff',
        progressTo: '#6cb8ff',
    },
    promedioSilences: {
        cardGlow: 'rgba(178, 112, 255, 0.4)',
        border: 'rgba(200, 145, 255, 0.55)',
        progressFrom: '#a96bff',
        progressTo: '#cc94ff',
    },
    promedioHold: {
        cardGlow: 'rgba(2, 191, 223, 0.4)',
        border: 'rgba(84, 216, 239, 0.55)',
        progressFrom: '#00b8df',
        progressTo: '#69dbf5',
    },
    promedioMute: {
        cardGlow: 'rgba(255, 111, 173, 0.38)',
        border: 'rgba(255, 154, 198, 0.54)',
        progressFrom: '#ff6fad',
        progressTo: '#ff9ec2',
    },
    promedioTransfer: {
        cardGlow: 'rgba(126, 222, 55, 0.38)',
        border: 'rgba(157, 236, 96, 0.54)',
        progressFrom: '#7fdc3e',
        progressTo: '#a5f266',
    },
    totalAgentes: {
        cardGlow: 'rgba(39, 206, 143, 0.38)',
        border: 'rgba(104, 231, 179, 0.54)',
        progressFrom: '#27ce8f',
        progressTo: '#66e7b8',
    },
    totalIndicadores: {
        cardGlow: 'rgba(153, 102, 255, 0.38)',
        border: 'rgba(186, 145, 255, 0.54)',
        progressFrom: '#8f5bff',
        progressTo: '#b58aff',
    },
};

function pickMetric(stats: Partial<any> | null | undefined, key: StatMetricKey) {
    const subtitle = stats?.[`${key}_subtitle` as string];
    const explicitValue = stats?.[`${key}_value` as string];
    const percentValue = stats?.[`${key}_percent` as string];
    const minValue = stats?.[`${key}_min` as string];
    const maxValue = stats?.[`${key}_max` as string];

    const fallback = stats?.[key as string];
    const value = explicitValue ?? fallback;

    return {
        subtitle: typeof subtitle === 'string' ? subtitle : '',
        displayValue:
            value === undefined || value === null
                ? '—'
                : typeof value === 'number'
                  ? String(value)
                  : String(value),
         percentValue: typeof percentValue === 'number' ? percentValue : 0,
         minValue: typeof minValue === 'string' ? minValue : '',
         maxValue: typeof maxValue === 'string' ? maxValue : '',
    };
}

export default function Budget({ metricKey, stats }: BudgetProps) {
    const theme = useTheme();
    const { t } = useLocale();
    const title = t('dash', DASH_KEY_BY_METRIC[metricKey]);
    const { subtitle, displayValue, percentValue, minValue, maxValue } = pickMetric(stats, metricKey);
    const filterId = `budget-electric-border-${metricKey}`;
    const shouldRenderBudgetRow = !METRICS_WITHOUT_BUDGET_ROW_SET.has(metricKey);
    const tone = TONE_BY_METRIC[metricKey];
    return (
        <section className="budget-shell relative min-w-0 w-full px-1 py-4 sm:px-2 sm:py-6">
            <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
                <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                    <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" seed="1" result="noise1" />
                    <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" seed="7" result="noise2" />
                    <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
                        <animate attributeName="dy" values="220;0" dur="5s" repeatCount="indefinite" />
                    </feOffset>
                    <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
                        <animate attributeName="dx" values="-220;0" dur="6s" repeatCount="indefinite" />
                    </feOffset>
                    <feBlend in="offsetNoise1" in2="offsetNoise2" mode="color-dodge" result="combinedNoise" />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="combinedNoise"
                        scale="22"
                        xChannelSelector="R"
                        yChannelSelector="B"
                    />
                </filter>
            </svg>

            <div className="budget-highlight-wrap relative rounded-2xl">
                <div className="budget-frame relative z-10 rounded-2xl p-[1px]">
                    <div
                        className="budget-electric-card budget-neo-card relative overflow-hidden rounded-2xl border px-4 py-5 shadow-[0_24px_50px_rgba(0,0,0,0.55)] sm:px-5 sm:py-6 lg:px-4 lg:py-5"
                        style={{
                            background:
                             theme.palette.mode === 'dark'
                             ? `linear-gradient(165deg, ${theme.palette.background.paper} 0%, rgba(0, 0, 0, 0.96) 100%)`
                             : `linear-gradient(165deg, ${theme.palette.background.paper} 0%, rgba(255, 255, 255, 0.96) 100%)`,
                            borderColor: tone.border,
                            boxShadow: '0 0.063em 0.75em 1.563em rgba(0, 0, 0, 0.78);',
                            borderRadius: '20px',
                        }}
                    >
                    <div
                        className="budget-ambient pointer-events-none absolute -inset-8 -z-10 rounded-3xl"
                        style={{
                            background: `radial-gradient(circle at 100% 0%, ${tone.cardGlow} 0%, rgba(8, 11, 29, 0) 52%)`,
                        }}
                    />
                    <div
                        className="budget-top-right pointer-events-none absolute right-0 top-0 h-44 w-44"
                        style={{
                            background: `radial-gradient(circle at 100% 0%, ${tone.cardGlow} 0%, rgba(8, 11, 29, 0) 68%)`,
                        }}
                    />
                    <div className="budget-electric-line pointer-events-none absolute inset-0 rounded-2xl" />
                    <div className="budget-electric-glow-1 pointer-events-none absolute inset-0 rounded-2xl" />
                    <div className="budget-electric-glow-2 pointer-events-none absolute inset-0 rounded-2xl" />
                    <div className="budget-halo-top pointer-events-none absolute -top-20 left-1/2 h-36 w-40 -translate-x-1/2 rounded-full" />
                    <div className="budget-halo-bottom pointer-events-none absolute -bottom-16 right-8 h-28 w-28 rounded-full" />

                        <div className="relative z-10">
                        <Box
                            component="span"
                            sx={{
                                typography: 'subtitle2',
                                color: 'text.primary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.18em',
                                fontSize: '0.82rem',
                            }}
                        >
                            {title}
                        </Box>
                        <h2 className="mt-2 truncate text-2xl font-semibold sm:text-3xl">
                            <Box
                                component="span"
                                sx={{
                                    color: 'text.primary',
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                    textShadow: '0 0 24px rgba(189, 158, 255, 0.35)',
                                    fontSize: { xs: '1.6rem', sm: '2rem' },
                                }}
                            >
                                {displayValue}
                            </Box>
                        </h2>

                        {shouldRenderBudgetRow && (
                            <div className="mt-6 space-y-4">
                                <BudgetRow
                                    label={subtitle}
                                    progress={percentValue}
                                    minValue={minValue}
                                    maxValue={maxValue}
                                    progressFrom={tone.progressFrom}
                                    progressTo={tone.progressTo}
                                />
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .budget-electric-wrap {
                    background: linear-gradient(120deg, #b897ff, #62ceff, #9e84ff);
                }

                .budget-shell {
                    background: transparent;
                }

                .budget-frame {
                    background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(160, 173, 255, 0.07));
                }

                .budget-highlight-wrap::before,
                .budget-highlight-wrap::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 16px;
                    transition: inset 0.5s ease, filter 0.5s ease, opacity 0.5s ease;
                    background: linear-gradient(45deg, rgba(250, 250, 250, 0.5), rgba(70, 149, 229, 0.45), rgba(185, 183, 194, 0.55));
                    z-index: 1;
                    opacity: 0.8;
                }

                .budget-highlight-wrap::after {
                    filter: none;
                }

                .budget-highlight-wrap:hover::before {
                    inset: -3px;
                }

                .budget-highlight-wrap:hover::after {
                    inset: -3px;
                    filter: blur(10px);
                }

                .budget-neo-card {
                    backdrop-filter: blur(6px);
                }

                .budget-ambient {
                    filter: blur(30px);
                }

                .budget-top-right {
                    filter: blur(8px);
                }

                .budget-halo-top {
                    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.32), rgba(241, 238, 245, 0.02) 70%);
                    filter: blur(10px);
                }

                .budget-halo-bottom {
                    background: radial-gradient(circle at center, rgba(122, 230, 255, 0.26), rgba(107, 209, 255, 0.01) 68%);
                    filter: blur(8px);
                }

                .budget-electric-line {
                    border: 1px solid rgba(163, 146, 255, 0.85);
                    filter: url(#${filterId});
                }

                .budget-electric-glow-1 {
                    border: 1px solid rgba(177, 159, 255, 0.55);
                    filter: blur(1px);
                }

                .budget-electric-glow-2 {
                    border: 1px solid rgba(110, 214, 255, 0.45);
                    filter: blur(4px);
                }

                .budget-progress-glow {
                    box-shadow: 0 0 12px rgba(171, 138, 255, 0.65), 0 0 28px rgba(81, 196, 255, 0.42);
                }
            `}</style>
        </section>
    );
}

type BudgetRowProps = {
    label: string;
    progress: number;
    minValue: string;
    maxValue: string;
    progressFrom: string;
    progressTo: string;
};

function BudgetRow({ label, progress, minValue, maxValue, progressFrom, progressTo }: BudgetRowProps) {
    const safeProgress = Math.max(0, Math.min(progress, 100));

    return (
        <div>
            <Box
                component="div"
                sx={{
                    color: 'text.secondary',
                    letterSpacing: '0.08em',
                    fontSize: '0.74rem',
                    mb: 1,
                }}
            >
                {label}
            </Box>
            <div className="mb-2 flex items-center justify-between text-sm">
                <Box
                    component="span"
                    sx={{
                        color: 'text.secondary',
                        letterSpacing: '0.08em',
                        fontSize: '0.74rem',
                    }}
                >
                    MIN {minValue}
                </Box>
                <Box
                    component="span"
                    sx={{
                        color: 'text.secondary',
                        letterSpacing: '0.08em',
                        fontSize: '0.74rem',
                    }}
                >
                    MAX {maxValue}
                </Box>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full border border-violet-300/15 bg-slate-900/45">
                <div
                    className="budget-progress-glow h-full rounded-full"
                    style={{ width: `${safeProgress}%`, backgroundImage: `linear-gradient(90deg, ${progressFrom}, ${progressTo})` }}
                />
                <div
                    className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/18 via-transparent to-transparent"
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
