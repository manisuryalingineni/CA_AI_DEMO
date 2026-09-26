import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const isSmallScreen = width < 360;
export const isMediumScreen = width >= 360 && width < 600;
export const isLargeScreen = width >= 600;

export const horizontalPadding = isSmallScreen
  ? 16
  : isMediumScreen
    ? 20
    : 24;

export const contentMaxWidth = 1200;