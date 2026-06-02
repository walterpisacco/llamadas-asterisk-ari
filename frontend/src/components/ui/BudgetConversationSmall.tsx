import { Box, Paper, Stack, Typography, useTheme, type Theme } from '@mui/material';

export type ConversationEfficiencyTier = 'green' | 'orange' | 'red_low' | 'red_high';

export function parseConversationEfficiency(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        const direct = Number(trimmed);
        if (Number.isFinite(direct)) return direct;
        try {
            const parsed = JSON.parse(trimmed) as unknown;
            if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
        } catch {
            return null;
        }
    }
    return null;
}

export function parseCompliance(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        const direct = Number(trimmed);
        if (Number.isFinite(direct)) return direct;
    }
    return null;
}

export function conversationEfficiencyTier(value: number): ConversationEfficiencyTier {
    if (value > 0.9) return 'red_high';
    if (value >= 0.65 && value <= 0.9) return 'green';
    if (value >= 0.45 && value < 0.65) return 'orange';
    return 'red_low';
}

/** Colores MUI alineados con `conversationEfficiencyTier` (misma regla que la tarjeta de detalle). */
export function conversationEfficiencyIconColor(
    raw: unknown,
): 'success' | 'warning' | 'error' | 'inherit' {
    const value = parseConversationEfficiency(raw);
    if (value === null) return 'inherit';
    const tier = conversationEfficiencyTier(value);
    if (tier === 'green') return 'success';
    if (tier === 'orange') return 'warning';
    return 'error';
}

/** Colores MUI alineados con `conversationEfficiencyTier` (misma regla que la tarjeta de detalle). */
export function conversationComplianceColor(
    raw: unknown,
): 'success' | 'error' | 'inherit' {
    const value = parseCompliance(raw);
    if (value === 0) return 'inherit';
    if (value === null) return 'inherit';
    if (value <= 50) return 'error';
    return 'success';
}

type TranscriptionsT = (namespace: 'transcriptions', key: string) => string;

export type BudgetConversationProps = {
    raw: unknown;
    t: TranscriptionsT;
};

function tierVisualConfig(
    theme: Theme,
): Record<
    ConversationEfficiencyTier,
    { emoji: string; border: string; titleKey: string; rangeKey: string; introKey: string; bulletKeys: string[] }
> {
    return {
        green: {
            emoji: '🟢',
            border: theme.palette.success.main,
            titleKey: 'ec_tier_green',
            rangeKey: 'ec_range_green',
            introKey: 'ec_green_intro',
            bulletKeys: ['ec_green_b1', 'ec_green_b2'],
        },
        orange: {
            emoji: '🟡',
            border: theme.palette.warning.main,
            titleKey: 'ec_tier_orange',
            rangeKey: 'ec_range_orange',
            introKey: 'ec_orange_intro',
            bulletKeys: ['ec_orange_b1', 'ec_orange_b2', 'ec_orange_b3'],
        },
        red_low: {
            emoji: '🔴',
            border: theme.palette.error.main,
            titleKey: 'ec_tier_red_low',
            rangeKey: 'ec_range_red_low',
            introKey: 'ec_red_low_intro',
            bulletKeys: ['ec_red_low_b1', 'ec_red_low_b2', 'ec_red_low_b3'],
        },
        red_high: {
            emoji: '🔴',
            border: theme.palette.error.main,
            titleKey: 'ec_tier_red_high',
            rangeKey: 'ec_range_red_high',
            introKey: 'ec_red_high_intro',
            bulletKeys: ['ec_red_high_b1', 'ec_red_high_b2', 'ec_red_high_b3'],
        },
    };
}

export default function BudgetConversation({ raw, t }: BudgetConversationProps) {
    const theme = useTheme();
    const value = parseConversationEfficiency(raw);
    const tierVisual = tierVisualConfig(theme);

    if (value === null) {
        return (
            <Box>
                <Typography variant="caption" color="text.secondary">
                    {t('transcriptions', 'eficiencia_de_conversacion')}
                </Typography>
                <Typography variant="body1">-</Typography>
            </Box>
        );
    }

    const tier = conversationEfficiencyTier(value);
    const cfg = tierVisual[tier];
    const formatted = value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 1.5,
                borderLeft: 4,
                borderLeftColor: cfg.border,
                bgcolor: 'background.default',
                height: '100%',
            }}
        >
            <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" mb={0.5}>
                <Typography component="span" aria-hidden>
                    {cfg.emoji}
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: cfg.border }}>
                    {t('transcriptions', cfg.titleKey)}
                </Typography>

            </Stack>
            <Typography variant="h6" component="p" fontWeight={700} align="center" sx={{ color: cfg.border }} mb={1}>
                {formatted}
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary" mb={0.5}>
                {t('transcriptions', cfg.introKey)}
            </Typography>

        </Paper>
    );
}
