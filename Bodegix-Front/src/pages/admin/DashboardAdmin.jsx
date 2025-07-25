// src/pages/admin/DashboardAdmin.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  Lock as LockersIcon,
  Subscriptions as SubscriptionsIcon
} from '@mui/icons-material';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
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
      if (!token) {
        setError('No se encontró token de sesión. Inicia sesión nuevamente.');
        return;
      }

      try {
        const decoded = jwtDecode(token);
        console.log('[DashboardAdmin] Token decodificado:', decoded);
      } catch (err) {
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
      color: 'linear-gradient(135deg, rgb(26, 39, 94), rgb(33, 58, 130))',
    },
    {
      title: 'Total de Lockers',
      value: stats.lockers,
      icon: <LockersIcon fontSize="large" />,
      color: 'linear-gradient(135deg, rgb(199, 90, 14), rgb(233, 119, 47))',
    },
    {
      title: 'Suscripciones Activas',
      value: stats.suscripciones,
      icon: <SubscriptionsIcon fontSize="large" />,
      color: 'linear-gradient(135deg, rgb(26, 39, 94), rgb(33, 58, 130))',
    },
  ];


  return (
    <Box
      display="flex"
      minHeight="100vh"
      sx={{
        background: 'linear-gradient(120deg, #1a2540 70%, #232E4F 100%)',
      }}
    >
      <Sidebar />
      <Box flexGrow={1} p={0} sx={{ minHeight: '100vh' }}>
        <Topbar title="Panel de Administración" />

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
          <Typography
            variant="h4"
            fontWeight="bold"
            letterSpacing={1}
            sx={{ textShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
          >
            Bienvenido al panel de administración de Bodegix
          </Typography>
          <Typography variant="body1" mt={1}>
            Gestiona usuarios, lockers y suscripciones, monitorea todo desde un solo lugar.
          </Typography>
        </Box>

        {/* Mensaje de error */}
        {error && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#ffebee' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        {/* Tarjetas estadísticas */}
        <Grid container spacing={4} mt={1}>
          {statCards.map((stat, i) => (
            <Grid key={i} item xs={12} sm={6} md={4}>
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

        {/* Separador */}
        <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.10)' }} />
      </Box>
    </Box>
  );
};

export default DashboardAdmin;
