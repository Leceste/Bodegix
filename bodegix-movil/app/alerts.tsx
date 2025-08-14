import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Tipo = 'temperatura' | 'humedad' | 'capacidad';
type Severity = 'info' | 'warning' | 'error';

type Alerta = {
  id: string;
  mensaje: string;
  tipo: Tipo;
  severity?: Severity;
  leida?: boolean;
};

const API_BASE =
  process.env.EXPO_PUBLIC_API ||
  (process.env.REACT_NATIVE_API as string) ||
  'http://192.168.1.148:5000';

const TEMA = {
  bg: '#0c1b3a',
  cardFg: '#0c1b3a',
  text: '#ffffff',
  brand: '#ffc285',
  chipBg: '#163165',
  chipActive: '#ffc285',
  borderTemp: '#c0392b',
  borderHum: '#8e44ad',
};

const TIPO_META: Record<Tipo, { icon: keyof typeof Ionicons.glyphMap; base: string; border: string }> = {
  temperatura: { icon: 'thermometer', base: '#ffcccb', border: TEMA.borderTemp },
  humedad: { icon: 'water', base: '#ffeb99', border: TEMA.borderHum },
  capacidad: { icon: 'cube', base: '#d1e7dd', border: '#2c3e50' },
};

export default function AlertsScreen() {
  const navigation = useNavigation();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<Tipo | 'todos'>('todos');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // intervalo de auto-refresh
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getUsuarioId = useCallback(async () => {
    const userStr = await AsyncStorage.getItem('usuario');
    if (!userStr) return null;
    try {
      const u = JSON.parse(userStr);
      const id = Number(u?.id);
      return Number.isFinite(id) ? id : null;
    } catch {
      return null;
    }
  }, []);

  const fetchAlertas = useCallback(async () => {
    setError(null);
    try {
      const id = await getUsuarioId();
      if (!id) {
        setAlertas([]);
        setLastUpdated(new Date());
        return;
      }

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10_000);

      const resp = await fetch(`${API_BASE}/api/alertas/usuario/${id}`, { signal: controller.signal });
      clearTimeout(t);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: Alerta[] = await resp.json();
      setAlertas(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message || 'Error desconocido');
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  }, [getUsuarioId]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  useFocusEffect(
    useCallback(() => {
      fetchAlertas();
      pollRef.current = setInterval(fetchAlertas, 20000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fetchAlertas])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlertas();
    setRefreshing(false);
  }, [fetchAlertas]);

  const filtradas = useMemo(() => {
    return alertas.filter((a) => (filtroTipo === 'todos' ? true : a.tipo === filtroTipo));
  }, [alertas, filtroTipo]);

  const counts = useMemo(() => {
    const c = { todos: alertas.length, temperatura: 0, humedad: 0 };
    for (const a of alertas) {
      if (a.tipo === 'temperatura') c.temperatura++;
      if (a.tipo === 'humedad') c.humedad++;
    }
    return c;
  }, [alertas]);

  const renderItem = ({ item }: { item: Alerta }) => {
    const meta = TIPO_META[item.tipo];
    return (
      <View
        style={[styles.card, { backgroundColor: meta.base, borderLeftColor: meta.border }]}
        accessibilityRole="summary"
        accessible
      >
        <Ionicons name={meta.icon} size={22} color={TEMA.cardFg} style={styles.icon} />
        <Text style={styles.msg} numberOfLines={3}>
          {item.mensaje}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header estilo LockerScreen */}
      <LinearGradient colors={['#0e1d3b', '#17305f']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>Alertas</Text>
      </LinearGradient>

      {/* Contenido */}
      <View style={styles.container}>
        {/* Filtros */}
        <View style={styles.filters}>
          <ChipRow
            options={[
              { key: 'todos', label: `Todos (${counts.todos})` },
              { key: 'temperatura', label: `Temp (${counts.temperatura})` },
              { key: 'humedad', label: `Humedad (${counts.humedad})` },
            ]}
            value={filtroTipo}
            onChange={(k) => setFiltroTipo(k as any)}
          />

          {/* Última actualización */}
          <View style={styles.updatedPill}>
            <Ionicons name="time-outline" size={14} color={TEMA.brand} />
            <Text style={styles.updatedText}>
              {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={TEMA.brand} />
            <Text style={styles.stateText}>Cargando…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>No se pudieron cargar las alertas.</Text>
            <Text style={[styles.stateText, { opacity: 0.7, fontSize: 12 }]}>({error})</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchAlertas}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtradas}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={TEMA.brand}
                colors={[TEMA.brand]}
              />
            }
            ListEmptyComponent={
              <Text style={[styles.stateText, { textAlign: 'center' }]}>No hay alertas.</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

/* ---------- UI auxiliares ---------- */

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <View style={styles.chipsRow}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.chip, { backgroundColor: active ? TEMA.chipActive : TEMA.chipBg }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, { color: active ? '#0c1b3a' : '#fff' }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ---------- Estilos ---------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TEMA.bg },

  // Header (igual estilo que LockerScreen)
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

  container: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },

  // Filtros y sello de actualización
  filters: { marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '600' },

  updatedPill: {
    marginTop: 10,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  updatedText: { color: TEMA.brand, fontSize: 12 },

  listContent: { paddingVertical: 8, paddingBottom: 24 },

  // Tarjeta de alerta
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: '#fff',
  },
  icon: { marginRight: 12 },
  msg: { color: TEMA.cardFg, fontSize: 16, fontWeight: '700', flex: 1 },

  // Estados
  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  stateText: { color: TEMA.text, fontSize: 14 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: TEMA.brand,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  retryText: { color: '#0c1b3a', fontWeight: '700' },
});
