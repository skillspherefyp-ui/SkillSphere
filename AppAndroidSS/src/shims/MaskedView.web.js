import React from 'react';
import { View } from 'react-native';

const MaskedView = ({ children, style }) => <View style={style}>{children}</View>;

export default MaskedView;
