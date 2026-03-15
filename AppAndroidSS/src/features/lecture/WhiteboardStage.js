import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

const renderParagraphTone = (tone) => {
  switch (tone) {
    case 'focus':
      return { backgroundColor: '#fff7ed', borderColor: '#fdba74' };
    case 'support':
      return { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' };
    default:
      return { backgroundColor: '#ffffff', borderColor: '#dbe7f5' };
  }
};

const renderStaticLayer = (items) => items.map((item) => (
  <Text key={item.id} style={styles.boardTitle}>{item.text}</Text>
));

const renderDynamicLayer = (items) => items.map((item) => {
  if (item.kind === 'paragraph') {
    const toneStyle = renderParagraphTone(item.tone);
    return (
      <View key={item.id} style={[styles.infoCard, toneStyle]}>
        {!!item.title && <Text style={styles.infoCardTitle}>{item.title}</Text>}
        <Text style={styles.infoCardText}>{item.text}</Text>
      </View>
    );
  }

  if (item.kind === 'bullet_list') {
    return (
      <View key={item.id} style={styles.sectionBlock}>
        {!!item.title && <Text style={styles.sectionLabel}>{item.title}</Text>}
        {item.items.map((bullet, index) => (
          <View key={`${item.id}-${index}`} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (item.kind === 'equation') {
    return (
      <View key={item.id} style={[styles.infoCard, styles.equationCard]}>
        <Text style={styles.equationText}>{item.expression}</Text>
        {!!item.note && <Text style={styles.equationNote}>{item.note}</Text>}
      </View>
    );
  }

  if (item.kind === 'example') {
    return (
      <View key={item.id} style={[styles.infoCard, styles.exampleCard]}>
        {!!item.title && <Text style={styles.infoCardTitle}>{item.title}</Text>}
        <Text style={item.format === 'code' ? styles.codeText : styles.infoCardText}>{item.content}</Text>
        {!!item.note && <Text style={styles.exampleNote}>{item.note}</Text>}
      </View>
    );
  }

  return null;
});

const renderDiagramLayer = (items) => items.map((item) => {
  if (item.diagramType === 'flowchart') {
    return (
      <View key={item.id} style={styles.diagramBlock}>
        {!!item.title && <Text style={styles.sectionLabel}>{item.title}</Text>}
        {item.steps.map((step, index) => (
          <View key={`${item.id}-${index}`} style={styles.flowRow}>
            <View style={styles.flowBadge}><Text style={styles.flowBadgeText}>{index + 1}</Text></View>
            <Text style={styles.flowText}>{step.label || step}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (item.diagramType === 'comparison_table') {
    return (
      <View key={item.id} style={styles.diagramBlock}>
        {!!item.title && <Text style={styles.sectionLabel}>{item.title}</Text>}
        {item.rows.map((row, index) => (
          <View key={`${item.id}-${index}`} style={styles.compareRow}>
            <Text style={styles.compareTitle}>{row.left || row.label || `Item ${index + 1}`}</Text>
            <Text style={styles.compareBody}>{row.right || row.value || ''}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View key={item.id} style={styles.diagramBlock}>
      {!!item.title && <Text style={styles.sectionLabel}>{item.title}</Text>}
      <View style={styles.nodeGrid}>
        {item.nodes.map((node, index) => (
          <View key={`${item.id}-${index}`} style={styles.nodeCard}>
            <Text style={styles.nodeText}>{node.label || node.title || node}</Text>
          </View>
        ))}
      </View>
      {!!item.caption && <Text style={styles.diagramCaption}>{item.caption}</Text>}
    </View>
  );
});

const renderHighlightLayer = (items) => (
  <View style={styles.highlightRail}>
    {items.map((item) => (
      <View key={item.id} style={styles.highlightPill}>
        <Text style={styles.highlightText}>{item.label || item.region || 'Focus'}</Text>
      </View>
    ))}
  </View>
);

const renderTransitionLayer = (items) => (
  <View style={styles.transitionRail}>
    {items.slice(-1).map((item) => (
      <View key={item.id} style={styles.transitionPill}>
        <Text style={styles.transitionText}>{item.text}</Text>
      </View>
    ))}
  </View>
);

const WhiteboardStage = ({
  boardState,
  currentScene,
  objectiveText,
  status,
  modeLabel,
}) => {
  const layers = boardState?.layers || {};

  return (
    <View style={styles.stageRoot}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Whiteboard</Text>
          <Text style={styles.sceneTitle} numberOfLines={1}>{currentScene?.title || 'Lesson board'}</Text>
          <Text style={styles.objectiveText} numberOfLines={2}>{objectiveText || 'Teaching content is being prepared.'}</Text>
        </View>
        <View style={styles.modeChip}>
          <Text style={styles.modeChipText}>{modeLabel}</Text>
        </View>
      </View>

      <View style={styles.statusBar}>
        <View style={[styles.statusPulse, { backgroundColor: status?.tone || '#60a5fa' }]} />
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>{status?.label || 'Teaching'}</Text>
          <Text style={styles.statusText} numberOfLines={1}>{status?.detail || 'Scene orchestration is active.'}</Text>
        </View>
      </View>

      <View style={styles.boardCanvas}>
        <View style={[styles.backgroundLayer, { backgroundColor: layers.background?.tone === 'clean' ? '#f8fbff' : '#ffffff' }]}>
          <View style={[styles.backgroundGlow, { backgroundColor: layers.background?.accent || '#dbeafe' }]} />
        </View>
        <View style={styles.contentShell}>
          <View style={styles.staticLayer}>
            {renderStaticLayer(layers.static || [])}
          </View>
          <View style={styles.dynamicLayer}>
            {renderDynamicLayer(layers.dynamic || [])}
          </View>
          <View style={styles.diagramLayer}>
            {renderDiagramLayer(layers.diagram || [])}
          </View>
        </View>
        <View style={styles.highlightLayer} pointerEvents="none">
          {renderHighlightLayer(layers.highlight || [])}
        </View>
        <View style={styles.transitionLayer} pointerEvents="none">
          {renderTransitionLayer(layers.transition || [])}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stageRoot: { flex: 1, padding: 20, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  sceneTitle: { color: '#0f172a', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  objectiveText: { color: '#475569', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  modeChip: { backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  modeChipText: { color: '#1d4ed8', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  statusBar: { borderRadius: 18, borderWidth: 1, borderColor: '#dbe7f5', backgroundColor: '#f8fbff', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusPulse: { width: 10, height: 10, borderRadius: 999 },
  statusCopy: { flex: 1, minWidth: 0 },
  statusTitle: { color: '#0f172a', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  statusText: { color: '#64748b', fontSize: 13 },
  boardCanvas: { flex: 1, borderRadius: 24, borderWidth: 1, borderColor: '#dbe7f5', overflow: 'hidden', position: 'relative', minHeight: 0, backgroundColor: '#ffffff' },
  backgroundLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  backgroundGlow: { position: 'absolute', right: -80, top: -60, width: 220, height: 220, borderRadius: 220, opacity: 0.45 },
  contentShell: { flex: 1, padding: 22, gap: 16 },
  staticLayer: { gap: 8 },
  dynamicLayer: { flex: 1, gap: 14, minHeight: 0, justifyContent: 'flex-start' },
  diagramLayer: { gap: 14 },
  boardTitle: { color: '#0f172a', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  sectionBlock: { gap: 10 },
  sectionLabel: { color: '#1d4ed8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: '#2563eb', marginTop: 7 },
  bulletText: { flex: 1, color: '#0f172a', fontSize: 17, lineHeight: 25, fontWeight: '600' },
  infoCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  infoCardTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  infoCardText: { color: '#334155', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  exampleCard: { backgroundColor: '#f8fafc', borderColor: '#dbe7f5' },
  exampleNote: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  equationCard: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  equationText: { color: '#1e3a8a', fontSize: 22, lineHeight: 28, fontWeight: '800' },
  equationNote: { color: '#475569', fontSize: 13, lineHeight: 19 },
  codeText: { color: '#0f172a', fontSize: 14, lineHeight: 21, fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' },
  diagramBlock: { gap: 10 },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flowBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  flowBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  flowText: { flex: 1, color: '#0f172a', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  compareRow: { borderWidth: 1, borderColor: '#dbe7f5', borderRadius: 16, padding: 14, backgroundColor: '#ffffff' },
  compareTitle: { color: '#0f172a', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  compareBody: { color: '#475569', fontSize: 14, lineHeight: 21 },
  nodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nodeCard: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe7f5' },
  nodeText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  diagramCaption: { color: '#64748b', fontSize: 13, lineHeight: 19 },
  highlightLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 18 },
  highlightRail: { gap: 8, alignItems: 'flex-end' },
  highlightPill: { backgroundColor: 'rgba(37,99,235,0.12)', borderColor: '#93c5fd', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 220 },
  highlightText: { color: '#1d4ed8', fontSize: 12, fontWeight: '800' },
  transitionLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', alignItems: 'flex-start', padding: 18 },
  transitionRail: { gap: 8 },
  transitionPill: { maxWidth: '72%', backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  transitionText: { color: '#334155', fontSize: 13, lineHeight: 18, fontWeight: '700' },
});

export default WhiteboardStage;
