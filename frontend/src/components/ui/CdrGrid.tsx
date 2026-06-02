import {
    Box,
    Chip,
    IconButton,
    Paper,
    Pagination,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AppAudio from './Audio';

type CdrAgent = {
    id: number;
    name: string;
    surname: string;
};

type CdrContact = {
    name: string;
};

export type CdrGridRow = {
    id: number;
    calldate: string;
    phone: string;
    total_duration: number;
    audio_url: string | null;
    agent: CdrAgent | null;
    contact: CdrContact | null;
    compliance_avg: number;
};

type CdrGridMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

type CdrGridLabels = {
    fecha: string;
    telefono: string;
    agente: string;
    contacto: string;
    duracion: string;
    archivo: string;
    cumplimiento: string;
    acciones: string;
    sinAgente: string;
    sinContacto: string;
    sinArchivo: string;
    ver: string;
    noLlamadas: string;
    audioNoSoporte: string;
    cargando: string;
};

type CdrGridProps = {
    rows: CdrGridRow[];
    loading: boolean;
    meta: CdrGridMeta | null;
    labels: CdrGridLabels;
    onPageChange: (page: number) => void;
    onDelete: (cdrId: number) => void;
};

function formatCallDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatCallDateComplete(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(s / 60);
    const remainingSeconds = s % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function CdrGrid({
    rows,
    loading,
    meta,
    labels,
    onPageChange,
    onDelete,
}: CdrGridProps) {
    const hasPages = meta != null && meta.last_page > 1;
    const headerCellSx = {
        fontSize: '0.78rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'text.secondary',
        py: 1.6,
    };
    const bodyCellSx = {
        fontSize: '0.9rem',
        py: 1.5,
    };

    return (
        <Stack spacing={2}>
            <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="medium">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={headerCellSx}>icono</TableCell>
                            <TableCell sx={headerCellSx}>ID</TableCell>
                            <TableCell sx={headerCellSx}>{labels.fecha}</TableCell>
                            <TableCell sx={headerCellSx}>{labels.telefono}</TableCell>
                            <TableCell sx={headerCellSx}>{labels.agente}</TableCell>
                            <TableCell sx={headerCellSx}>{labels.contacto}</TableCell>
                            <TableCell sx={headerCellSx}>{labels.duracion}</TableCell>
                            <TableCell sx={headerCellSx}>{labels.archivo}</TableCell>
                            <TableCell sx={headerCellSx}>{labels.acciones}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                    {labels.cargando}
                                </TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        {labels.noLlamadas}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((cdr) => (
                                <TableRow key={cdr.id} hover>
                                    <TableCell sx={bodyCellSx}>
                                        <PhoneOutlinedIcon
                                            fontSize="small"
                                            sx={{ color: 'success.main', display: 'block' }}
                                            aria-hidden
                                        />
                                    </TableCell>
                                    <TableCell sx={bodyCellSx}>{cdr.id}</TableCell>
                                    <TableCell sx={bodyCellSx}>{formatCallDate(cdr.calldate)}</TableCell>
                                    <TableCell sx={bodyCellSx}>{cdr.phone}</TableCell>
                                    <TableCell sx={bodyCellSx}>
                                        {cdr.agent ? (
                                            `${cdr.agent.name} ${cdr.agent.surname}`
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {labels.sinAgente}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={bodyCellSx}>
                                        {cdr.contact?.name ? (
                                            cdr.contact.name
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {labels.sinContacto}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={bodyCellSx}>{formatDuration(cdr.total_duration)}</TableCell>
                                    <TableCell sx={bodyCellSx}>
                                        {cdr.audio_url ? (
                                            <AppAudio src={cdr.audio_url} fallbackText={labels.audioNoSoporte} />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {labels.sinArchivo}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={bodyCellSx}>
                                        <Tooltip title="Eliminar">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => onDelete(cdr.id)}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {hasPages && meta ? (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        flexWrap: 'wrap',
                        px: { xs: 0.5, sm: 1 },
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        Pagina {meta.current_page} de {meta.last_page} ({meta.total} registros)
                    </Typography>
                    <Pagination
                        color="primary"
                        shape="rounded"
                        size="small"
                        siblingCount={0}
                        boundaryCount={1}
                        page={meta.current_page}
                        count={meta.last_page}
                        onChange={(_, value) => onPageChange(value)}
                        disabled={loading}
                    />
                </Box>
            ) : null}
        </Stack>
    );
}
