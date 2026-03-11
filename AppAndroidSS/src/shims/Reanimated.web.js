import React from 'react';
import { Text, View } from 'react-native';

// Minimal shim for react-native-reanimated on web to avoid runtime crashes
// It provides Animated.View and no-op entering animations used in the app.
const NoopAnimatedView = (props) => React.createElement(View, props, props.children);

const noopAnimBuilder = () => ({
  delay: () => ({
    duration: noopAnimBuilder,
  }),
  duration: () => ({
    delay: noopAnimBuilder,
  }),
});

export default {
  View: NoopAnimatedView,
  Text,
  createAnimatedComponent: (Component) => Component,
};

export const FadeIn = { duration: noopAnimBuilder };
export const FadeInDown = { duration: noopAnimBuilder };
export const FadeInUp = { duration: noopAnimBuilder };
export const SlideInLeft = { duration: noopAnimBuilder };
export const SlideInRight = { duration: noopAnimBuilder };
export const ZoomIn = { duration: noopAnimBuilder };
export const BounceIn = { duration: noopAnimBuilder };

export const useSharedValue = (initialValue) => ({ value: initialValue });
export const useAnimatedStyle = (factory) => factory();
export const withSpring = (value) => value;
export const withRepeat = (value) => value;
export const withSequence = (...values) => values[values.length - 1];
