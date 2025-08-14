import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/utils/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const pwdRef = useRef<TextInput>(null);

  useEffect(() => {
    // Prefill último correo usado
    AsyncStorage.getItem('last_email').then((e) => {
      if (e) setEmail(e);
    });
  }, []);

  const validate = useCallback(() => {
    const errs: typeof errors = {};
    const e = email.trim();
    const p = password;

    if (!e) errs.email = 'Ingresa tu correo';
    else if (!EMAIL_RE.test(e)) errs.email = 'Correo no válido';

    if (!p) errs.password = 'Ingresa tu contraseña';
    else if (p.length < 6) errs.password = 'Mínimo 6 caracteres';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const resp = await api.post(
        '/movil/login',
        { correo: email.trim(), contraseña: password },
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const { token, usuario: datosUsuario } = resp.data || {};
      if (!token || !datosUsuario) {
        throw new Error('Respuesta inesperada del servidor');
      }

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('usuario', JSON.stringify(datosUsuario));
      await AsyncStorage.setItem('last_email', email.trim());

      Alert.alert('Bienvenido', `Hola ${datosUsuario.nombre}`);
      router.replace('/home');
    } catch (err: any) {
      clearTimeout(timeout);
      // Mensaje amigable según el caso
      const mensaje =
        err?.response?.data?.error ||
        (err?.message?.includes('aborted') ? 'Tiempo de espera agotado. Intenta de nuevo.' : '') ||
        'Error de conexión o credenciales inválidas';
      Alert.alert('Error', mensaje);
      setLoading(false);
    }
  }, [email, password, validate, loading, router]);

  return (
    <LinearGradient colors={['#0c1b3a', '#112447']} style={styles.flex1}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />

            {/* Email */}
            <View style={[styles.inputWrap, errors.email && styles.inputWrapError]}>
              <Ionicons name="mail-outline" size={18} color="#7591ff" style={styles.leftIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo"
                placeholderTextColor="#c7d0ee"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                textContentType="username"
                onSubmitEditing={() => pwdRef.current?.focus()}
                accessibilityLabel="Campo de correo"
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            {/* Password */}
            <View style={[styles.inputWrap, errors.password && styles.inputWrapError]}>
              <Ionicons name="lock-closed-outline" size={18} color="#7591ff" style={styles.leftIcon} />
              <TextInput
                ref={pwdRef}
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#c7d0ee"
                secureTextEntry={!showPwd}
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                textContentType="password"
                onSubmitEditing={handleLogin}
                accessibilityLabel="Campo de contraseña"
              />
              <TouchableOpacity
                onPress={() => setShowPwd((s) => !s)}
                accessibilityLabel={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={styles.eyeBtn}
              >
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9fb3ff" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            {/* Botón */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#0c1b3a" />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>

            {/* Sugerencia */}
            <Text style={styles.hint}>
              ¿Olvidaste tu contraseña? Contacta al admin de tu empresa.
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/* ---------- Estilos ---------- */

const styles = StyleSheet.create({
  flex1: { flex: 1 },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },

  logo: {
    width: 170,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 36,
  },

  inputWrap: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  inputWrapError: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
  leftIcon: { marginRight: 8 },

  input: {
    flex: 1,
    color: '#fff',
    paddingVertical: 10,
    fontSize: 15,
  },

  eyeBtn: {
    padding: 6,
    marginLeft: 6,
    borderRadius: 8,
  },

  button: {
    width: '100%',
    backgroundColor: '#ffc285',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0c1b3a',
    fontSize: 16,
    fontWeight: '800',
  },

  errorText: {
    width: '100%',
    color: '#ff9b9b',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 6,
    paddingLeft: 4,
  },

  hint: {
    color: '#b8c6ea',
    fontSize: 12,
    marginTop: 14,
  },
});
