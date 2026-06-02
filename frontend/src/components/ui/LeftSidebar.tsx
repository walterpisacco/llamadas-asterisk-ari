import { useState, type ComponentType, type MouseEvent } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import PinchIcon from '@mui/icons-material/Pinch';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLocale } from '@/context/LocaleContext';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export type SidebarUser = {
    name: string;
    rol: string;
    avatarUrl?: string | null;
};

type LeftSidebarProps = {
    user?: SidebarUser | null;
    onLogout?: () => void;
    onNavigate?: () => void;
    onHideSidebar?: () => void;
};

const defaultAvatar = '/assets/images/avatar/woman.jpg';
const logoSrc = '/assets/images/logo/2.png';

type SidebarLinkIcon = ComponentType<SvgIconProps>;

type SidebarNavItem = {
    to: string;
    label: string;
    icon: SidebarLinkIcon;
};

type SidebarNavGroup = {
    id: string;
    label: string;
    defaultOpen: boolean;
    icon: SidebarLinkIcon;
    items: SidebarNavItem[];
};

export default function LeftSidebar({ user, onLogout, onNavigate, onHideSidebar }: LeftSidebarProps) {
    const { t } = useLocale();
    const location = useLocation();
    const theme = useTheme();

    const topNavItems: SidebarNavItem[] = [
        { to: '/', label: t('app', 'panel_principal'), icon: AutoAwesomeMosaicIcon },
        { to: '/cdrs', label: t('app', 'llamadas'), icon: CallRoundedIcon },
        { to: '/transcriptions', label: t('app', 'transcripciones'), icon: ArticleRoundedIcon },
        { to: '/compliance', label: t('app', 'cumplimiento'), icon: BarChartRoundedIcon },
        { to: '/compliance-detail', label: t('app', 'detalle_de_cumplimiento'), icon: BarChartRoundedIcon },
        { to: '/cloud', label: t('app', 'nube_de_palabras'), icon: CloudRoundedIcon },
    ];

    const navGroups: SidebarNavGroup[] = [
        {
            id: 'settings',
            label: t('app', 'settings'),
            defaultOpen: true,
            icon: SettingsRoundedIcon,
            items: [
                { to: '/setting', label: t('app', 'settings_alertas'), icon: PinchIcon },
                { to: '/indicators', label: t('app', 'indicadores'), icon: ViewInArIcon },
                { to: '/training', label: t('app', 'entrenamiento'), icon: ViewInArIcon }
            ],
        },
    ];

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(navGroups.map((g) => [g.id, g.defaultOpen])),
    );
    const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);

    const toggleGroup = (id: string) => {
        setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
    };
    const isAccountMenuOpen = Boolean(accountMenuAnchor);

    const handleOpenAccountMenu = (event: MouseEvent<HTMLElement>) => {
        setAccountMenuAnchor(event.currentTarget);
    };

    const handleCloseAccountMenu = () => {
        setAccountMenuAnchor(null);
    };

    const handleAccountMenuNavigate = () => {
        handleCloseAccountMenu();
        onNavigate?.();
    };

    const linkButtonSx = {
        width: '100%' as const,
        justifyContent: 'flex-start' as const,
        borderRadius: 3,
        textAlign: 'left' as const,
        textDecoration: 'none' as const,
        '&.active': {
            bgcolor: alpha(theme.palette.primary.main, 0.18),
            color: 'primary.main',
        },
        '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
        },
    };

    const renderNavLink = (item: SidebarNavItem, nested: boolean) => {
        const ItemIcon = item.icon;
        return (
            <ButtonBase
                key={item.to}
                component={NavLink}
                to={item.to}
                onClick={onNavigate}
                sx={linkButtonSx}
            >
                <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                        width: '100%',
                        px: 1.5,
                        py: nested ? 1 : 1.25,
                        pl: nested ? 3.25 : 1.5,
                        color: 'text.primary',
                    }}
                >
                    <Box sx={{ display: 'inline-flex', color: 'inherit', width: nested ? 22 : 'auto' }}>
                        <ItemIcon fontSize="small" />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: nested ? 500 : 600 }}>
                        {item.label}
                    </Typography>
                </Stack>
            </ButtonBase>
        );
    };
    const displayName = user?.name ?? 'Usuario';
    const displayRol = user?.rol ?? '';
    const avatarSrc =
        user?.avatarUrl != null && user.avatarUrl !== ''
            ? `${user.avatarUrl}`
            : defaultAvatar;

    return (
        <Box
            component="nav"
            sx={{
                display: 'flex',
                height: '100%',
                flexDirection: 'column',
                gap: 2.5,
            }}
        >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    component={Link}
                    to="/"
                    onClick={onNavigate}
                    sx={{ textDecoration: 'none', minWidth: 0, flex: 1 }}
                >
                    <Box
                        sx={{
                            display: 'flex',

                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.16),
                            boxShadow: `0 18px 38px ${alpha(
                                theme.palette.common.black,
                                0.16,
                            )}`,
                        }}
                    >
                        <Box
                            component="img"
                            src={logoSrc}
                            alt="Logo"
                            sx={{ maxWidth: '100%', maxHeight: '100%' }}
                        />
                    </Box>
                </Stack>
                {onHideSidebar ? (
                    <IconButton
                        onClick={onHideSidebar}
                        size="small"
                        aria-label="Ocultar barra lateral"
                        sx={{
                            flexShrink: 0,
                            color: 'text.secondary',
                            mt: 0.25,
                            '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) },
                        }}
                    >
                        <MenuOpenRoundedIcon fontSize="small" />
                    </IconButton>
                ) : null}
            </Stack>

            <Box
                sx={{
                    borderRadius: 2,
                    p: 2,
                    bgcolor:
                        theme.palette.mode === 'dark'
                            ? alpha(theme.palette.common.white, 0.04)
                            : alpha(theme.palette.primary.main, 0.06),
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: `0 20px 45px ${alpha(
                        theme.palette.common.black,
                        theme.palette.mode === 'dark' ? 0.8 : 0.8,
                    )}`,
                }}
            >
                <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ width: '100%', minWidth: 0 }}
                >
                    <Avatar src={avatarSrc} alt={displayName} sx={{ width: 50, height: 50 }} />
                    <Box minWidth={0} sx={{ flex: 1 }}>
                        <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{ color: 'text.primary', fontWeight: 700 }}
                        >
                            {displayName}
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                            {displayRol || ''}
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={handleOpenAccountMenu}
                        size="small"
                        aria-label={t('app', 'account')}
                        sx={{
                            flexShrink: 0,
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) },
                        }}
                    >
                        <SettingsRoundedIcon fontSize="small" />
                    </IconButton>
                    <Menu
                        anchorEl={accountMenuAnchor}
                        open={isAccountMenuOpen}
                        onClose={handleCloseAccountMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem
                            component={Link}
                            to="/account"
                            onClick={handleAccountMenuNavigate}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
                                <GroupAddRoundedIcon fontSize="small" />
                                <span>{t('app', 'mi_cuenta')}</span>
                            </Stack>
                        </MenuItem>
                        <MenuItem
                            component={Link}
                            to="/register"
                            onClick={handleAccountMenuNavigate}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
                                <GroupAddRoundedIcon fontSize="small" />
                                <span>{t('app', 'administracion_de_usuarios')}</span>
                            </Stack>
                        </MenuItem>
                    </Menu>
                </Stack>
            </Box>

            <Stack spacing={1} sx={{ flex: 1 }}>
                {topNavItems.map((item) => renderNavLink(item, false))}
                {navGroups.map((group) => {
                    const GroupIcon = group.icon;
                    const expanded = openGroups[group.id] ?? group.defaultOpen;
                    const sectionActive = group.items.some(
                        (it) =>
                            location.pathname === it.to ||
                            location.pathname.startsWith(`${it.to}/`),
                    );
                    return (
                        <Box key={group.id}>
                            <ButtonBase
                                onClick={() => toggleGroup(group.id)}
                                aria-expanded={expanded}
                                sx={{
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    borderRadius: 3,
                                    textAlign: 'left',
                                    color: sectionActive ? 'primary.main' : 'text.primary',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1.5}
                                    alignItems="center"
                                    sx={{ width: '100%', px: 1.5, py: 1.25 }}
                                >
                                    <Box sx={{ display: 'inline-flex', color: 'inherit' }}>
                                        <GroupIcon fontSize="small" />
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, textAlign: 'left' }}>
                                        {group.label}
                                    </Typography>
                                    <ExpandMoreRoundedIcon
                                        fontSize="small"
                                        sx={{
                                            color: 'text.secondary',
                                            transform: expanded ? 'rotate(180deg)' : 'none',
                                            transition: theme.transitions.create('transform', {
                                                duration: theme.transitions.duration.shorter,
                                            }),
                                        }}
                                    />
                                </Stack>
                            </ButtonBase>
                            <Collapse in={expanded} timeout="auto">
                                <Stack spacing={0.25} sx={{ pt: 0.25 }}>
                                    {group.items.map((item) => renderNavLink(item, true))}
                                </Stack>
                            </Collapse>
                        </Box>
                    );
                })}
            </Stack>

            <Divider />

            {onLogout ? (
                <ButtonBase
                    onClick={onLogout}
                    sx={{
                        justifyContent: 'flex-start',
                        borderRadius: 3,
                        px: 1.5,
                        py: 1.25,
                        color: 'error.main',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                        },
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <LogoutRoundedIcon fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {t('app', 'logout')}
                        </Typography>
                    </Stack>
                </ButtonBase>
            ) : (
                <ButtonBase
                    component={Link}
                    to="/login"
                    onClick={onNavigate}
                    sx={{
                        justifyContent: 'flex-start',
                        borderRadius: 3,
                        px: 1.5,
                        py: 1.25,
                        color: 'error.main',
                        textDecoration: 'none',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                        },
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <LogoutRoundedIcon fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Ir a login
                        </Typography>
                    </Stack>
                </ButtonBase>
            )}
        </Box>
    );
}
