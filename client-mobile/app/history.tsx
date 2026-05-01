import { theme } from "@/constants/theme";
import { useReports } from "@/context/ReportContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const STATUS_CONFIG: Record<
  string,
  { color: string; label: string; icon: string }
> = {
  pending:     { color: theme.colors.warning,  label: "Beklemede",         icon: "time" },
  in_review:   { color: theme.colors.info,     label: "İncelemede",        icon: "search" },
  in_progress: { color: theme.colors.success,  label: "İşleme Alındı",     icon: "hammer" },
  resolved:    { color: theme.colors.success,  label: "Çözüldü",           icon: "checkmark-circle" },
  rejected:    { color: theme.colors.critical, label: "Reddedildi",        icon: "close-circle" },
};

const CRITICALITY_CONFIG: Record<string, { color: string; label: string }> = {
  kritik:    { color: theme.colors.critical,     label: "Kritik" },
  yuksek:    { color: theme.colors.high,          label: "Yüksek" },
  orta:      { color: theme.colors.medium,        label: "Orta" },
  dusuk:     { color: theme.colors.low,           label: "Düşük" },
  belirsiz:  { color: theme.colors.textTertiary,  label: "—" },
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function ReportCard({ item }: { item: any }) {
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const criticality =
    CRITICALITY_CONFIG[item.criticality] || CRITICALITY_CONFIG.belirsiz;
  const [photoOpen, setPhotoOpen] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setPhotoOpen(true)} activeOpacity={0.9}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        <View style={styles.zoomBadge}>
          <Text style={styles.zoomIcon}>🔍</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <Pressable style={styles.lightboxOverlay} onPress={() => setPhotoOpen(false)}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setPhotoOpen(false)}>
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: item.image }}
            style={styles.lightboxImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.categoryLabel}>{item.categoryLabel}</Text>
          <Text style={styles.timeText}>
            {getTimeAgo(new Date(item.timestamp))}
          </Text>
        </View>
        {item.userDescription ? (
          <View style={styles.descBlock}>
            <Text style={styles.descLabel}>Açıklamanız:</Text>
            <Text style={styles.description} numberOfLines={2}>
              {item.userDescription}
            </Text>
          </View>
        ) : null}
        {item.aiDescription ? (
          <View style={styles.descBlock}>
            <Text style={styles.descLabelAi}>AI Analizi:</Text>
            <Text style={styles.description} numberOfLines={2}>
              {item.aiDescription}
            </Text>
          </View>
        ) : null}
        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={12}
            color={theme.colors.textTertiary}
          />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        {item.rejectReason && (
          <View style={styles.rejectBlock}>
            <Text style={styles.rejectLabel}>Red Sebebi:</Text>
            <Text style={styles.rejectText}>{item.rejectReason}</Text>
          </View>
        )}
        <View style={styles.badgeRow}>
          <View
            style={[styles.badge, { backgroundColor: status.color + "20" }]}
          >
            <Ionicons
              name={status.icon as any}
              size={12}
              color={status.color}
            />
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: criticality.color + "20" },
            ]}
          >
            <View
              style={[styles.critDot, { backgroundColor: criticality.color }]}
            />
            <Text style={[styles.badgeText, { color: criticality.color }]}>
              {criticality.label}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { reports, fetchReports } = useReports();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={["#005BAA"]}
      tintColor="#005BAA"
    />
  );

  if (reports.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={refreshControl}
      >
        <View style={styles.emptyIcon}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={theme.colors.textTertiary}
          />
        </View>
        <Text style={styles.emptyTitle}>Henüz Bildirim Yok</Text>
        <Text style={styles.emptySubtitle}>
          Gönderdiğiniz bildirimler burada görünecek
        </Text>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={reports}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ReportCard item={item} />}
      contentContainerStyle={styles.list}
      style={{ backgroundColor: theme.colors.background }}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  cardImage: { width: "100%", height: 160 },
  zoomBadge: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16, width: 32, height: 32,
    alignItems: "center", justifyContent: "center",
  },
  zoomIcon: { fontSize: 16 },
  lightboxOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center", justifyContent: "center",
  },
  lightboxClose: {
    position: "absolute", top: 52, right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  lightboxImage: { width: "100%", height: "80%" },
  cardBody: { padding: 14 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeText: { fontSize: 12, color: theme.colors.textTertiary },
  descBlock: {
    marginBottom: 4,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  descLabelAi: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  locationText: { fontSize: 12, color: theme.colors.textTertiary, flex: 1 },
  rejectBlock: {
    backgroundColor: "#fff1f2",
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.critical,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  rejectLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.critical,
    marginBottom: 2,
  },
  rejectText: {
    fontSize: 12,
    color: theme.colors.critical,
    lineHeight: 17,
  },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  critDot: { width: 6, height: 6, borderRadius: 3 },
  emptyContainer: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
