import MuiAlert, { type AlertProps } from '@mui/material/Alert';

export type AppAlertProps = Omit<AlertProps, 'variant'> & {
    /** MUI Alert: `outlined` por defecto (contorno). */
    variant?: AlertProps['variant'];
};

/**
 * Envoltorio del Alert de MUI con variante **outlined** por defecto.
 * Usar `severity` (`error` | `warning` | `info` | `success`) como en MUI.
 */
export default function AppAlert({
    variant = 'outlined',
    severity,
    ...rest
}: AppAlertProps) {
    return <MuiAlert sx={{ fontSize: '1rem' }} variant={variant} severity={severity} {...rest} />;
}
