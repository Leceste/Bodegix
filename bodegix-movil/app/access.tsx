import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View, FlatList, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../src/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/utils/api';

type Locker = { id: number; identificador: string; ubicacion: string; };
type AccessScreenProp = NativeStackNavigationProp<RootStackParamList, 'Access'>;

export default function Access() {
  const navigation = useNavigation<AccessScreenProp>();
  const route = useRoute();
  const routeLockerId = (route.params as { lockerId?: number })?.lockerId;

  const [lockers, setLockers] = useState<Locker[]>([]);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [qrValue, setQrValue] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const progress = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toMongoLockerId = (id: number | string) => {
    const s = String(id).trim();
    return /^LOCKER_/i.test(s) ? s.toUpperCase() : `LOCKER_${s.padStart(3, '0')}`;
  };

  const registrarAcceso = async (lockerIdNum: number) => {
    try {
      const usuarioStr = await AsyncStorage.getItem('usuario');
      const token = await AsyncStorage.getItem('token');
      if (usuarioStr && token) {
        const usuario = JSON.parse(usuarioStr);
        await api.post(
          '/accesos',
          {
            usuario_id: usuario.id,
            fecha: new Date(),
            accion: `Generó código de apertura para Locker #${lockerIdNum}`,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Error al registrar acceso:', error);
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startCountdown = (ms = 15000) => {
    setSecondsLeft(Math.round(ms / 1000));
    progress.setValue(1);
    Animated.timing(progress, { toValue: 0, duration: ms, useNativeDriver: false }).start();
    clearTimer();
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const generarQR = async (lockerIdNum: number) => {
    try {
      setLoading(true);
      const usuarioStr = await AsyncStorage.getItem('usuario');
      const token = await AsyncStorage.getItem('token');
      if (!usuarioStr || !token) {
        Alert.alert('Sesión', 'Inicia sesión nuevamente.');
        setLoading(false);
        return;
      }
      const usuario = JSON.parse(usuarioStr);
      const empresaId = usuario.empresa_id ?? usuario.empresaId;
      if (!empresaId) {
        Alert.alert('Error', 'No se encontró empresa del usuario.');
        setLoading(false);
        return;
      }

      const lockerForUI = lockers.find(l => l.id === lockerIdNum) || {
        id: lockerIdNum,
        identificador: String(lockerIdNum).padStart(3, '0'),
        ubicacion: '',
      };
      setSelectedLocker(lockerForUI);

      const body = {
        lockerId: toMongoLockerId(lockerForUI.identificador || lockerIdNum),
        empresaId: String(empresaId),
        asUrl: true,
      };

      const resp = await api.post('/qr-sessions', body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.data?.ok || !resp.data?.payload) {
        throw new Error('Respuesta inválida al crear sesión QR');
      }

      setQrValue(String(resp.data.payload));
      startCountdown(resp.data.expiresInMs ?? 15000);
      await registrarAcceso(lockerIdNum);
    } catch (err: any) {
      console.error('generarQR error:', err?.response?.data || err?.message || err);
      Alert.alert('Error', 'No se pudo generar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 2, duration: 4000, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 0, duration: 4000, easing: Easing.linear, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const loadLockers = async () => {
      try {
        const usuarioStr = await AsyncStorage.getItem('usuario');
        const token = await AsyncStorage.getItem('token');
        if (!usuarioStr || !token) return;
        const usuario = JSON.parse(usuarioStr);
        const userId = usuario.id;
        const r = await api.get(`/lockers-with-sensors?user_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (Array.isArray(r.data)) setLockers(r.data as Locker[]);
        if (routeLockerId) generarQR(routeLockerId);
      } catch (e) {
        console.error('loadLockers error:', e);
        if (routeLockerId) generarQR(routeLockerId);
      }
    };
    loadLockers();
    return () => clearTimer();
  }, []);

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#f5a623', '#00bfff', '#32cd32'],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Acceso</Text>

      {!selectedLocker ? (
        <FlatList
          data={lockers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.lockerItem}
              onPress={() => generarQR(item.id)}
              disabled={loading}
            >
              <Text style={styles.lockerText}>
                {item.identificador} - {item.ubicacion || 'Sin ubicación'}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
              No hay lockers asignados.
            </Text>
          }
        />
      ) : (
        <View style={styles.qrSection}>
          <Text style={styles.instruction}>
            Muestra este código para abrir tu locker #{selectedLocker.identificador}
          </Text>

          <Animated.View style={[styles.qrBackgroundSquare, { backgroundColor }]}>
            <Animated.View style={[styles.qrContainer, { opacity: fadeAnim }]}>
              {!!qrValue && <QRCode value={qrValue} size={200} />}
              {!qrValue && <Text style={{ color: '#333', width: 200, textAlign: 'center' }}>Generando...</Text>}
            </Animated.View>
          </Animated.View>

          <View style={styles.vigenciaContainer}>
            <Text style={styles.vigenciaText}>
              {secondsLeft > 0 ? `vigencia: ${secondsLeft}s` : 'Código expirado'}
            </Text>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
            onPress={() => generarQR(selectedLocker.id)}
            disabled={loading}
          >
            <Icon name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>{loading ? 'Generando...' : 'Volver a generar código'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#112447', paddingTop: 60, paddingHorizontal: 20 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 1 },
  logo: { width: 140, height: 40, resizeMode: 'contain', alignSelf: 'center', marginBottom: 10 },
  title: { color: '#f5a623', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  qrSection: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', marginTop: 30 },
  instruction: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 10 },
  qrBackgroundSquare: { width: 260, height: 260, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  qrContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  vigenciaContainer: { borderWidth: 1, borderColor: '#f5a623', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center', marginBottom: 12 },
  vigenciaText: { color: '#fff', fontSize: 16 },
  progressBarBackground: { height: 8, width: 200, backgroundColor: '#ccc', borderRadius: 4, overflow: 'hidden', marginTop: 5 },
  progressBarFill: { height: 8, backgroundColor: '#f5a623' },
  button: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f5a623', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 30, backgroundColor: 'transparent' },
  buttonText: { color: '#fff', fontSize: 16 },
  lockerItem: { backgroundColor: '#1e3a5f', padding: 15, marginVertical: 5, borderRadius: 10 },
  lockerText: { color: '#fff', fontSize: 16 },
});
