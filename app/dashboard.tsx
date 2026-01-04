import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categories, categorizeService, type CategoryType } from '@/lib/categories';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

const maskPhone = (phone: string): string => {
  if (phone.length <= 4) return phone;
  const first2 = phone.slice(0, 2);
  const last2 = phone.slice(-2);
  const middle = 'X'.repeat(phone.length - 4);
  return `${first2}${middle}${last2}`;
};

export default function Dashboard() {
  const router = useRouter();
  const { unlocked, vault, lock } = useSession();
  const { colors } = useTheme();
  
  const [showCategoryMenu, setShowCategoryMenu] = React.useState(false);
  const [showFabMenu, setShowFabMenu] = React.useState(false);
  const [hasMasterPassword, setHasMasterPassword] = React.useState(false);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnims = React.useRef(categories.map(() => new Animated.Value(0))).current;

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  React.useEffect(() => {
    (async () => {
      const mp = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
      setHasMasterPassword(!!mp);
    })();
  }, []);

  React.useEffect(() => {
    // Animate bars in with slide from left
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.stagger(
        60,
        scaleAnims.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, []);

  // Count passwords per category
  const categoryCounts = React.useMemo(() => {
    if (!vault?.passwords) return {};
    
    const counts: { [key in CategoryType]?: number } = {};
    
    vault.passwords.forEach(pwd => {
      const category = pwd.category || categorizeService(pwd.service);
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return counts;
  }, [vault?.passwords]);

  return (
    <Screen>
      <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>VaultX</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {vault?.user.phone ? maskPhone(vault.user.phone) : ''}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                lock();
                router.replace('/login');
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((category, index) => {
            const count = categoryCounts[category.id] || 0;
            
            return (
              <Animated.View
                key={category.id}
                style={{
                  transform: [
                    {
                      translateX: scaleAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                  opacity: scaleAnims[index],
                }}
              >
                <TouchableOpacity
                  style={styles.categoryBar}
                  onPress={() => router.push(`/category/${category.id}`)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={category.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBar}
                  >
                    <View style={styles.barLeft}>
                      <View style={styles.barIconWrap}>
                        <Ionicons name={category.icon as any} size={24} color="#fff" />
                      </View>
                      <View style={styles.barTextWrap}>
                        <Text style={styles.barTitle}>{category.name}</Text>
                        <Text style={styles.barSubtitle}>{count} password{count !== 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.barRight}>
                      <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        {showFabMenu ? (
          <>
            <TouchableOpacity
              style={styles.fabOverlay}
              activeOpacity={1}
              onPress={() => setShowFabMenu(false)}
            />
            <View style={styles.fabMenu}>
              <TouchableOpacity
                style={[styles.fabMenuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setShowFabMenu(false);
                  router.push('/add');
                }}
              >
                <View style={[styles.fabMenuIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="key" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fabMenuText, { color: colors.text }]}>Add Password</Text>
                  <Text style={[styles.fabMenuSubtext, { color: colors.mutedText }]}>Save existing password</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fabMenuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setShowFabMenu(false);
                  if (!hasMasterPassword) {
                    Alert.alert(
                      'Master Password Required',
                      'Set up your master password to generate strong passwords',
                      [
                        { text: 'Set Up Now', onPress: () => router.push('/master-password-intro') },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    );
                  } else {
                    router.push('/generate-password');
                  }
                }}
              >
                <View style={[styles.fabMenuIcon, { backgroundColor: '#8b5cf6' + '15' }]}>
                  <Ionicons name="sparkles" size={22} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fabMenuText, { color: colors.text }]}>Generate Password</Text>
                  <Text style={[styles.fabMenuSubtext, { color: colors.mutedText }]}>
                    {hasMasterPassword ? 'Create strong password' : 'Setup required'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowFabMenu(!showFabMenu)}
          activeOpacity={0.9}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: showFabMenu ? '45deg' : '0deg',
                },
              ],
            }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollView: { flex: 1 },
  listContainer: {
    paddingBottom: 100,
    gap: 12,
  },
  categoryBar: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  gradientBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 80,
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  barIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTextWrap: {
    flex: 1,
  },
  barTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  barSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  barRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  fabMenu: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  fabMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuText: {
    fontSize: 16,
    fontWeight: '800',
  },
  fabMenuSubtext: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 18,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});
