# SkillSphere Logo Setup

## Required File

Place the SkillSphere logo PNG file at:
```
src/assets/images/skillsphere-logo.png
```

## Logo Specifications

- **Format:** PNG with transparency
- **Recommended Size:** 1024x1024px (or higher resolution)
- **Aspect Ratio:** 1:1 (square)
- **Background:** Transparent
- **Content:** SkillSphere logo with circuit board/sphere design

## How to Create the Logo File

1. **From SVG:** If you have the logo as SVG, convert it to PNG:
   - Use online tools: https://cloudconvert.com/svg-to-png
   - Or ImageMagick: `magick convert -background none -size 1024x1024 logo.svg skillsphere-logo.png`
   - Or Inkscape: `inkscape --export-png=skillsphere-logo.png --export-width=1024 logo.svg`

2. **From Design Tool:** Export from your design tool (Figma, Adobe XD, etc.) as PNG with transparency

3. **Place the file:** Copy the PNG file to `src/assets/images/skillsphere-logo.png`

## Usage

The logo is used via the `BrandLogo` component:

```javascript
import BrandLogo from '../../components/BrandLogo';

// In your component:
<BrandLogo size={90} />
```

## Note

The `BrandLogo` component uses `require()` to load the image, so the file path must be:
- Exact: `src/assets/images/skillsphere-logo.png`
- Relative to the component: `../assets/images/skillsphere-logo.png` (from components folder)

