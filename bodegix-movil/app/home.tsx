import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import api from '../src/utils/api';

type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  rol_id: number;
  empresa_id: number;
};

type Alerta = {
  id: string | number;
  leida?: boolean;
};

const API_BASE =
  process.env.EXPO_PUBLIC_API ||
  (process.env.REACT_NATIVE_API as string) ||
  'http://192.168.1.148:5000';

function extractArray(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.lockers)) return payload.lockers;
  return [];
}

export default function HomeScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [lockersCount, setLockersCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const inicial = useMemo(
    () => (usuario?.nombre?.trim()?.charAt(0)?.toUpperCase() || 'U'),
    [usuario?.nombre]
  );

  const rolTag = useMemo(() => {
    if (!usuario?.rol_id) return 'Empleado';
    if (usuario.rol_id === 1) return 'SuperAdmin';
    if (usuario.rol_id === 2) return 'Admin';
    return 'Empleado';
  }, [usuario?.rol_id]);

  // ---- Helpers ----
  const getAssignedLockersCount = async (userId: number, token: string) => {
    try {
      const r1 = await api.get(`/lockers/usuario/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const arr1 = extractArray(r1.data);
      if (Array.isArray(arr1)) return arr1.length;
    } catch {}
    try {
      const r2 = await api.get('/lockers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = extractArray(r2.data);
      const mine = all.filter(
        (l: any) =>
          Number(l?.usuario_id) === Number(userId) &&
          String(l?.estado).toLowerCase() === 'activo'
      );
      return mine.length;
    } catch {
      return 0;
    }
  };

  const getUnreadAlertsCount = async (userId: number) => {
    // Si tu backend soporta query de no leídas, usa: /api/alertas/usuario/:id?unread=1
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(`${API_BASE}/api/alertas/usuario/${userId}`, {
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: Alerta[] = await resp.json();
      const arr = Array.isArray(data) ? data : [];
      const count = arr.filter((a) => !a.leida).length;
      return count;
    } catch {
      return 0;
    }
  };

  const cargarDatos = useCallback(async () => {
    try {
      const usuarioStr = await AsyncStorage.getItem('usuario');
      const token = await AsyncStorage.getItem('token');

      if (!usuarioStr || !token) {
        setUsuario(null);
        setLockersCount(0);
        setUnreadCount(0);
        return;
      }

      const usr: Usuario = JSON.parse(usuarioStr);
      setUsuario(usr);

      const [lockers, unread] = await Promise.all([
        getAssignedLockersCount(usr.id, token),
        getUnreadAlertsCount(usr.id),
      ]);
      setLockersCount(lockers);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error cargando datos en Home:', error);
      setLockersCount(0);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Refresca cuando la vista gana foco (al volver de Alerts, etc.)
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
    Haptics.selectionAsync();
  }, [cargarDatos]);

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('usuario');
          router.replace('/login');
        },
      },
    ]);
  };

  const go = (path: string) => {
    Haptics.selectionAsync();
    router.push(path as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#ffc285" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0c1b3a', '#112447']} style={styles.flex1}>
      <SafeAreaView style={styles.flex1}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <View style={styles.headerRight}>
            {/* Rol */}
            <View style={styles.roleChip}>
              <Ionicons name="person" size={14} color="#0c1b3a" />
              <Text style={styles.roleText}>{rolTag}</Text>
            </View>

            {/* Campanita de notificaciones */}
            <Animatable.View animation="pulse" iterationCount="infinite" easing="ease-out">
              <TouchableOpacity
                onPress={() => go('/alerts')}
                accessibilityLabel="Notificaciones"
                style={styles.iconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="notifications" size={24} color="#ffc285" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animatable.View>

            {/* Logout */}
            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.iconBtn, { marginLeft: 6 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="log-out-outline" size={22} color="#ffb89a" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffc285" />
          }
        >
          {/* Avatar con anillo */}
          <View style={styles.avatarWrap}>
            <LinearGradient colors={['#ffc285', '#ffd8b0']} style={styles.avatarRing}>
              <View style={styles.avatarCore}>
                <Text style={styles.avatarText}>{inicial}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Bienvenida */}
          <Text style={styles.welcome}>¡Hola!</Text>
          <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
            {usuario?.nombre ?? 'Usuario'}
          </Text>

          {/* Tarjeta resumen */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardIconBox}>
                <Ionicons name="cube-outline" size={20} color="#0c1b3a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Lockers asignados</Text>
                <Text style={styles.cardValue}>{lockersCount}</Text>
              </View>
            </View>
          </View>

          {/* Acciones */}
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => go('/access')}>
              <Ionicons name="key-outline" size={22} color="#0c1b3a" style={{ marginBottom: 6 }} />
              <Text style={styles.actionText}>Código de acceso</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => go('/locker')}>
              <Ionicons name="lock-closed-outline" size={22} color="#0c1b3a" style={{ marginBottom: 6 }} />
              <Text style={styles.actionText}>Mis lockers</Text>
            </TouchableOpacity>
          </View>

          {/* Callout sutil */}
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={16} color="#9fb7ff" />
            <Text style={styles.noteText}>
              Desliza hacia abajo para refrescar tus datos en tiempo real.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0c1b3a' },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { width: 120, height: 40, resizeMode: 'contain' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, borderRadius: 10, position: 'relative' },

  roleChip: {
    backgroundColor: '#ffc285',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  roleText: { marginLeft: 4, fontWeight: '700', color: '#0c1b3a', fontSize: 12 },

  // Badge
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // Body
  scroll: { paddingHorizontal: 20, paddingBottom: 28 },
  avatarWrap: { alignItems: 'center', marginTop: 26 },
  avatarRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },

  welcome: { color: '#dfe6f5', fontSize: 18, textAlign: 'center', marginTop: 14, opacity: 0.9 },
  username: {
    color: '#ffc285',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffc285',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: { color: '#0c1b3a', fontSize: 14, opacity: 0.75 },
  cardValue: { color: '#0c1b3a', fontSize: 22, fontWeight: '800', marginTop: 2 },

  actionsGrid: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#ffc285',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  actionText: { color: '#0c1b3a', fontSize: 15, fontWeight: '700' },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  noteText: { color: '#c6d0e5', fontSize: 12 },
});
