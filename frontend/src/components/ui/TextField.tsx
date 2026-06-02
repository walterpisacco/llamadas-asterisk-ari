import Box from '@mui/material/Box';
import { type SxProps, type Theme } from '@mui/material/styles';
import MuiTextField, { type TextFieldProps } from '@mui/material/TextField';

export default function AppTextField(props: TextFieldProps) {
    const { sx, multiline, ...rest } = props;
    const baseSx: SxProps<Theme> = (theme) => ({
        width: '100%',
        position: 'relative',
        zIndex: 10,
        '& .MuiInputBase-root': {
            position: 'relative',
            zIndex: 10,
            overflow: multiline ? 'visible' : 'hidden',
            ...(multiline
                ? {
                      height: 'auto',
                      minHeight: 100,
                      alignItems: 'flex-start',
                  }
                : { height: 52 }),
            borderRadius: '10px',
            background:
                theme.palette.mode === 'dark'
                    ? theme.palette.background.default
                    : theme.palette.background.light,
            '& fieldset': {
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '10px',
            },
            '&:hover fieldset': {
                borderColor: theme.palette.divider,
            },
            '&.Mui-focused fieldset': {
                borderWidth: 1,
                borderColor: theme.palette.divider,
            },
            '& .MuiInputBase-input::placeholder, & textarea.MuiInputBase-input::placeholder': {
                opacity: 1,
                transition: 'opacity 0.2s ease',
            },
            '& .MuiInputBase-input:focus::placeholder, & textarea.MuiInputBase-input:focus::placeholder': {
                opacity: 0,
            },
        },
        '& .MuiInputLabel-root[data-shrink="false"] + .MuiInputBase-root .MuiInputBase-input::placeholder': {
            opacity: '0.5 !important',
        },
        '& .MuiInputLabel-root[data-shrink="false"] + .MuiInputBase-root .MuiInputBase-input:focus::placeholder': {
            opacity: '1 !important',
        },
        '& .MuiInputLabel-root': {
            transform: 'translate(14px, -25px) scale(1)',
            opacity: 1,
        },
        '& .MuiInputLabel-root.MuiInputLabel-shrink': {
            transform: 'translate(14px, -30px) scale(0.80)',
            fontSize: 'large',
            opacity: 1,
color: theme.palette.text.primary,
        },

    });

    const mergedSx: SxProps<Theme> = Array.isArray(sx)
        ? [baseSx, ...sx]
        : sx
          ? [baseSx, sx]
          : baseSx;

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',

                '&::before, &::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    transition: 'inset 0.5s ease, filter 0.5s ease',
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? `linear-gradient(45deg, ${theme.palette.info.light}, ${theme.palette.info.light}, ${theme.palette.primary.main})`
                            : `linear-gradient(45deg, ${theme.palette.info.main}, ${theme.palette.info.main}, ${theme.palette.primary.light})`,
                    zIndex: 1,
                    borderRadius: '10px',
                    boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.2)',
                },
                '&::after': {
                    filter: 'none',
                },
                '&:hover::before': {
                    inset: '-3px',
                },
                '&:hover::after': {
                    inset: '-3px',
                    filter: 'blur(10px)',
                },
            }}
        >

            <Box sx={mergedSx}>

                <MuiTextField variant="outlined" multiline={multiline} {...rest} />

            </Box>
        </Box>
    );
}
