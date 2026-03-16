import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

const renderStaticLayer = (items) => items.map((item) => (
  <Text key={item.id} style={styles.boardTitle}>{item.text}</Text>
));

const renderDynamicLayer = (items) => items.map((item) => {
  if (item.kind === 'paragraph') {
    return (
      <View key={item.id} style={[styles.contentBlock, item.tone === 'focus' && styles.focusBlock]}>
        {item.title ? <Text style={styles.blockTitle}>{item.title}</Text> : null}
        <Text style={styles.blockText}>{item.text}</Text>
      </View>
    );
  }

  if (item.kind === 'bullet_list') {
    return (
      <View key={item.id} style={styles.sectionStack}>
        {item.title ? <Text style={styles.sectionLabel}>{item.title}</Text> : null}
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
      <View key={item.id} style={[styles.contentBlock, styles.equationBlock]}>
        <Text style={styles.equationText}>{item.expression}</Text>
        {item.note ? <Text style={styles.equationNote}>{item.note}</Text> : null}
      </View>
    );
  }

  if (item.kind === 'example') {
    return (
      <View key={item.id} style={[styles.contentBlock, styles.exampleBlock]}>
        {item.title ? <Text style={styles.blockTitle}>{item.title}</Text> : null}
        <Text style={item.format === 'code' ? styles.codeText : styles.blockText}>{item.content}</Text>
        {item.note ? <Text style={styles.helperText}>{item.note}</Text> : null}
      </View>
    );
  }

  return null;
});

const renderDiagramLayer = (items) => items.map((item) => {
  if (item.diagramType === 'flowchart') {
    return (
      <View key={item.id} style={styles.diagramBlock}>
        {item.title ? <Text style={styles.sectionLabel}>{item.title}</Text> : null}
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
        {item.title ? <Text style={styles.sectionLabel}>{item.title}</Text> : null}
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
      {item.title ? <Text style={styles.sectionLabel}>{item.title}</Text> : null}
      <View style={styles.nodeGrid}>
        {item.nodes.map((node, index) => (
          <View key={`${item.id}-${index}`} style={styles.nodeCard}>
            <Text style={styles.nodeText}>{node.label || node.title || node}</Text>
          </View>
        ))}
      </View>
      {item.caption ? <Text style={styles.helperText}>{item.caption}</Text> : null}
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
      <View key={item.id} style={styles.transitionBubble}>
        <Text style={styles.transitionText}>{item.text}</Text>
      </View>
    ))}
  </View>
);

const WhiteboardStage = ({ boardState, currentScene, objectiveText, status, modeLabel }) => {
  const layers = boardState?.layers || {};

  return (
    <View style={styles.stageRoot}>
      <View style={styles.gridOverlay} pointerEvents="none" />
      <View style={styles.topRail}>
        <View style={styles.titleCopy}>
          <Text style={styles.eyebrow}>AI Whiteboard</Text>
          <Text style={styles.sceneTitle} numberOfLines={1}>{currentScene?.title || 'Lesson board'}</Text>
          <Text style={styles.objectiveText} numberOfLines={2}>{objectiveText || 'Teaching content is being prepared.'}</Text>
        </View>
        <View style={styles.metaRail}>
          <View style={styles.metaPill}>
            <View style={[styles.statusDot, { backgroundColor: status?.tone || '#60a5fa' }]} />
            <Text style={styles.metaText}>{status?.label || 'Teaching'}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>{modeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentShell}>
        <View style={styles.staticLayer}>{renderStaticLayer(layers.static || [])}</View>
        <View style={styles.dynamicLayer}>{renderDynamicLayer(layers.dynamic || [])}</View>
        <View style={styles.diagramLayer}>{renderDiagramLayer(layers.diagram || [])}</View>
      </View>

      <View style={styles.highlightLayer} pointerEvents="none">{renderHighlightLayer(layers.highlight || [])}</View>
      <View style={styles.transitionLayer} pointerEvents="none">{renderTransitionLayer(layers.transition || [])}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  stageRoot: { flex: 1, padding: 20, backgroundColor: '#07111c', overflow: 'hidden' },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  topRail: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 18, zIndex: 2 },
  titleCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#7dd3fc', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  sceneTitle: { color: '#f8fafc', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  objectiveText: { color: '#a5b4c7', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  metaRail: { alignItems: 'flex-end', gap: 8, maxWidth: '38%' },
  metaPill: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(125,211,252,0.18)', backgroundColor: 'rgba(10,18,30,0.86)', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: '#dbeafe', fontSize: 12, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  contentShell: { flex: 1, minHeight: 0, gap: 18, zIndex: 1 },
  staticLayer: { gap: 10 },
  dynamicLayer: { gap: 14, minHeight: 0 },
  diagramLayer: { gap: 14 },
  boardTitle: { color: '#f8fafc', fontSize: 36, lineHeight: 40, fontWeight: '800' },
  contentBlock: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(148,163,184,0.14)', backgroundColor: 'rgba(15,23,42,0.58)', padding: 16, gap: 8 },
  focusBlock: { borderColor: 'rgba(96,165,250,0.4)', backgroundColor: 'rgba(29,78,216,0.14)' },
  blockTitle: { color: '#7dd3fc', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  blockText: { color: '#e2e8f0', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  sectionStack: { gap: 10 },
  sectionLabel: { color: '#7dd3fc', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#38bdf8', marginTop: 7 },
  bulletText: { flex: 1, color: '#f8fafc', fontSize: 17, lineHeight: 24, fontWeight: '600' },
  equationBlock: { backgroundColor: 'rgba(30,64,175,0.18)', borderColor: 'rgba(96,165,250,0.3)' },
  equationText: { color: '#dbeafe', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  equationNote: { color: '#bfdbfe', fontSize: 13, lineHeight: 19 },
  exampleBlock: { backgroundColor: 'rgba(15,23,42,0.8)' },
  codeText: { color: '#e2e8f0', fontSize: 14, lineHeight: 21, fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' },
  helperText: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  diagramBlock: { gap: 10 },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flowBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  flowBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  flowText: { flex: 1, color: '#e2e8f0', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  compareRow: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(148,163,184,0.14)', backgroundColor: 'rgba(15,23,42,0.56)', padding: 14 },
  compareTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  compareBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  nodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nodeCard: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(148,163,184,0.14)', backgroundColor: 'rgba(15,23,42,0.6)' },
  nodeText: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  highlightLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 18 },
  highlightRail: { gap: 8, alignItems: 'flex-end' },
  highlightPill: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(96,165,250,0.36)', backgroundColor: 'rgba(30,64,175,0.2)', paddingHorizontal: 12, paddingVertical: 8, maxWidth: 240 },
  highlightText: { color: '#dbeafe', fontSize: 12, fontWeight: '800' },
  transitionLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', alignItems: 'flex-start', padding: 18 },
  transitionRail: { gap: 8 },
  transitionBubble: { maxWidth: '74%', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(125,211,252,0.18)', backgroundColor: 'rgba(7,12,22,0.92)', paddingHorizontal: 14, paddingVertical: 12 },
  transitionText: { color: '#dbeafe', fontSize: 13, lineHeight: 18, fontWeight: '700' },
});

export default WhiteboardStage;
