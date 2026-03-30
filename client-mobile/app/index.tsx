import { theme } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useReports } from "@/context/ReportContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();
  const { reports } = useReports();
  const [accountVisible, setAccountVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkmak istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          setAccountVisible(false);
          await logout();
        },
      },
    ]);
  };

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  const pendingCount = reports.filter((r) => r.status === "beklemede").length;
  const reviewCount = reports.filter((r) => r.status === "inceleniyor").length;
  const resolvedCount = reports.filter((r) => r.status === "cozuldu").length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>ABB</Text>
              <Text style={styles.headerSubtitle}>
                Altyapı Bildirim Sistemi
              </Text>
            </View>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => setAccountVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatItem
                number={reports.length}
                label="Toplam"
                color={theme.colors.primary}
              />
              <View style={styles.statDivider} />
              <StatItem
                number={pendingCount}
                label="Beklemede"
                color={theme.colors.warning}
              />
              <View style={styles.statDivider} />
              <StatItem
                number={reviewCount}
                label="İnceleniyor"
                color={theme.colors.info}
              />
              <View style={styles.statDivider} />
              <StatItem
                number={resolvedCount}
                label="Çözüldü"
                color={theme.colors.success}
              />
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/report" as any)}
            activeOpacity={0.85}
          >
            <View style={styles.primaryButtonIcon}>
              <Ionicons name="camera" size={26} color={theme.colors.primary} />
            </View>
            <View style={styles.primaryButtonContent}>
              <Text style={styles.primaryButtonTitle}>Sorun Bildir</Text>
              <Text style={styles.primaryButtonSub}>
                Fotoğraf çek, konumu paylaş
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/history" as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons
                name="document-text"
                size={22}
                color={theme.colors.warning}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Bekleyen Taleplerim</Text>
              <Text style={styles.actionSub}>
                Geçmiş bildirimleri görüntüle
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/map" as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="map" size={22} color={theme.colors.info} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Harita</Text>
              <Text style={styles.actionSub}>Bildirimleri haritada gör</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Ankara Büyükşehir Belediyesi</Text>
      </View>

      <Modal
        visible={accountVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAccountVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>
                  {user?.name?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={styles.modalUserInfo}>
                <Text style={styles.modalName}>{user?.name}</Text>
                <Text style={styles.modalEmail}>{user?.email}</Text>
              </View>
            </View>
            <View style={styles.modalDivider} />
            <TouchableOpacity style={styles.modalLogout} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
              <Text style={styles.modalLogoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatItem({
  number,
  label,
  color,
}: {
  number: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statNumber, { color }]}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 16,
  },
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    width: 260,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  modalAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  modalUserInfo: {
    flex: 1,
  },
  modalName: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  modalEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  modalLogout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  modalLogoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.danger,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginTop: -20,
  },
  statsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  primaryButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  primaryButtonContent: {
    flex: 1,
  },
  primaryButtonTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },
  primaryButtonSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  actionSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  footer: {
    textAlign: "center",
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: "auto",
    paddingBottom: 24,
  },
});
