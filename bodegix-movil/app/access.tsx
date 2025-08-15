// screens/Access.tsx
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../src/types';
import api from '../src/utils/api';

type Locker = {
  id: number;
  identificador: string;
  ubicacion: string;
  used?: boolean;
};

type AccessScreenProp = NativeStackNavigationProp<RootStackParamList, 'Access'>;

type QrPayload = {
  code: string;
  expiresAt: string; // ISO
  ttlSeconds: number; // ej. 15
};

type QrStatus = 'pending' | 'used' | 'expired';

export default function Access() {
  const navigation = useNavigation<AccessScreenProp>();
  const route = useRoute();
  const routeLockerId = (route.params as { lockerId?: number })?.lockerId;

  const [lockers, setLockers] = useState<Locker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [qrVisible, setQrVisible] = useState<boolean>(false);
  const [activeLocker, setActiveLocker] = useState<Locker | null>(null);
  const [qrData, setQrData] = useState<QrPayload | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatus>('pending');
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;

  // ===== Animación para el botón flotante =====
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  // ===== Cargar lockers =====
  const fetchLockers = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Sesión', 'Inicia sesión nuevamente.');
        navigation.navigate('Login' as never);
        return;
      }
      const { data } = await api.get('/movil/lockers-asignados');
      const items: Locker[] = data?.lockers ?? data?.data ?? data ?? [];
      setLockers(Array.isArray(items) ? items : []);
    } catch (err: any) {
      console.error('fetchLockers error', err?.message);
      Alert.alert('Error', 'No se pudieron cargar tus lockers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchLockers();
  }, [fetchLockers]);

  // Si viene lockerId por ruta, abrimos el modal de QR cuando ya están los lockers
  useEffect(() => {
    if (!routeLockerId || lockers.length === 0) return;
    const found = lockers.find(l => l.id === routeLockerId);
    if (found) {
      handleGenerateQR(found).catch(() => {});
    }
  }, [routeLockerId, lockers]);

  // ===== Cuenta regresiva y sondeo =====
  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback((ttl: number) => {
    setSecondsLeft(ttl);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          setQrStatus(s => (s === 'used' ? 'used' : 'expired'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startPolling = useCallback((code: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/movil/accesos/qr/${encodeURIComponent(code)}/status`);
        const status = (data?.status as QrStatus) ?? 'pending';
        setQrStatus(status);
        if (status === 'used' || status === 'expired') {
          clearTimers();
        }
      } catch (err) {
        // Si falla el sondeo, no cerramos de inmediato; seguimos intentando hasta que expire
        // console.warn('poll error', err);
      }
    }, 1500);
  }, [clearTimers]);

  // ===== Generar QR =====
  const handleGenerateQR = useCallback(
    async (locker: Locker) => {
      try {
        setActiveLocker(locker);
        setQrStatus('pending');
        setQrData(null);
        setQrVisible(true);

        const { data } = await api.post('/movil/accesos/qr', { locker_id: locker.id });
        const payload: QrPayload = {
          code: data?.code,
          expiresAt: data?.expiresAt,
          ttlSeconds: Number(data?.ttlSeconds ?? 15),
        };

        if (!payload?.code) {
          throw new Error('Respuesta inválida: faltan datos del QR.');
        }

        setQrData(payload);
        startCountdown(payload.ttlSeconds);
        startPolling(payload.code);
      } catch (err: any) {
        console.error('handleGenerateQR error', err?.message);
        Alert.alert('Error', err?.response?.data?.message ?? 'No se pudo generar el código QR.');
        setQrVisible(false);
        setActiveLocker(null);
        clearTimers();
      }
    },
    [clearTimers, startCountdown, startPolling]
  );

  const closeQr = useCallback(() => {
    setQrVisible(false);
    setActiveLocker(null);
    setQrData(null);
    setQrStatus('pending');
    setSecondsLeft(0);
    clearTimers();
  }, [clearTimers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLockers();
  }, [fetchLockers]);

  const empty = useMemo(() => lockers.length === 0 && !loading, [lockers, loading]);

  // ===== Render =====
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name="arrow-back" size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Accesos a Lockers</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Cargando tus lockers…</Text>
        </View>
      ) : empty ? (
        <View style={styles.center}>
          <Icon name="cube-outline" size={56} />
          <Text style={styles.muted}>No tienes lockers asignados.</Text>
        </View>
      ) : (
        <FlatList
          data={lockers}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.identificador}</Text>
                  <Text style={styles.cardSubtitle}>{item.ubicacion}</Text>
                </View>
                <View style={[styles.badge, item.used ? styles.badgeUsed : styles.badgeReady]}>
                  <Text style={[styles.badgeText, item.used ? styles.badgeTextUsed : styles.badgeTextReady]}>
                    {item.used ? 'Usado recientemente' : 'Listo'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleGenerateQR(item)}
                  activeOpacity={0.8}
                >
                  <Icon name="qr-code-outline" size={18} />
                  <Text style={styles.actionText}>Generar QR (15s)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.secondaryBtn]}
                  onPress={() => Alert.alert('Detalle', `Locker #${item.id}\n${item.identificador}\n${item.ubicacion}`)}
                  activeOpacity={0.8}
                >
                  <Icon name="information-circle-outline" size={18} />
                  <Text style={styles.actionText}>Detalles</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Botón flotante de refresco */}
      <Animated.View style={[styles.fab, { transform: [{ scale: pulse }] }]}>
        <TouchableOpacity onPress={onRefresh} style={styles.fabBtn} activeOpacity={0.9}>
          <Icon name="refresh" size={22} />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal QR */}
      <Modal
        visible={qrVisible}
        animationType="fade"
        transparent
        onRequestClose={closeQr}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeLocker ? `Locker ${activeLocker.identificador}` : 'Locker'}
              </Text>
              <TouchableOpacity onPress={closeQr} style={styles.iconBtn}>
                <Icon name="close" size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrBox}>
              {qrData ? (
                <QRCode value={qrData.code} size={220} />
              ) : (
                <View style={styles.center}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.muted}>Generando QR…</Text>
                </View>
              )}
            </View>

            <View style={styles.statusRow}>
              <Icon
                name={
                  qrStatus === 'used'
                    ? 'checkmark-circle'
                    : qrStatus === 'expired'
                    ? 'time-outline'
                    : 'radio-button-on-outline'
                }
                size={20}
              />
              <Text style={styles.statusText}>
                {qrStatus === 'used' && 'Acceso concedido'}
                {qrStatus === 'expired' && 'QR expirado'}
                {qrStatus === 'pending' && 'Esperando lectura…'}
              </Text>
            </View>

            <View style={styles.timerRow}>
              <Icon name="hourglass-outline" size={18} />
              <Text style={styles.timerText}>
                Expira en {secondsLeft}s
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={closeQr} style={[styles.actionBtn, styles.fullBtn]}>
                <Icon name="checkmark-outline" size={18} />
                <Text style={styles.actionText}>Aceptar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              * El código es de un solo uso y expira automáticamente.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  muted: { color: '#666', marginTop: 6 },

  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: '#555', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeReady: { backgroundColor: '#E6F7EF' },
  badgeUsed: { backgroundColor: '#FCEFEF' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextReady: { color: '#0F9154' },
  badgeTextUsed: { color: '#C0392B' },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  secondaryBtn: { backgroundColor: '#F7F7F7' },
  actionText: { fontWeight: '600' },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 22,
  },
  fabBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    elevation: 3,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#0008',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 14,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    borderRadius: 14,
    minHeight: 260,
  },
  statusRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontWeight: '700' },
  timerRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerText: { color: '#333' },
  modalActions: { marginTop: 14 },
  fullBtn: { justifyContent: 'center' },
  helperText: { marginTop: 8, color: '#666', fontSize: 12, textAlign: 'center' },
});
