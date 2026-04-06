import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import client from '../../api/client';

interface Enhancement {
  enhancedSummary: string;
  improvedBullets: string[];
  suggestedSkills: string[];
  atsScore: number;
  suggestions: string[];
}

export default function ResumeScreen() {
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [enhancement, setEnhancement] = useState<Enhancement | null>(null);

  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes-mobile'],
    queryFn: () => client.get('/resume').then((r) => r.data),
  });

  const enhanceMutation = useMutation({
    mutationFn: (id: string) => client.post(`/resume/${id}/enhance`).then((r) => r.data),
    onSuccess: (data) => {
      setEnhancement(data.enhancement);
    },
    onError: () => Alert.alert('Error', 'AI enhancement failed. Please try again.'),
  });

  if (enhancement) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.enhancementContainer}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>ATS Score</Text>
          <Text style={styles.scoreValue}>{enhancement.atsScore}/100</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${enhancement.atsScore}%` as any }]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enhanced Summary</Text>
          <Text style={styles.sectionContent}>{enhancement.enhancedSummary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Improved Bullet Points</Text>
          {enhancement.improvedBullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Skills</Text>
          <View style={styles.skillsRow}>
            {enhancement.suggestedSkills.map((s) => (
              <View key={s} style={styles.skillTag}>
                <Text style={styles.skillTagText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          {enhancement.suggestions.map((s, i) => (
            <View key={i} style={styles.suggestionRow}>
              <Text style={styles.suggestionCheck}>✓</Text>
              <Text style={styles.suggestionText}>{s}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => setEnhancement(null)}>
          <Text style={styles.backBtnText}>← Back to Resumes</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {enhanceMutation.isPending && (
        <View style={styles.aiLoadingBanner}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.aiLoadingText}>✨ Claude AI is analyzing your resume...</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#6366f1" />
      ) : (
        <FlatList
          data={(resumes as any[]) ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.resumeCard}>
              <Text style={styles.resumeTitle}>{item.title}</Text>
              <Text style={styles.resumeName}>{item.personalInfo?.fullName}</Text>
              <Text style={styles.resumeEmail}>{item.personalInfo?.email}</Text>
              <View style={styles.resumeStats}>
                <Text style={styles.statItem}>{item.experience?.length || 0} exp</Text>
                <Text style={styles.statSep}>·</Text>
                <Text style={styles.statItem}>{item.education?.length || 0} edu</Text>
                <Text style={styles.statSep}>·</Text>
                <Text style={styles.statItem}>{item.skills?.length || 0} skills</Text>
              </View>
              <TouchableOpacity
                style={styles.enhanceBtn}
                onPress={() => {
                  setSelectedResumeId(item._id);
                  enhanceMutation.mutate(item._id);
                }}
                disabled={enhanceMutation.isPending}
              >
                <Text style={styles.enhanceBtnText}>✨ Enhance with AI</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>No resumes yet.</Text>
              <Text style={styles.emptySubtext}>Create one from the web app to get started.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loader: { marginTop: 48 },
  aiLoadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#e0e7ff', paddingHorizontal: 16, paddingVertical: 12 },
  aiLoadingText: { color: '#4f46e5', fontSize: 14, fontWeight: '500' },
  list: { padding: 16, gap: 12 },
  resumeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  resumeTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  resumeName: { fontSize: 14, color: '#374151' },
  resumeEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  resumeStats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  statItem: { fontSize: 12, color: '#6b7280' },
  statSep: { fontSize: 12, color: '#d1d5db' },
  enhanceBtn: { backgroundColor: '#6366f1', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  enhanceBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af', fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: '#c4c4c4', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
  // Enhancement view
  enhancementContainer: { padding: 20 },
  scoreCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  scoreLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  scoreValue: { fontSize: 32, fontWeight: '800', color: '#6366f1' },
  progressBar: { width: '100%', height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 10 },
  sectionContent: { fontSize: 14, color: '#374151', lineHeight: 22 },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  bullet: { color: '#6366f1', fontSize: 16 },
  bulletText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  skillTagText: { fontSize: 12, color: '#6366f1', fontWeight: '500' },
  suggestionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  suggestionCheck: { color: '#16a34a', fontSize: 14 },
  suggestionText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  backBtn: { backgroundColor: '#f3f4f6', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  backBtnText: { color: '#6b7280', fontWeight: '600' },
});
