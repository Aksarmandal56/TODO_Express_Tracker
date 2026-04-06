import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import client from '../../api/client';

export default function ExpensesScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'reports' | 'transactions'>('reports');

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses-mobile'],
    queryFn: () => client.get('/expenses').then((r) => r.data),
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['transactions-mobile'],
    queryFn: () => client.get('/expenses/transactions').then((r) => r.data),
    enabled: activeTab === 'transactions',
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return client.post('/expenses/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-mobile'] });
      Alert.alert('Success', 'PDF uploaded and queued for processing!');
    },
    onError: () => Alert.alert('Error', 'Upload failed. Please try again.'),
  });

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name || 'statement.pdf',
      } as any);

      uploadMutation.mutate(formData);
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const statusColors: Record<string, string> = {
    processed: '#d1fae5',
    processing: '#dbeafe',
    pending: '#fef3c7',
    failed: '#fee2e2',
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {['reports', 'transactions'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'reports' && (
        <>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handlePickDocument}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadBtnText}>📤 Upload Bank Statement PDF</Text>
            )}
          </TouchableOpacity>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} size="large" color="#6366f1" />
          ) : (
            <FlatList
              data={(expenses as any[]) ?? []}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.filename} numberOfLines={1}>{item.originalName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || '#f3f4f6' }]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    {item.transactionCount} transactions · ${item.totalAmount?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No expense reports. Upload a PDF statement to start tracking.</Text>
              }
            />
          )}
        </>
      )}

      {activeTab === 'transactions' && (
        txLoading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#6366f1" />
        ) : (
          <FlatList
            data={(transactions as any[]) ?? []}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.txCard}>
                <View style={styles.txLeft}>
                  <Text style={styles.txDesc} numberOfLines={2}>{item.description}</Text>
                  <Text style={styles.txCategory}>{item.category}</Text>
                </View>
                <Text style={[styles.txAmount, item.type === 'credit' ? styles.credit : styles.debit]}>
                  {item.type === 'credit' ? '+' : '-'}${item.amount?.toFixed(2)}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No transactions. Upload a bank statement first.</Text>
            }
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#6366f1', fontWeight: '700' },
  uploadBtn: { backgroundColor: '#6366f1', margin: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  loader: { marginTop: 48 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  filename: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, color: '#374151', textTransform: 'capitalize' },
  cardMeta: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  cardDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  txCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  txLeft: { flex: 1, marginRight: 10 },
  txDesc: { fontSize: 13, color: '#1f2937', fontWeight: '500' },
  txCategory: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  credit: { color: '#16a34a' },
  debit: { color: '#dc2626' },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 48, fontSize: 15, paddingHorizontal: 20 },
});
