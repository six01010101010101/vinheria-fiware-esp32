import React, { ReactNode } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, StyleProp, ViewStyle } from 'react-native';

interface AntigravityLayoutProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * AntigravityLayout — Encapsulamento simétrico para telas mobile da Vinheria Agnello.
 * Garante SafeAreaView, barra de status no tema #0F0F0F e espaçamento consistente.
 */
export const AntigravityLayout: React.FC<AntigravityLayoutProps> = ({ children, style }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      <View style={[styles.gridContainer, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
});
