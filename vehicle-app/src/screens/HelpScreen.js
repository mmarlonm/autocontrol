import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking
} from 'react-native';

export default function HelpScreen() {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqItems = [
    {
      id: 1,
      question: '¿Qué es AUTOCONTROL?',
      answer: 'AUTOCONTROL es una aplicación móvil que te ayuda a gestionar tu vehículo, conocer el estado de tus tenencias, pagos, subsidios y promociones vigentes en tiempo real.'
    },
    {
      id: 2,
      question: '¿Cómo registro mi vehículo?',
      answer: 'Ve a la sección de "Vehículo", ingresa tu placa (formato ABC-1234), estado y datos del auto. La app consultará automáticamente la información de tenencias.'
    },
    {
      id: 3,
      question: '¿Cuál es el formato correcto de la placa?',
      answer: 'El formato debe ser ABC-1234: tres letras mayúsculas, un guión, y cuatro dígitos. Ejemplo: XYZ-1234'
    },
    {
      id: 4,
      question: '¿Qué son las tenencias?',
      answer: 'La tenencia es un impuesto anual que debes pagar por tu vehículo en México. Puede tener un subsidio (descuento) si cumples ciertos requisitos.'
    },
    {
      id: 5,
      question: '¿Cómo veo mi historial de pagos?',
      answer: 'Abre la pestaña "Historial" para ver el timeline completo de todas tus tenencias, pagos y estados por año.'
    },
    {
      id: 6,
      question: '¿Recibo notificaciones de vencimientos?',
      answer: 'Sí, si las activas en Configuración. Recibirás alertas push antes del vencimiento de tu tenencia.'
    }
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ayuda & FAQ</Text>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enlaces Rápidos</Text>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => Linking.openURL('https://autocontrol-mexico.com')}
        >
          <Text style={styles.linkIcon}>🌐</Text>
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Sitio Web</Text>
            <Text style={styles.linkDesc}>Más información sobre AUTOCONTROL</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => Linking.openURL('mailto:soporte@autocontrol-mexico.com')}
        >
          <Text style={styles.linkIcon}>📧</Text>
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Contactar Soporte</Text>
            <Text style={styles.linkDesc}>Email: soporte@autocontrol-mexico.com</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => Linking.openURL('https://wa.me/525512345678')}
        >
          <Text style={styles.linkIcon}>💬</Text>
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>WhatsApp</Text>
            <Text style={styles.linkDesc}>Chat con soporte en tiempo real</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
        {faqItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.faqCard}
            onPress={() => toggleFaq(item.id)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqIcon}>{expandedFaq === item.id ? '−' : '+'}</Text>
            </View>
            {expandedFaq === item.id && (
              <View style={styles.faqContent}>
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de la App</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Desarrollador:</Text>
            <Text style={styles.infoValue}>MGM Tech Solutions</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Actualización:</Text>
            <Text style={styles.infoValue}>Noviembre 2024</Text>
          </View>
        </View>
      </View>

      {/* Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Consejos Útiles</Text>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>Mantén tus datos actualizados para recibir información exacta sobre tus tenencias.</Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>🔔</Text>
          <Text style={styles.tipText}>Activa las notificaciones push para no perder ningún vencimiento importante.</Text>
        </View>
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>✅</Text>
          <Text style={styles.tipText}>Revisa regularmente si hay nuevas promociones o subsidios disponibles.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f9f9' 
  },
  content: { 
    padding: 20, 
    paddingBottom: 40 
  },
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1e293b',
    marginBottom: 24,
    marginTop: 12
  },
  section: { 
    marginBottom: 24 
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#64748b', 
    marginBottom: 12, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  linkCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  linkIcon: {
    fontSize: 28,
    marginRight: 12
  },
  linkContent: {
    flex: 1
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2
  },
  linkDesc: {
    fontSize: 12,
    color: '#94a3b8'
  },
  arrow: {
    fontSize: 16,
    color: '#18b0b8',
    fontWeight: '700'
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff'
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 10
  },
  faqIcon: {
    fontSize: 20,
    color: '#18b0b8',
    fontWeight: '700'
  },
  faqContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: '#f8fbfb',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  faqAnswer: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 14
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#ecf9f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#18b0b8'
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 10
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#0f766e',
    fontWeight: '500'
  }
});
