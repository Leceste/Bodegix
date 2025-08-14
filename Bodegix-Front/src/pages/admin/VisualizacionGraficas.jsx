// src/pages/admin/VisualizacionGraficas.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Divider,
  Stack,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Skeleton,
  Tooltip,
} from '@mui/material';
import Sidebar from '../../components/Layout/Sidebar';

import SearchIcon from '@mui/icons-material/Search';
import CachedIcon from '@mui/icons-material/Cached';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import TimelineIcon from '@mui/icons-material/Timeline';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer
} from 'recharts';

// ---------- helpers de UI ----------
const LINE_COLORS = ['#4FC3F7', '#FFB74D', '#81C784', '#BA68C8', '#64B5F6', '#FF8A65', '#AED581', '#9575CD', '#4DB6AC', '#F06292'];

const statusColor = (estado) => {
  const e = String(estado || '').toLowerCase();
  if (e === 'activa') return { chip: 'success', bar: '#4CAF50' };
  if (e === 'inactiva') return { chip: 'error', bar: '#E53935' };
  return { chip: 'warning', bar: '#FFB300' };
};

const getStatusIcon = (estado) => {
  const e = String(estado || '').toLowerCase();
  if (e === 'activa') return <CheckCircleIcon sx={{ color: '#4CAF50' }} fontSize="large" />;
  if (e === 'inactiva') return <HighlightOffIcon sx={{ color: '#E53935' }} fontSize="large" />;
  return <WarningIcon sx={{ color: '#FFB300' }} fontSize="large" />;
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
};

// ---------- componente principal ----------
const VisualizacionGraficas = () => {
  const [suscripciones, setSuscripciones] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todas'); // todas | activa | inactiva | otra

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchDatos = useCallback(async () => {
    try {
      setLoading(true);
      const [resEmpresas, resSuscripciones] = await Promise.all([
        fetch('/api/empresas', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/suscripciones', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const empresasData = await resEmpresas.json();
      const suscripcionesData = await resSuscripciones.json();

      setEmpresas(Array.isArray(empresasData) ? empresasData : []);
      setSuscripciones(Array.isArray(suscripcionesData) ? suscripcionesData : []);
    } catch (err) {
      console.error('Error al obtener empresas o suscripciones:', err);
      setEmpresas([]);
      setSuscripciones([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  // --- Última suscripción por empresa (para cards) ---
  const ultimasSuscripciones = useMemo(() => {
    const map = new Map(); // empresaId -> sub más reciente
    for (const sub of suscripciones) {
      const empresaId = sub?.empresa?.id ?? sub?.empresa_id;
      if (!empresaId) continue;
      const current = map.get(empresaId);
      const f = new Date(sub.fecha_inicio);
      if (!current || f > new Date(current.fecha_inicio)) {
        map.set(empresaId, sub);
      }
    }
    return Array.from(map.values());
  }, [suscripciones]);

  const empresasConSuscripcionIds = useMemo(
    () => new Set(ultimasSuscripciones.map((s) => s?.empresa?.id ?? s?.empresa_id)),
    [ultimasSuscripciones]
  );

  const empresasSinSuscripcion = useMemo(
    () => empresas.filter((e) => !empresasConSuscripcionIds.has(e.id)),
    [empresas, empresasConSuscripcionIds]
  );

  // KPI
  const kpis = useMemo(() => {
    const totalEmpresas = empresas.length;
    const activas = ultimasSuscripciones.filter(s => String(s?.estado || '').toLowerCase() === 'activa').length;
    const inactivas = ultimasSuscripciones.filter(s => String(s?.estado || '').toLowerCase() === 'inactiva').length;
    const sinSub = empresasSinSuscripcion.length;
    return { totalEmpresas, activas, inactivas, sinSub };
  }, [empresas, ultimasSuscripciones, empresasSinSuscripcion]);

  // filtros de tarjetas
  const listaTarjetas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    const matchTexto = (nombre) =>
      !termino || String(nombre || '').toLowerCase().includes(termino);

    let cards = ultimasSuscripciones
      .filter((s) => matchTexto(s?.empresa?.nombre))
      .filter((s) => {
        const e = String(s?.estado || '').toLowerCase();
        if (estado === 'todas') return true;
        if (estado === 'activa') return e === 'activa';
        if (estado === 'inactiva') return e === 'inactiva';
        return e !== 'activa' && e !== 'inactiva'; // "otra"
      });

    // Incluye también empresas sin suscripción si el filtro lo permite
    const sinSubIncluidas =
      (estado === 'todas' || estado === 'inactiva' || estado === 'otra') // decide si aparecen
        ? empresasSinSuscripcion.filter((e) => matchTexto(e?.nombre)).map((e) => ({
            __noSub: true,
            empresa: e,
          }))
        : [];

    return { cards, sinSubIncluidas };
  }, [ultimasSuscripciones, empresasSinSuscripcion, busqueda, estado]);

  const handleEmpresaClick = (empresaId) => {
    const seleccionada = empresas.find((e) => e.id === empresaId);
    setEmpresaSeleccionada(seleccionada || null);
  };

  // --- Serie mensual general por empresa ---
  const dataGrafica = useMemo(() => {
    const map = new Map(); // mes -> { empresaNombre: count }
    for (const sub of suscripciones) {
      const mes = new Date(sub.fecha_inicio).toISOString().slice(0, 7); // YYYY-MM
      const empresaNombre = sub?.empresa?.nombre || 'Desconocida';
      if (!map.has(mes)) map.set(mes, {});
      map.get(mes)[empresaNombre] = (map.get(mes)[empresaNombre] || 0) + 1;
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
    return sorted.map(([mes, obj]) => ({ mes, ...obj }));
  }, [suscripciones]);

  const nombresEmpresas = useMemo(() => {
    const set = new Set();
    for (const sub of suscripciones) {
      if (sub?.empresa?.nombre) set.add(sub.empresa.nombre);
    }
    return Array.from(set);
  }, [suscripciones]);

  // --- Serie individual para empresa seleccionada ---
  const dataEmpresaIndividual = useMemo(() => {
    if (!empresaSeleccionada) return [];
    const map = new Map(); // mes -> total
    for (const sub of suscripciones) {
      const empresaId = sub?.empresa?.id ?? sub?.empresa_id;
      if (empresaId !== empresaSeleccionada.id) continue;
      const mes = new Date(sub.fecha_inicio).toISOString().slice(0, 7);
      map.set(mes, (map.get(mes) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([mes, Total]) => ({ mes, Total }));
  }, [suscripciones, empresaSeleccionada]);

  return (
    <Box display="flex" minHeight="100vh" sx={{ background: 'linear-gradient(120deg, #1a2540 70%, #232E4F 100%)' }}>
      <Sidebar />
      <Box flexGrow={1} p={0}>

        {/* Hero con KPIs */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1976d2 60%, #00c6fb 100%)',
            px: 4, py: 3,
            borderRadius: '0 0 24px 24px',
            color: '#fff',
            mb: 4,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Estado y evolución de suscripciones
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.95 }}>
                Filtra por estado o busca por nombre de empresa. Haz clic en una tarjeta para ver su historial.
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              {[
                { label: 'Empresas', value: kpis.totalEmpresas },
                { label: 'Activas', value: kpis.activas },
                { label: 'Inactivas', value: kpis.inactivas },
                { label: 'Sin suscripción', value: kpis.sinSub },
              ].map((k) => (
                <Paper key={k.label} elevation={6} sx={{ px: 2.5, py: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', color: '#fff', minWidth: 130, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={800}>{k.value}</Typography>
                  <Typography variant="caption" sx={{ letterSpacing: .3 }}>{k.label}</Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>

          {/* Filtros */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={3} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              size="small"
              placeholder="Buscar empresa…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#fff' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: 260,
                '& .MuiInputBase-root': { color: '#fff' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.6)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
              }}
            />

            <ToggleButtonGroup
              exclusive
              value={estado}
              onChange={(_e, v) => v && setEstado(v)}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                borderRadius: 2,
                '& .MuiToggleButton-root': {
                  color: '#fff',
                  border: 'none',
                },
                '& .Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.25) !important',
                  fontWeight: 700,
                },
              }}
            >
              <ToggleButton value="todas">Todas</ToggleButton>
              <ToggleButton value="activa">Activas</ToggleButton>
              <ToggleButton value="inactiva">Inactivas</ToggleButton>
              <ToggleButton value="otra">Otras</ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Refrescar">
              <span>
                <IconButton onClick={fetchDatos} sx={{ color: '#fff' }}>
                  <CachedIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        <Box px={3}>

          {/* Tarjetas */}
          {loading ? (
            <Grid container spacing={3}>
              {[...Array(6)].map((_, i) => (
                <Grid key={i} item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Skeleton variant="rectangular" height={10} sx={{ mb: 2 }} />
                    <Skeleton variant="circular" width={48} height={48} sx={{ mx: 'auto', mb: 1 }} />
                    <Skeleton variant="text" height={28} />
                    <Skeleton variant="text" width="60%" />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {/* Con suscripción */}
              {listaTarjetas.cards.map((sub) => {
                const empresaId = sub?.empresa?.id ?? sub?.empresa_id;
                const empresaNombre = sub?.empresa?.nombre || 'Sin Empresa';
                const estadoStr = String(sub?.estado || '').toLowerCase();
                const sc = statusColor(estadoStr);
                return (
                  <Grid item xs={12} sm={6} md={4} key={`sub-${sub.id}`}>
                    <Paper
                      onClick={() => handleEmpresaClick(empresaId)}
                      elevation={6}
                      sx={{
                        cursor: 'pointer',
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: '#0f172a',
                        color: '#e6e9ef',
                        border: '1px solid rgba(255,255,255,0.08)',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'transform .18s, box-shadow .18s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 40px rgba(0,0,0,.25)' },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          height: 6,
                          bgcolor: sc.bar,
                        },
                      }}
                    >
                      <Stack alignItems="center" spacing={1} mt={0.5}>
                        {getStatusIcon(estadoStr)}
                        <Typography variant="h6" sx={{ color: '#fff' }}>
                          {empresaNombre}
                        </Typography>
                        <Chip label={estadoStr} color={sc.chip} size="small" sx={{ fontWeight: 700 }} />
                      </Stack>

                      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />

                      <Stack spacing={0.5}>
                        <Typography variant="body2" sx={{ color: '#cdd7f5' }}>
                          <BusinessIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Plan: <b>{sub?.plan?.nombre || 'Sin plan'}</b>
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#cdd7f5' }}>
                          <CalendarTodayIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Inicio: <b>{fmtDate(sub?.fecha_inicio)}</b>
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#cdd7f5' }}>
                          <CalendarTodayIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Fin: <b>{fmtDate(sub?.fecha_fin)}</b>
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                );
              })}

              {/* Sin suscripción (se muestran según filtro) */}
              {listaTarjetas.sinSubIncluidas.map(({ empresa }) => (
                <Grid item xs={12} sm={6} md={4} key={`no-sub-${empresa.id}`}>
                  <Paper
                    onClick={() => handleEmpresaClick(empresa.id)}
                    elevation={4}
                    sx={{
                      cursor: 'pointer',
                      p: 2.5,
                      borderRadius: 3,
                      bgcolor: '#111a2b',
                      color: '#e6e9ef',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'transform .18s, box-shadow .18s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 40px rgba(0,0,0,.25)' },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        height: 6,
                        bgcolor: '#90A4AE',
                      },
                    }}
                  >
                    <Stack alignItems="center" spacing={1} mt={0.5}>
                      <HighlightOffIcon sx={{ color: '#90A4AE' }} fontSize="large" />
                      <Typography variant="h6" sx={{ color: '#fff' }}>
                        {empresa.nombre}
                      </Typography>
                      <Chip label="Sin suscripción" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }} />
                    </Stack>

                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.12)' }} />

                    <Stack spacing={0.5}>
                      <Typography variant="body2" sx={{ color: '#cdd7f5' }}>
                        <BusinessIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Teléfono: <b>{empresa.telefono || 'N/A'}</b>
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#cdd7f5' }}>
                        Dirección: <b>{empresa.direccion || 'N/A'}</b>
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              ))}

              {listaTarjetas.cards.length === 0 && listaTarjetas.sinSubIncluidas.length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' }}>
                    <Typography>No hay resultados para los filtros aplicados.</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}

          {/* Gráfica mensual general */}
          <Paper
            elevation={0}
            sx={{
              mt: 6,
              p: 3,
              borderRadius: 3,
              bgcolor: '#0f172a',
              color: '#e6e9ef',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ color: '#fff' }}>
                Historial mensual de suscripciones por empresa
              </Typography>
              <TimelineIcon sx={{ color: '#9bb6ff' }} />
            </Stack>

            <Box sx={{ width: '100%', height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGrafica}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="mes" stroke="#cfd8ff" />
                  <YAxis allowDecimals={false} stroke="#cfd8ff" />
                  <RTooltip
                    contentStyle={{ background: '#111a2b', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                    labelStyle={{ color: '#9bb6ff' }}
                  />
                  <Legend wrapperStyle={{ color: '#e6e9ef' }} />
                  {nombresEmpresas.map((nombre, idx) => (
                    <Line
                      key={nombre}
                      type="monotone"
                      dataKey={nombre}
                      stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Gráfica individual por empresa */}
          {empresaSeleccionada && (
            <Paper
              elevation={0}
              sx={{
                mt: 6,
                p: 3,
                borderRadius: 3,
                bgcolor: '#0f172a',
                color: '#e6e9ef',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  Historial mensual — {empresaSeleccionada.nombre}
                </Typography>
                <Tooltip title="Haz clic en otra tarjeta para cambiar la empresa">
                  <Chip size="small" label="Seleccionada" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }} />
                </Tooltip>
              </Stack>

              {dataEmpresaIndividual.length > 0 ? (
                <Box sx={{ width: '100%', height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataEmpresaIndividual}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="mes" stroke="#cfd8ff" />
                      <YAxis allowDecimals={false} stroke="#cfd8ff" />
                      <RTooltip
                        contentStyle={{ background: '#111a2b', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                        labelStyle={{ color: '#9bb6ff' }}
                      />
                      <Legend wrapperStyle={{ color: '#e6e9ef' }} />
                      <Line type="monotone" dataKey="Total" stroke="#4FC3F7" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="#b7c2d9">
                  Esta empresa aún no tiene suscripciones registradas.
                </Typography>
              )}
            </Paper>
          )}

          <Box sx={{ height: 48 }} />
        </Box>
      </Box>
    </Box>
  );
};

export default VisualizacionGraficas;
