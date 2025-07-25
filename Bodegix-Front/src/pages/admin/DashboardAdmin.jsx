import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import {
  People as PeopleIcon,
  Lock as LockersIcon,
  Subscriptions as SubscriptionsIcon,
} from '@mui/icons-material';
import { jwtDecode } from 'jwt-decode';

const DashboardAdmin = () => {
  const [stats, setStats] = useState({
    usuarios: 0,
    lockers: 0,
    suscripciones: 0,
  });

  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      console.log('[DashboardAdmin] Token usado:', token);

      if (!token) {
        setError('No se encontró token de sesión. Inicia sesión nuevamente.');
        return;
      }

      let decodedToken;
      try {
        decodedToken = jwtDecode(token);
        console.log('[DashboardAdmin] Token decodificado:', decodedToken);
      } catch (e) {
        setError('Token inválido. Inicia sesión nuevamente.');
        return;
      }

      try {
        const endpoints = [
          { url: 'http://localhost:5000/api/usuarios/admin', key: 'usuarios' },
          { url: 'http://localhost:5000/api/lockers', key: 'lockers' },
          { url: 'http://localhost:5000/api/suscripciones', key: 'suscripciones' },
        ];

        const results = {};

        for (const endpoint of endpoints) {
          const res = await fetch(endpoint.url, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          const text = await res.text();
          console.log(`[DashboardAdmin] Respuesta de ${endpoint.url}:`, text);

          if (!res.ok) {
            throw new Error(`Error en ${endpoint.url}: Status ${res.status}`);
          }

          const data = JSON.parse(text);

          if (endpoint.key === 'suscripciones') {
            results[endpoint.key] = data.filter((s) => s.estado === 'activa').length;
          } else {
            results[endpoint.key] = data.length;
          }
        }

        setStats(results);
        setError('');
      } catch (error) {
        console.error('[DashboardAdmin] Error al cargar estadísticas:', error);
        setError('Error al cargar estadísticas. Revisa la consola para más detalles.');
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Usuarios Registrados',
      value: stats.usuarios,
      icon: <PeopleIcon fontSize="large" />,
    },
    {
      title: 'Total de Lockers',
      value: stats.lockers,
      icon: <LockersIcon fontSize="large" />,
    },
    {
      title: 'Suscripciones Activas',
      value: stats.suscripciones,
      icon: <SubscriptionsIcon fontSize="large" />,
    },
  ];

  return (
    <Box display="flex" bgcolor="#1a2540" minHeight="100vh">
      <Sidebar />
      <Box flexGrow={1} p={3}>
        <Topbar title="Panel de Administración" />

        <Typography variant="h4" fontWeight="bold" gutterBottom mt={2} color="white">
          Bienvenido al panel de administración de Bodegix
        </Typography>

        <Typography variant="body1" color="gray" mb={3}>
          Aquí podrás gestionar usuarios, lockers y suscripciones de tu empresa,
          así como monitorear el uso de los lockers de forma centralizada.
        </Typography>

        {error && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#ffebee' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        <Grid container spacing={3}>
          {statCards.map((stat, index) => (
            <Grid key={index} xs={12} sm={6} md={4}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#ffffff',
                  height: '100%',
                }}
              >
                <Box mb={1} color={index % 2 === 0 ? 'primary.main' : 'secondary.main'}>
                  {stat.icon}
                </Box>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  color={index % 2 === 0 ? 'primary.main' : 'secondary.main'}
                >
                  {stat.value}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" align="center">
                  {stat.title}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardAdmin;
