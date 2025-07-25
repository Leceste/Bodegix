import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/usuarios/admin', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error('Error al obtener usuarios:', error);
      }
    };

    fetchUsers();
  }, []);

  // Ordenar por nombre de empresa
  const sortedUsers = [...users].sort((a, b) => {
    const empresaA = a.empresa?.nombre?.toLowerCase() || '';
    const empresaB = b.empresa?.nombre?.toLowerCase() || '';
    return empresaA.localeCompare(empresaB);
  });

  // Filtrar por nombre o correo
  const filteredUsers = sortedUsers.filter(
    (user) =>
      (user.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (user.correo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box display="flex">
      <Sidebar />
      <Box flexGrow={1} p={3}>
        <Topbar title="Administración de Usuarios" />

        <Box display="flex" justifyContent="space-between" mb={3} mt={2}>
          <TextField
            variant="outlined"
            placeholder="Buscar por nombre o correo..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'primary.main' }} />
                </InputAdornment>
              ),
              sx: {
                '& input': {
                  color: 'primary.main',
                },
              },
            }}
          />
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Correo</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Empresa</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Rol</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user, index) => (
                <TableRow
                  key={user.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? 'grey.100' : 'white',
                  }}
                >
                  <TableCell>{user.id || 'N/A'}</TableCell>
                  <TableCell>{user.nombre || 'N/A'}</TableCell>
                  <TableCell>{user.correo || 'N/A'}</TableCell>
                  <TableCell>{user.empresa?.nombre || 'N/A'}</TableCell>
                  <TableCell>
                    {user.rol_id === 1
                      ? 'SuperAdmin'
                      : user.rol_id === 2
                      ? 'Admin Empresa'
                      : 'Empleado'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography align="center" color="text.secondary">
                      No se encontraron usuarios.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default UsersPage;
