import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import { jwtDecode } from 'jwt-decode';

const RegistroEmpleado = () => {
  const [formData, setFormData] = useState({ nombre: '', correo: '', contraseña: '' });
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [token, setToken] = useState('');
  const [empresaId, setEmpresaId] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const decoded = jwtDecode(storedToken);
      setEmpresaId(decoded.empresa_id);
      setToken(storedToken);
      fetchEmpleados(storedToken, decoded.empresa_id);
    }
  }, []);

  const fetchEmpleados = async (token, empresaId) => {
    try {
      const res = await fetch('/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const empleadosEmpresa = data.filter(emp => emp.rol_id === 3 && emp.empresa_id === empresaId);
      setEmpleados(empleadosEmpresa);
    } catch (err) {
      console.error('Error al obtener empleados:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    try {
      if (!token || !empresaId) {
        setError('Sesión inválida. Vuelve a iniciar sesión.');
        return;
      }

      const body = {
        nombre: formData.nombre,
        correo: formData.correo,
        contraseña: formData.contraseña,
        rol_id: 3,
        empresa_id: empresaId,
      };

      const url = empleadoSeleccionado
        ? `/api/usuarios/${empleadoSeleccionado.id}`
        : '/api/usuarios';

      const method = empleadoSeleccionado ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar empleado');
      }

      setSuccess(empleadoSeleccionado ? 'Empleado actualizado.' : 'Empleado registrado.');
      setFormData({ nombre: '', correo: '', contraseña: '' });
      setEmpleadoSeleccionado(null);
      fetchEmpleados(token, empresaId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditar = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setFormData({
      nombre: empleado.nombre,
      correo: empleado.correo,
      contraseña: ''
    });
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este empleado?')) return;

    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al eliminar empleado');
      fetchEmpleados(token, empresaId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box display="flex">
      <Sidebar />
      <Box flexGrow={1} p={3}>
        <Topbar title="Registrar Empleado" />
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {empleadoSeleccionado ? 'Editar Empleado' : 'Formulario de registro de empleados'}
          </Typography>

          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  fullWidth required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Correo Electrónico"
                  name="correo"
                  type="email"
                  value={formData.correo}
                  onChange={handleChange}
                  fullWidth required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contraseña"
                  name="contraseña"
                  type="password"
                  value={formData.contraseña}
                  onChange={handleChange}
                  fullWidth required={!empleadoSeleccionado}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button type="submit" variant="contained" color="primary" fullWidth>
                  {empleadoSeleccionado ? 'Actualizar Empleado' : 'Registrar Empleado'}
                </Button>
              </Grid>
              {empleadoSeleccionado && (
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    onClick={() => {
                      setEmpleadoSeleccionado(null);
                      setFormData({ nombre: '', correo: '', contraseña: '' });
                    }}
                  >
                    Cancelar Edición
                  </Button>
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>

        {/* Tabla de empleados */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Empleados Registrados en tu Empresa
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                  <TableCell sx={{ color: '#fff' }}>Nombre</TableCell>
                  <TableCell sx={{ color: '#fff' }}>Correo</TableCell>
                  <TableCell sx={{ color: '#fff' }}>Teléfono</TableCell>
                  <TableCell sx={{ color: '#fff' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {empleados.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.nombre}</TableCell>
                    <TableCell>{emp.correo}</TableCell>
                    <TableCell>{emp.empresa?.nombre || 'N/A'}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                        onClick={() => handleEditar(emp)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleEliminar(emp.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
};

export default RegistroEmpleado;
