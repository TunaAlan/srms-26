import { theme } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useReports } from "@/context/ReportContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { reports } = useReports();

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
            <View style={styles.logo}>
              <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            </View>
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
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
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
