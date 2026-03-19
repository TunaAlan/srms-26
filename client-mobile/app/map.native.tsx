import { theme } from "@/constants/theme";
import { useReports } from "@/context/ReportContext";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

const CATEGORY_COLORS: Record<string, string> = {
  yol: "#E8651A",
  su: "#0288D1",
  elektrik: "#E8A317",
  bina: "#7B1FA2",
  park: "#0D9E4F",
  cop: "#5D4037",
  gaz: "#D32F2F",
  diger: "#8E95A8",
};

export default function MapScreen() {
  const { reports } = useReports();
  const [region, setRegion] = useState({
    latitude: 39.9334,
    longitude: 32.8597,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  if (reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="map-outline"
            size={48}
            color={theme.colors.textTertiary}
          />
        </View>
        <Text style={styles.emptyTitle}>Haritada Bildirim Yok</Text>
        <Text style={styles.emptySubtitle}>
          Bildirim gönderin, burada görünsün
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.latitude,
              longitude: report.longitude,
            }}
            pinColor={CATEGORY_COLORS[report.category] || "#8E95A8"}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutCategory}>
                  {report.categoryLabel}
                </Text>
                <Text style={styles.calloutDesc} numberOfLines={2}>
                  {report.description}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Kategoriler</Text>
        <View style={styles.legendGrid}>
          {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>{key}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  callout: { width: 180, padding: 4 },
  calloutCategory: {
    fontWeight: "700",
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  calloutDesc: { fontSize: 12, color: "#333" },
  legend: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 12,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  legendGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    fontSize: 11,
    color: theme.colors.text,
    textTransform: "capitalize",
  },
  emptyContainer: {
    flex: 1,
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
  emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
});
