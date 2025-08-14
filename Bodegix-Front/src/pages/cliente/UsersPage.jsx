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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import Sidebar from '../../components/Layout/Sidebar';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/usuarios', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await res.json();
                setUsers(data);
            } catch (error) {
                console.error('Error al obtener usuarios:', error);
            }
        };

        fetchUsers();
    }, []);

    const filteredUsers = users.filter((user) =>
        (user.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (user.correo || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box display="flex">
            <Sidebar />
            <Box flexGrow={1} p={3}>
                <Box display="flex" justifyContent="space-between" mb={3} mt={2}>
                    <TextField
                        variant="outlined"
                        placeholder="Buscar usuarios..."
                        size="small"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: <SearchIcon color="action" />,
                        }}
                    />
                </Box>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'primary.main' }}>
                                <TableCell sx={{ color: 'white' }}>ID</TableCell>
                                <TableCell sx={{ color: 'white' }}>Nombre</TableCell>
                                <TableCell sx={{ color: 'white' }}>Correo</TableCell>
                                <TableCell sx={{ color: 'white' }}>Empresa</TableCell>
                                <TableCell sx={{ color: 'white' }}>Rol</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
    {filteredUsers.map((user) => (
        <TableRow key={user.id}>
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
</TableBody>

                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default UsersPage;
