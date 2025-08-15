import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { LockerNavigationProp } from '../src/navigation';

// ⚠️ Ajusta esta URL según tu entorno
const API_BASE = 'http://192.168.1.147:5000';

type Locker = {
  id: number;
  identificador: string;   // "001", "002", etc.
  ubicacion: string;
  tipo: string;
  estado: 'activo' | 'inactivo' | string;
  usuario_id?: number | null;
  sensores?: {
    temperatura: number;
    humedad: number;
    peso?: number | null;
    fecha: string;
  } | null;
};

export default function LockerScreen() {
  const navigation = useNavigation<LockerNavigationProp>();
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [currentLocker, setCurrentLocker] = useState<Locker | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animación sutil de borde exterior
  const colorAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 2, duration: 3500, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 0, duration: 3500, easing: Easing.linear, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const glowColor = colorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#FFB866', '#60D6FF', '#6DFF8C'],
  });

  const fetchLockers = useCallback(async () => {
    const controller = new AbortController();
    try {
      setLoading(true);
      const userStr = await AsyncStorage.getItem('usuario');
      if (!userStr) {
        setLockers([]);
        setCurrentLocker(null);
        return;
      }
      const usuario = JSON.parse(userStr);
      const userId: number = Number(usuario?.id);
      if (!userId) {
        setLockers([]);
        setCurrentLocker(null);
        return;
      }
      const url = `${API_BASE}/api/lockers-with-sensors?user_id=${userId}`;
      const resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(`Backend no OK (${resp.status}) ${msg}`);
      }
      const data: Locker[] = await resp.json();
      const safeData = data.map(l => ({ ...l, sensores: l.sensores ?? null }));
      setLockers(safeData);
      setCurrentLocker(prev => {
        if (!prev) return safeData[0] ?? null;
        // Mantén el seleccionado si aún existe; si no, toma el primero
        const stillExists = safeData.find(l => l.id === prev.id);
        return stillExists ?? (safeData[0] ?? null);
      });
    } catch (err) {
      console.error('Error al obtener lockers+sensores:', err);
      setLockers([]);
      setCurrentLocker(null);
    } finally {
      setLoading(false);
      controller.abort();
    }
  }, []);

  useEffect(() => {
    fetchLockers();
  }, [fetchLockers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLockers();
    setRefreshing(false);
  }, [fetchLockers]);

  const otherLockers = lockers.filter(l => l.id !== currentLocker?.id);

  // Subcomponentes UI
  const StatusPill = ({ estado }: { estado: string }) => {
    const isActive = estado === 'activo';
    return (
      <View style={[styles.pill, { backgroundColor: isActive ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 99, 99, 0.15)', borderColor: isActive ? '#46d26d' : '#ff6b6b' }]}>
        <Icon name={isActive ? 'checkmark-circle' : 'close-circle'} size={16} color={isActive ? '#46d26d' : '#ff6b6b'} />
        <Text style={[styles.pillText, { color: isActive ? '#46d26d' : '#ff6b6b' }]}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Text>
      </View>
    );
  };

  const SensorChip = ({ icon, label, value, unit, muted = false }: { icon: string; label: string; value?: number | string; unit?: string; muted?: boolean }) => (
    <View style={[styles.sensorChip, muted && { opacity: 0.6 }]}>
      <Icon name={icon} size={18} color="#0c1b3a" style={{ marginRight: 6 }} />
      <View>
        <Text style={styles.sensorLabel}>{label}</Text>
        <Text style={styles.sensorValue}>
          {value === null || value === undefined || value === 'N/A' ? 'N/A' : `${value}${unit ?? ''}`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={['#0e1d3b', '#17305f']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>Lockers</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffc285" />}
      >
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#ffc285" size="large" />
            <Text style={{ color: '#c9d4ff', marginTop: 10 }}>Cargando lockers…</Text>
          </View>
        ) : lockers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="cube-outline" color="#8aa3ff" size={36} />
            <Text style={styles.emptyTitle}>Sin lockers asignados</Text>
            <Text style={styles.emptyText}>
              Cuando te asignen uno, podrás ver aquí sus valores de temperatura, humedad y peso.
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchLockers}>
              <Icon name="refresh" size={16} color="#0c1b3a" />
              <Text style={styles.refreshBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        ) : currentLocker ? (
          <>
            {/* Tarjeta principal */}
            <Animated.View style={[styles.cardOuter, { shadowColor: glowColor as any }]}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>#{currentLocker.identificador}</Text>
                  </View>
                  <StatusPill estado={currentLocker.estado} />
                </View>

                <View style={styles.row}>
                  <Icon name="location" size={18} color="#3556a8" style={{ marginRight: 8 }} />
                  <Text style={styles.rowText}>Ubicación: {currentLocker.ubicacion}</Text>
                </View>
                <View style={styles.row}>
                  <Icon name="albums" size={18} color="#3556a8" style={{ marginRight: 8 }} />
                  <Text style={styles.rowText}>Tipo: {currentLocker.tipo}</Text>
                </View>

                {/* Sensores */}
                {currentLocker.estado === 'activo' && currentLocker.sensores ? (
                  <View style={styles.sensorsGrid}>
                    <SensorChip icon="thermometer" label="Temperatura" value={currentLocker.sensores.temperatura} unit="°C" />
                    <SensorChip icon="water" label="Humedad" value={currentLocker.sensores.humedad} unit="%" />
                    <SensorChip
                      icon="scale"
                      label="Peso"
                      value={
                        currentLocker.sensores.peso !== null && currentLocker.sensores.peso !== undefined
                          ? currentLocker.sensores.peso
                          : 'N/A'
                      }
                      unit={currentLocker.sensores.peso !== null && currentLocker.sensores.peso !== undefined ? ' kg' : ''}
                      muted={currentLocker.sensores.peso === null || currentLocker.sensores.peso === undefined}
                    />
                  </View>
                ) : currentLocker.estado === 'activo' ? (
                  <Text style={[styles.rowText, { marginTop: 8 }]}>Sin datos de sensores</Text>
                ) : null}

                <TouchableOpacity style={styles.primaryBtn} onPress={fetchLockers}>
                  <Icon name="refresh" size={18} color="#0c1b3a" />
                  <Text style={styles.primaryBtnText}>Recargar datos</Text>
                </TouchableOpacity>

                {currentLocker.sensores?.fecha ? (
                  <Text style={styles.timestamp}>
                    Última lectura: {new Date(currentLocker.sensores.fecha).toLocaleString()}
                  </Text>
                ) : null}
              </View>
            </Animated.View>

            {/* Otros lockers */}
            {otherLockers.length > 0 && (
              <View style={{ width: '100%' }}>
                <Text style={styles.subtitle}>Otros lockers</Text>
                <View style={styles.lockersWrap}>
                  {otherLockers.map(l => (
                    <TouchableOpacity key={l.id} style={styles.smallCard} onPress={() => setCurrentLocker(l)}>
                      <Text style={styles.smallCardId}>#{l.identificador}</Text>
                      <StatusPill estado={l.estado} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c1b3a' },

  header: {
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  backBtn: { position: 'absolute', left: 16, top: 56, padding: 6 },
  logo: { width: 110, height: 34, resizeMode: 'contain', alignSelf: 'center' },
  headerTitle: {
    marginTop: 8,
    color: '#eaf1ff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  container: {
    padding: 20,
    alignItems: 'center',
  },

  loadingBlock: { marginTop: 60, alignItems: 'center' },

  // Card principal
  cardOuter: {
    width: '100%',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    marginBottom: 22,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: '#ffc285',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: '#0c1b3a', fontWeight: '800', fontSize: 16 },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rowText: { color: '#18325e', fontSize: 16 },

  sensorsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sensorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f6ff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d9e3ff',
  },
  sensorLabel: { color: '#3a5fb0', fontSize: 12, marginBottom: 2 },
  sensorValue: { color: '#0c1b3a', fontSize: 16, fontWeight: '700' },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#ffc285',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#0c1b3a', fontSize: 15, fontWeight: '800' },

  timestamp: { marginTop: 10, textAlign: 'center', color: '#6b7ea9', fontSize: 12 },

  // Otros lockers
  subtitle: {
    color: '#eaf1ff',
    fontSize: 16,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  lockersWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  smallCard: {
    backgroundColor: '#112447',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  smallCardId: { color: '#ffcf9a', fontWeight: '800', fontSize: 14, marginBottom: 6 },

  // Pills
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 6,
  },
  pillText: { fontWeight: '700', fontSize: 12 },

  // Vacío
  emptyCard: {
    backgroundColor: '#0f1e3b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: { color: '#eaf1ff', fontWeight: '800', fontSize: 18, marginTop: 8 },
  emptyText: { color: '#b8c6ea', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  refreshBtn: {
    marginTop: 14,
    backgroundColor: '#ffc285',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  refreshBtnText: { color: '#0c1b3a', fontWeight: '800' },
});
