import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface Props extends ViewProps {
  surface?: boolean;
  elevated?: boolean;
}

export function ThemedView({ style, surface, elevated, ...props }: Props) {
  const { colors } = useTheme();
  const bg = elevated ? colors.elevated : surface ? colors.surface : colors.background;
  return <View style={[{ backgroundColor: bg }, style]} {...props} />;
}
