// src/pages/admin/SettingsPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  MenuItem
} from '@mui/material';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import { AuthContext } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

const SettingsPage = () => {
  const { user, logout } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    contraseña: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;
  const userId = decoded?.id;

  // Fetch usuario
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/usuarios/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('No se pudo obtener usuario');
        const data = await res.json();
        setFormData({
          nombre: data.nombre || '',
          correo: data.correo || '',
          contraseña: '',
        });
      } catch (err) {
        setError('Error al cargar datos del usuario.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, token]);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar usuario');
      }
      await res.json();
      setMessage('Datos actualizados correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" minHeight="100vh">
      <Sidebar />
      <Box flexGrow={1} p={3}>
        <Topbar title="Configuración" />
        <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Ajustes de Perfil
          </Typography>
          {loading && <CircularProgress sx={{ mb: 2 }} />}
          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Correo"
              name="correo"
              type="email"
              value={formData.correo}
              onChange={handleChange}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Contraseña (dejar vacío para no cambiar)"
              name="contraseña"
              type="password"
              value={formData.contraseña}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
              disabled={loading}
              fullWidth
            >
              Guardar Cambios
            </Button>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};

export default SettingsPage;
