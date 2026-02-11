import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import Svg, { Circle, Path, G, Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const Logo = ({ size = 120, showText = true, style, glow = false, useImage = false, imageSource = null, boxed = false }) => {
  const { theme } = useTheme();
  const logoSize = size * 0.6;
  
  // Enhanced gradient colors matching the logo description (electric blue to deep purple)
  const gradientColors = {
    start: '#3b82f6', // Bright electric blue
    mid: '#6366f1',   // Indigo
    end: '#8b5cf6',   // Deep purple
  };

  // If image source is provided, use image instead of SVG
  if (useImage && imageSource) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.logoWrapper, glow && styles.glowContainer]}>
          <Image
            source={imageSource}
            style={[styles.logoImage, { width: size, height: size }]}
            resizeMode="contain"
          />
        </View>
        {showText && (
          <View style={styles.textContainer}>
            <Text style={[styles.text, { color: '#ffffff' }]}>
              Skill<Text style={[styles.textAccent, { color: '#ffffff' }]}>Sphere</Text>
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Boxed style - dark rounded square container
  if (boxed) {
    return (
      <View style={[styles.boxedContainer, style]}>
        <View style={[styles.boxedInner, { backgroundColor: theme.mode === 'dark' ? '#1e293b' : '#0f172a' }]}>
          {showText && (
            <View style={styles.boxedTextContainer}>
              <Text style={styles.boxedTextSkill}>Skill</Text>
              <Text style={[styles.boxedTextSphere, { color: gradientColors.end }]}>Sphere</Text>
            </View>
          )}
          <View style={styles.boxedSvgContainer}>
            <Svg width={logoSize * 0.8} height={logoSize * 0.8} viewBox="0 0 120 120" style={styles.boxedSvg}>
          <Defs>
            {/* Main gradient for the logo elements */}
            <SvgLinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors.start} stopOpacity="1" />
              <Stop offset="50%" stopColor={gradientColors.mid} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors.end} stopOpacity="1" />
            </SvgLinearGradient>
            
            {/* Glow effect gradient */}
            <RadialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={gradientColors.start} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={gradientColors.end} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          
          {/* Background glow circle - enhanced */}
          {glow && (
            <>
              <Circle cx="60" cy="60" r="58" fill="url(#glowGradient)" opacity="0.4" />
              <Circle cx="60" cy="60" r="55" fill="url(#glowGradient)" />
            </>
          )}
          
          <G>
            {/* Outer incomplete circle (C-shape) - more prominent and open on right */}
            <Path
              d="M 60 15 A 45 45 0 0 1 105 60"
              stroke="url(#logoGradient)"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 105 60 A 45 45 0 0 1 60 105"
              stroke="url(#logoGradient)"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
            
            {/* Inner curve for depth */}
            <Path
              d="M 60 32 A 28 28 0 0 1 88 60"
              stroke="url(#logoGradient)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            <Path
              d="M 88 60 A 28 28 0 0 1 60 88"
              stroke="url(#logoGradient)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            
            {/* Central network hub */}
            <Circle cx="60" cy="60" r="5" fill="#ffffff" />
            
            {/* Network nodes along the curve - more nodes for circuit board effect */}
            <Circle cx="60" cy="30" r="4" fill="url(#logoGradient)" />
            <Circle cx="75" cy="40" r="4" fill="url(#logoGradient)" />
            <Circle cx="90" cy="55" r="4" fill="url(#logoGradient)" />
            <Circle cx="95" cy="70" r="4" fill="url(#logoGradient)" />
            <Circle cx="90" cy="85" r="4" fill="url(#logoGradient)" />
            <Circle cx="75" cy="95" r="4" fill="url(#logoGradient)" />
            <Circle cx="60" cy="90" r="4" fill="url(#logoGradient)" />
            <Circle cx="45" cy="80" r="4" fill="url(#logoGradient)" />
            <Circle cx="35" cy="65" r="4" fill="url(#logoGradient)" />
            <Circle cx="40" cy="50" r="4" fill="url(#logoGradient)" />
            <Circle cx="50" cy="40" r="4" fill="url(#logoGradient)" />
            
            {/* Connection lines - network pattern */}
            <Path
              d="M 60 60 L 60 30"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 75 40"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 90 55"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 95 70"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 90 85"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 75 95"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 60 90"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 45 80"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 35 65"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 40 50"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 50 40"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            
            {/* Additional interconnections for circuit board effect */}
            <Path
              d="M 60 30 L 75 40"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 75 40 L 90 55"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 90 55 L 95 70"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 95 70 L 90 85"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 90 85 L 75 95"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 75 95 L 60 90"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 60 90 L 45 80"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 45 80 L 35 65"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 35 65 L 40 50"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 40 50 L 50 40"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 50 40 L 60 30"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
          </G>
        </Svg>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.logoWrapper, glow && styles.glowContainer]}>
        <Svg width={logoSize} height={logoSize} viewBox="0 0 120 120" style={styles.svg}>
          <Defs>
            {/* Main gradient for the logo elements */}
            <SvgLinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors.start} stopOpacity="1" />
              <Stop offset="50%" stopColor={gradientColors.mid} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors.end} stopOpacity="1" />
            </SvgLinearGradient>
            
            {/* Glow effect gradient */}
            <RadialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={gradientColors.start} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={gradientColors.end} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          
          {/* Background glow circle - enhanced */}
          {glow && (
            <>
              <Circle cx="60" cy="60" r="58" fill="url(#glowGradient)" opacity="0.4" />
              <Circle cx="60" cy="60" r="55" fill="url(#glowGradient)" />
            </>
          )}
          
          <G>
            {/* Outer incomplete circle (C-shape) - more prominent and open on right */}
            <Path
              d="M 60 15 A 45 45 0 0 1 105 60"
              stroke="url(#logoGradient)"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 105 60 A 45 45 0 0 1 60 105"
              stroke="url(#logoGradient)"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
            
            {/* Inner curve for depth */}
            <Path
              d="M 60 32 A 28 28 0 0 1 88 60"
              stroke="url(#logoGradient)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            <Path
              d="M 88 60 A 28 28 0 0 1 60 88"
              stroke="url(#logoGradient)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            
            {/* Central network hub */}
            <Circle cx="60" cy="60" r="5" fill="#ffffff" />
            
            {/* Network nodes along the curve - more nodes for circuit board effect */}
            <Circle cx="60" cy="30" r="4" fill="url(#logoGradient)" />
            <Circle cx="75" cy="40" r="4" fill="url(#logoGradient)" />
            <Circle cx="90" cy="55" r="4" fill="url(#logoGradient)" />
            <Circle cx="95" cy="70" r="4" fill="url(#logoGradient)" />
            <Circle cx="90" cy="85" r="4" fill="url(#logoGradient)" />
            <Circle cx="75" cy="95" r="4" fill="url(#logoGradient)" />
            <Circle cx="60" cy="90" r="4" fill="url(#logoGradient)" />
            <Circle cx="45" cy="80" r="4" fill="url(#logoGradient)" />
            <Circle cx="35" cy="65" r="4" fill="url(#logoGradient)" />
            <Circle cx="40" cy="50" r="4" fill="url(#logoGradient)" />
            <Circle cx="50" cy="40" r="4" fill="url(#logoGradient)" />
            
            {/* Connection lines - network pattern */}
            <Path
              d="M 60 60 L 60 30"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 75 40"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 90 55"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 95 70"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 90 85"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 75 95"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 60 90"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 45 80"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 35 65"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 40 50"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            <Path
              d="M 60 60 L 50 40"
              stroke="url(#logoGradient)"
              strokeWidth="2.5"
              opacity="0.6"
            />
            
            {/* Additional interconnections for circuit board effect */}
            <Path
              d="M 60 30 L 75 40"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 75 40 L 90 55"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 90 55 L 95 70"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 95 70 L 90 85"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 90 85 L 75 95"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 75 95 L 60 90"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 60 90 L 45 80"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 45 80 L 35 65"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 35 65 L 40 50"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 40 50 L 50 40"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
            <Path
              d="M 50 40 L 60 30"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              opacity="0.5"
            />
          </G>
        </Svg>
      </View>
      
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.text, { color: '#ffffff' }]}>
            Skill<Text style={[styles.textAccent, { color: '#ffffff' }]}>Sphere</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    marginBottom: 8,
  },
  glowContainer: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 20,
  },
  textContainer: {
    marginTop: 12,
  },
  text: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  textAccent: {
    fontWeight: '700',
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  logoImage: {
    tintColor: undefined, // Keep original colors
  },
  boxedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxedInner: {
    width: 200,
    height: 200,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  boxedTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  boxedTextSkill: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  boxedTextSphere: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  boxedSvgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxedSvg: {
    marginTop: 4,
  },
});

export default Logo;
