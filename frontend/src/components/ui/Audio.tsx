import { CSSProperties } from 'react';
import { useTheme } from '@mui/material/styles';

type AppAudioProps = {
    src: string;
    fallbackText: string;
    width?: number | string;
    minWidth?: number | string;
    maxWidth?: number | string;
    style?: CSSProperties;
};

export default function AppAudio({
    src,
    fallbackText,
    width = 320,
    minWidth = 260,
    maxWidth = '100%',
    style,
}: AppAudioProps) {
    const theme = useTheme();

    return (
        <audio
            controls
            style={{
                width,
                minWidth,
                maxWidth,
                colorScheme: theme.palette.mode,
                ...style,
            }}
        >
            <source src={src} type="audio/mpeg" />
            {fallbackText}
        </audio>
    );
}
