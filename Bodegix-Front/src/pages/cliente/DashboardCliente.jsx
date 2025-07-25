import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, Paper, Divider } from '@mui/material';
import {
  People as PeopleIcon,
  Lock as LockersIcon,
  Assignment as AssignmentIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import { jwtDecode } from 'jwt-decode';

const DashboardCliente = () => {
  const [lockers, setLockers] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !decoded?.empresa_id) {
        setLoading(false);
        return;
      }

      try {
        const resLockers = await fetch(`/api/lockers?empresa_id=${decoded.empresa_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const lockersData = await resLockers.json();
        setLockers(Array.isArray(lockersData) ? lockersData : []);

        const resEmpleados = await fetch('/api/usuarios/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const empleadosData = await resEmpleados.json();
        setEmpleados(Array.isArray(empleadosData) ? empleadosData : []);
      } catch (err) {
        setError('Error al cargar datos. Revisa la consola.');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, decoded]);

  const totalLockers = lockers.length;
  const asignados = lockers.filter(l => l.estado === 'activo').length;
  const disponibles = lockers.filter(l => l.estado === 'inactivo').length;
  const totalEmpleados = empleados.length;

const statCards = [
  {
    title: 'Total de Lockers',
    value: totalLockers,
    icon: <LockersIcon fontSize="large" />,
    color: 'linear-gradient(135deg, rgb(26, 39, 94), rgb(33, 58, 130))',
  },
  {
    title: 'Asignados',
    value: asignados,
    icon: <AssignmentIcon fontSize="large" />,
    color: 'linear-gradient(135deg, rgb(199, 90, 14), rgb(233, 119, 47))',
  },
  {
    title: 'Disponibles',
    value: disponibles,
    icon: <StorageIcon fontSize="large" />,
    color: 'linear-gradient(135deg, rgb(26, 39, 94), rgb(33, 58, 130))',
  },
  {
    title: 'Total de Empleados',
    value: totalEmpleados,
    icon: <PeopleIcon fontSize="large" />,
    color: 'linear-gradient(135deg, rgb(199, 90, 14), rgb(233, 119, 47))',
  },
];


  return (
    <Box
      display="flex"
      minHeight="100vh"
      sx={{ background: 'linear-gradient(120deg, #1a2540 70%, #232E4F 100%)' }}
    >
      <Sidebar />
      <Box flexGrow={1} p={0} sx={{ minHeight: '100vh' }}>
        <Topbar title="Dashboard Cliente" />

        {/* Banner superior */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1976d2 60%, #00c6fb 100%)',
            p: 4,
            borderRadius: '0 0 32px 32px',
            color: 'white',
            mb: 4,
          }}
        >
          <Typography variant="h4" fontWeight="bold" letterSpacing={1}>
            Bienvenido al panel de cliente
          </Typography>
          <Typography variant="body1" mt={1}>
            Visualiza el estado de lockers y personal asignado en tu empresa.
          </Typography>
        </Box>

        {/* Errores */}
        {error && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#ffebee' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        {/* Estadísticas */}
        {loading ? (
          <Typography color="white" p={2}>
            Cargando datos...
          </Typography>
        ) : (
          <Grid container spacing={4} mt={1} px={3}>
            {statCards.map((stat, i) => (
              <Grid key={i} item xs={12} sm={6} md={3}>
                <Paper
                  elevation={6}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 170,
                    background: stat.color,
                    color: '#fff',
                    position: 'relative',
                    boxShadow: '0 8px 36px 0 rgba(0,0,0,0.12)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'scale(1.04)',
                      boxShadow: '0 16px 48px 0 rgba(0,0,0,0.18)',
                    },
                  }}
                >
                  <Box mb={1}>{stat.icon}</Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stat.value}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.93 }}>
                    {stat.title}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Separador */}
        <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.10)' }} />
      </Box>
    </Box>
  );
};

export default DashboardCliente;
