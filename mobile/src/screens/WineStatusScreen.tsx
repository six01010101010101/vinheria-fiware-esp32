import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AntigravityLayout } from '../components/AntigravityLayout';

export interface WineStatusItem {
  id: string;
  wineName: string;
  style: string;
  terroir: string;
  temperature: number;
  humidity: number;
  luminosity: number;
  healthScore: number;
  status: 'IDEAL' | 'PADRAO' | 'CRITICO';
}

interface WineStatusScreenProps {
  items: WineStatusItem[];
}

export const WineStatusScreen: React.FC<WineStatusScreenProps> = ({ items }) => {
  const getStatusColor = (status: WineStatusItem['status']): string => {
    switch (status) {
      case 'IDEAL': return '#22c55e';
      case 'PADRAO': return '#f59e0b';
      case 'CRITICO': return '#e11d48';
      default: return '#a1a1aa';
    }
  };

  return (
    <AntigravityLayout>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>🍇 Vinheria Agnello · Monitor Mobile</Text>
        <Text style={styles.screenSub}>Status em Tempo Real (Supabase & Telegram)</Text>

        {items.map((wine) => {
          const statusColor = getStatusColor(wine.status);
          return (
            <View key={wine.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.wineName}>{wine.wineName}</Text>
                <View style={[styles.badge, { borderColor: statusColor }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {wine.status} · {wine.healthScore}%
                  </Text>
                </View>
              </View>

              <Text style={styles.terroirText}>📍 {wine.terroir} ({wine.style})</Text>

              <View style={styles.metricsRow}>
                <Text style={styles.metric}>🌡️ {wine.temperature}°C</Text>
                <Text style={styles.metric}>💧 {wine.humidity}%</Text>
                <Text style={styles.metric}>☀️ {wine.luminosity}%</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </AntigravityLayout>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
    gap: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 2,
  },
  screenSub: {
    fontSize: 12,
    color: '#A3A3A3',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  terroirText: {
    fontSize: 12,
    color: '#A3A3A3',
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
    padding: 8,
  },
  metric: {
    fontSize: 12,
    color: '#F5F5F5',
    fontFamily: 'monospace',
  },
});
