import { Card, CardContent } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

export default function AppCard({ children }: any) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.2 : 0.2)}`,
        background: isDark
          ? 'linear-gradient(41deg, rgba(34, 34, 34, 0.98) 0%, rgba(37, 39, 48, 0.98) 100%)'
          : 'linear-gradient(41deg, rgba(240, 237, 237, 0.98) 0%, rgba(243, 243, 243, 0.98) 100%)',
        color: theme.palette.text.primary,
        backdropFilter: 'blur(6px)',
        boxShadow: isDark
          ? `0 14px 55px ${theme.palette.common.black}`
          : `0 14px 55px ${theme.palette.common.black}`,
        padding: '16px',
        margin: '16px',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '220px',
          height: '220px',
          pointerEvents: 'none',
          background: isDark
            ? 'radial-gradient(circle at 100% 0%, rgba(31, 55, 121, 0.4) 0%, rgba(255, 255, 255, 0) 68%)'
            : 'radial-gradient(circle at 100% 0%, rgba(29, 27, 27, 0.4) 0%, rgba(39, 39, 39, 0) 68%)',
          filter: 'blur(8px)',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, padding: 0, '&:last-child': { paddingBottom: 0 } }}>
        {children}
      </CardContent>
    </Card>
  );
}