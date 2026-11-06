import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { api } from '../services/api';

const PLATE_REGEX = /^[A-Z]{3}-\d{4}$/;

export default function VehicleScreen({ navigation }) {
  const [plate, setPlate] = useState('');
  const [state, setState] = useState('CDMX');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    loadCurrentVehicle();
  }, []);

  const loadCurrentVehicle = async () => {
    try {
      setInitialLoading(true);
      const res = await api.getMyVehicle();
      if (res.success && res.data && res.data.vehicle) {
        const v = res.data.vehicle;
        setPlate(v.plate);
        setState(v.state || 'CDMX');
        setBrand(v.brand || '');
        setModel(v.model || '');
        setYear(v.year ? v.year.toString() : '');
        setIsEditMode(true);
      }
    } catch (e) {
      // Sin vehículo aún
      setIsEditMode(false);
    } finally {
      setInitialLoading(false);
    }
  };

  const handlePlateChange = (text) => {
    // Formatear automáticamente agregando guión si el usuario teclea ABC1234 -> ABC-1234
    let clean = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (clean.length === 3 && !clean.includes('-') && text.length > plate.length) {
      clean = `${clean}-`;
    }
    setPlate(clean);
  };

  const handleSubmit = async () => {
    const formattedPlate = plate.toUpperCase().trim();

    // VALIDACIÓN CRÍTICA CON REGEX
    if (!PLATE_REGEX.test(formattedPlate)) {
      Alert.alert(
        'Placa Inválida',
        'La placa debe tener exactamente el formato estándar mexicano: ABC-1234 (3 letras mayúsculas, un guión y 4 números).'
      );
      return;
    }

    try {
      setLoading(true);
      const payload = {
        plate: formattedPlate,
        state,
        brand: brand.trim() || 'Nissan',
        model: model.trim() || 'Versa',
        year: parseInt(year, 10) || new Date().getFullYear()
      };

      if (isEditMode) {
        await api.updateVehicle(payload);
        Alert.alert('¡Actualizado!', 'La información de tu vehículo ha sido actualizada.');
      } else {
        await api.registerVehicle(payload);
        Alert.alert('¡Registrado!', 'Vehículo registrado correctamente. El scraper sincronizará adeudos y subsidios a las 8:00 AM.');
      }

      navigation.navigate('Dashboard');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar el vehículo.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#18b0b8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isEditMode ? 'Editar Mi Vehículo' : 'Registrar Placa Vehicular'}
          </Text>
          <Text style={styles.subtitle}>
            Regla de negocio: Una placa por usuario (MVP México)
          </Text>

          {/* Formato de Placa Visual */}
          <View style={styles.plateContainer}>
            <Text style={styles.stateLabel}>{state}</Text>
            <TextInput
              style={styles.plateInput}
              placeholder="ABC-1234"
              placeholderTextColor="#94a3b8"
              value={plate}
              onChangeText={handlePlateChange}
              maxLength={8}
              autoCapitalize="characters"
            />
            <Text style={styles.mexicoLabel}>MÉXICO</Text>
          </View>
          <Text style={styles.helpText}>Formato obligatorio: ABC-1234</Text>

          {/* Selector de Entidad Federativa */}
          <Text style={styles.label}>Entidad Federativa</Text>
          <View style={styles.stateSelector}>
            {['CDMX', 'ESTADO DE MÉXICO', 'JALISCO', 'NUEVO LEÓN'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.statePill, state === item && styles.statePillActive]}
                onPress={() => setState(item)}
              >
                <Text style={[styles.statePillText, state === item && styles.statePillTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Marca */}
          <Text style={styles.label}>Marca (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="ej. Nissan, Volkswagen, Toyota"
            placeholderTextColor="#9ca3af"
            value={brand}
            onChangeText={setBrand}
          />

          {/* Modelo */}
          <Text style={styles.label}>Modelo (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="ej. Versa, Jetta, Corolla"
            placeholderTextColor="#9ca3af"
            value={model}
            onChangeText={setModel}
          />

          {/* Año */}
          <Text style={styles.label}>Año Modelo</Text>
          <TextInput
            style={styles.input}
            placeholder="2024"
            placeholderTextColor="#9ca3af"
            value={year}
            onChangeText={setYear}
            keyboardType="numeric"
            maxLength={4}
          />

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditMode ? 'Guardar Cambios' : 'Registrar Vehículo'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9f9',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f9f9',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 20,
  },
  plateContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#0f172a',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 6,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 2,
  },
  plateInput: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 3,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 6,
  },
  mexicoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1.5,
  },
  helpText: {
    fontSize: 12,
    color: '#18b0b8',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  stateSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  statePillActive: {
    backgroundColor: '#18b0b8',
  },
  statePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  statePillTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#18b0b8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#18b0b8',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

