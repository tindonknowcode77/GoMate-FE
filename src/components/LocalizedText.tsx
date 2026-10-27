import { ReactNode } from 'react';
import { Text as NativeText, TextProps } from 'react-native';

import { useLanguage } from '../i18n/LanguageContext';

function translateChildren(value: ReactNode, translate: (text: string) => string): ReactNode {
  if (typeof value === 'string') return translate(value);
  if (Array.isArray(value)) return value.map((child) => translateChildren(child, translate));
  return value;
}

export function Text({ children, ...props }: TextProps) {
  const { translate } = useLanguage();
  return <NativeText {...props}>{translateChildren(children, translate)}</NativeText>;
}
