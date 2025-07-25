import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  Button, Chip, Alert
} from '@mui/material';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import { jwtDecode } from 'jwt-decode';

const AdministrarSuscripciones = () => {
  const [planes, setPlanes] = useState([]);
  const [suscripcionActiva, setSuscripcionActiva] = useState(true);
  const [empresaId, setEmpresaId] = useState(null);
  const [alerta, setAlerta] = useState('');
  const [planActual, setPlanActual] = useState(null);
  const [suscripcionId, setSuscripcionId] = useState(null); // NUEVO

  useEffect(() => {
    const token = localStorage.getItem('token');
    let decoded = null;

    if (token) {
      decoded = jwtDecode(token);
      setEmpresaId(decoded.empresa_id);
    }

    const cargarDatos = async () => {
      try {
        const resPlanes = await fetch('http://localhost:5000/api/planes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataPlanes = await resPlanes.json();
        setPlanes(dataPlanes);

        const resSus = await fetch('http://localhost:5000/api/suscripciones', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const suscripciones = await resSus.json();

        const activa = suscripciones.find(
          s => s.empresa_id === decoded?.empresa_id && s.estado === 'activa'
        );

        if (!activa) {
          setSuscripcionActiva(false);
          setAlerta('No tienes una suscripción activa. Selecciona un plan para continuar.');
        } else {
          const plan = dataPlanes.find(p => p.id === activa.plan_id);
          setPlanActual(plan);
          setSuscripcionId(activa.id); // guardar ID
        }
      } catch (error) {
        console.error('Error al cargar planes o suscripciones:', error);
      }
    };

    if (decoded) cargarDatos();
  }, []);

  const contratarPlan = async (plan) => {
    const hoy = new Date();
    const fin = new Date();
    fin.setMonth(hoy.getMonth() + 1);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/suscripciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          plan_id: plan.id,
          fecha_inicio: hoy.toISOString().split('T')[0],
          fecha_fin: fin.toISOString().split('T')[0],
          estado: 'activa'
        })
      });

      if (res.ok) {
        const nueva = await res.json();
        setSuscripcionActiva(true);
        setPlanActual(plan);
        setSuscripcionId(nueva.id);
        setAlerta('Suscripción activada correctamente. ¡Gracias!');
      } else {
        const err = await res.json();
        setAlerta(err.error || 'Error al activar la suscripción.');
      }
    } catch (error) {
      console.error('Error en contratación:', error);
      setAlerta('Error al conectar con el servidor.');
    }
  };

  const cancelarSuscripcion = async () => {
    if (!suscripcionId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/suscripciones/${suscripcionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'cancelada' })
      });

      if (res.ok) {
        setSuscripcionActiva(false);
        setPlanActual(null);
        setSuscripcionId(null);
        setAlerta('La suscripción fue cancelada correctamente.');
      } else {
        const err = await res.json();
        setAlerta(err.error || 'Error al cancelar la suscripción.');
      }
    } catch (error) {
      console.error('Error al cancelar:', error);
      setAlerta('Error al conectar con el servidor.');
    }
  };

  return (
    <Box display="flex">
      <Sidebar />
      <Box flexGrow={1} p={3}>
        <Topbar title="Gestión de Suscripciones" />

        <Paper sx={{ p: 3 }}>
          {alerta && <Alert severity={!suscripcionActiva ? 'warning' : 'success'}>{alerta}</Alert>}

          {!suscripcionActiva ? (
            <>
              <Typography variant="h6" gutterBottom>
                Elige un plan para activar tu suscripción:
              </Typography>
              <Grid container spacing={2}>
                {planes.map((plan) => (
                  <Grid item xs={12} sm={4} key={plan.id}>
                    <Card sx={{ boxShadow: 3 }}>
                      <CardContent>
                        <Typography variant="h6" color="primary" gutterBottom>
                          {plan.nombre}
                        </Typography>
                        <Chip label="Mensual" color="info" size="small" sx={{ mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Límite de usuarios: {plan.limite_usuarios}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Lockers: {plan.lockers}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Costo: ${parseFloat(plan.costo).toFixed(2)}/mes
                        </Typography>
                        <Box mt={2}>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => contratarPlan(plan)}
                          >
                            Activar este plan
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Box mt={3}>
                <Typography variant="body2" color="text.disabled">
                  Sección de pago con PayPal próximamente...
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Plan actual: {planActual?.nombre}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usuarios permitidos: {planActual?.limite_usuarios}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lockers incluidos: {planActual?.lockers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Costo mensual: ${parseFloat(planActual?.costo || 0).toFixed(2)}
              </Typography>

              <Box mt={2}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={cancelarSuscripcion}
                >
                  Cancelar suscripción
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default AdministrarSuscripciones;
