# Logo Images

Place your SkillSphere logo image files here.

## Supported Formats
- PNG (recommended for transparency)
- JPG/JPEG
- SVG (if using react-native-svg)

## Usage

To use an image logo instead of the SVG logo:

1. Place your logo image file in this folder (e.g., `skillsphere-logo.png`)
2. Update the Logo component usage:

```javascript
import Logo from '../../components/Logo';
import logoImage from '../../assets/images/skillsphere-logo.png';

// In your component:
<Logo 
  size={160} 
  showText={true} 
  glow={true}
  useImage={true}
  imageSource={logoImage}
/>
```

## Current Implementation

The Logo component currently uses an SVG implementation that matches the SkillSphere brand:
- Electric blue to deep purple gradient
- Incomplete circle (C-shape) with network pattern
- Glowing effect
- Professional typography

If you have the actual logo image file, you can use it by setting `useImage={true}` and providing the `imageSource`.

