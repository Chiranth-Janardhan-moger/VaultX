import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { clearAllSecure } from '@/lib/secure';
import { Ionicons } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

export default function ImportScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [backupFile, setBackupFile] = React.useState<string | null>(null);
  const [backupPassword, setBackupPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const pickFile = React.useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      const file = result.assets[0];
      
      // Validate file extension
      if (!file.name.toLowerCase().endsWith('.vxb')) {
        Alert.alert('Invalid File', 'Please select a VaultX backup file (.vxb)');
        return;
      }
      
      setBackupFile(file.uri);
      Alert.alert('File Selected', file.name);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to pick file');
    }
  }, []);

  const handleImport = React.useCallback(async () => {
    if (!backupFile) {
      Alert.alert('No File Selected', 'Please select a backup file first');
      return;
    }
    if (!backupPassword) {
      Alert.alert('Password Required', 'Enter your backup password');
      return;
    }

    setBusy(true);
    try {
      // Read backup file
      const content = await FileSystem.readAsStringAsync(backupFile);
      const backup = JSON.parse(content);

      if (!backup.vault || !backup.version) {
        Alert.alert('Invalid Backup', 'This file is not a valid VaultX backup');
        return;
      }

      // Decrypt master password if present
      let decryptedMP = null;
      if (backup.encryptedMasterPassword) {
        try {
          decryptedMP = CryptoJS.AES.decrypt(backup.encryptedMasterPassword, backupPassword).toString(CryptoJS.enc.Utf8);
          
          if (!decryptedMP) {
            Alert.alert('Incorrect Password', 'The backup password you entered is incorrect');
            return;
          }
        } catch {
          Alert.alert('Incorrect Password', 'The backup password you entered is incorrect');
          return;
        }
      }

      // IMPORTANT: Clear all old SecureStore data (PIN, password wraps, etc.)
      await clearAllSecure();

      // Save master password if present
      if (decryptedMP) {
        await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, decryptedMP);
      }

      // Write vault file
      const vaultPath = `${(FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory}vault_v1.enc`;
      await FileSystem.writeAsStringAsync(vaultPath, backup.vault);

      Alert.alert(
        'Restore Complete!',
        'Your vault has been restored. You need to set up a new PIN and password for this device.\n\nYou will be redirected to the setup page.',
        [
          { 
            text: 'OK', 
            onPress: () => router.replace('/')
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to import backup');
    } finally {
      setBusy(false);
    }
  }, [backupFile, backupPassword, router]);

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Import Backup</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#fef3c7', borderColor: '#fbbf24' }]}>
          <Ionicons name="warning" size={24} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.warningTitle, { color: '#92400e' }]}>Important!</Text>
            <Text style={[styles.warningText, { color: '#92400e' }]}>
              Importing will replace your current vault and clear all login credentials. You'll need to set up a new PIN and password after import.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Backup File</Text>
          
          <TouchableOpacity
            style={[styles.pickButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={pickFile}
          >
            <Ionicons name="document-outline" size={24} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickText, { color: colors.text }]}>
                {backupFile ? 'File selected ✓' : 'Choose backup file'}
              </Text>
              <Text style={[styles.pickSubtext, { color: colors.mutedText }]}>
                Only .vxb files
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.mutedText }]}>Backup Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter backup password"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPassword}
              value={backupPassword}
              onChangeText={setBackupPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.mutedText }]}>Backup password is case-sensitive</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}
            disabled={busy}
            onPress={handleImport}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>{busy ? 'Restoring...' : 'Restore Backup'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '900' },
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  warningTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  warningText: { fontSize: 13, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  pickButton: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pickText: { fontSize: 15, fontWeight: '700' },
  pickSubtext: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  hint: { fontSize: 11, fontWeight: '600', marginBottom: 12, marginTop: -8 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  inputWrap: { position: 'relative', marginBottom: 16 },
  eyeBtn: { position: 'absolute', right: 2, top: 0, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
