import React from 'react';
import { View } from 'react-native';

// Minimal shim for react-native-reanimated on web to avoid runtime crashes
// It provides Animated.View and no-op entering animations used in the app.
const NoopAnimatedView = (props) => React.createElement(View, props, props.children);

const noopAnimBuilder = () => ({
  delay: () => null,
  duration: () => ({ delay: () => null }),
});

export default {
  View: NoopAnimatedView,
};

export const FadeIn = { duration: noopAnimBuilder };
export const FadeInDown = { duration: noopAnimBuilder };
