import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface Props extends TextProps {
  secondary?: boolean;
  tertiary?: boolean;
  accent?: boolean;
}

export function ThemedText({ style, secondary, tertiary, accent, ...props }: Props) {
  const { colors } = useTheme();
  const color = accent
    ? colors.accent
    : tertiary
    ? colors.textTertiary
    : secondary
    ? colors.textSecondary
    : colors.text;
  return <Text style={[{ color }, style]} {...props} />;
}
