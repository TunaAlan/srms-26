import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../constants/theme";
import { useReports } from "../context/ReportContext";

const CATEGORIES = [
  { id: "road_damage",      label: "Yol Hasarı",        icon: "car" as const },
  { id: "sidewalk_damage",  label: "Kaldırım Hasarı",   icon: "footsteps" as const },
  { id: "waste",            label: "Çöp / Atık",        icon: "trash" as const },
  { id: "pollution",        label: "Çevre Kirliliği",   icon: "cloud" as const },
  { id: "green_space",      label: "Yeşil Alan",        icon: "leaf" as const },
  { id: "lighting",         label: "Aydınlatma",        icon: "flashlight" as const },
  { id: "traffic_sign",     label: "Trafik İşareti",    icon: "warning" as const },
  { id: "sewage_water",     label: "Kanalizasyon / Su", icon: "water" as const },
  { id: "infrastructure",   label: "Altyapı",           icon: "construct" as const },
  { id: "vandalism",        label: "Vandalizm",         icon: "hammer" as const },
  { id: "stray_animal",     label: "Başıboş Hayvan",    icon: "paw" as const },
  { id: "natural_disaster", label: "Doğal Afet",        icon: "thunderstorm" as const },
];

export default function ReportScreen() {
  const router = useRouter();
  const { addReport } = useReports();
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "İzin Gerekli",
          "Konum izni verilmedi. Ayarlardan etkinleştirebilirsiniz.",
        );
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      let addressStr = "Bilinmeyen konum";
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        const addr = geocode[0];
        if (addr) {
          addressStr = [addr.street, addr.name, addr.city || addr.subregion]
            .filter(Boolean)
            .join(", ");
        }
      } catch (geoErr) {
        console.log("Geocode hatası");
      }
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: addressStr,
      });
    } catch (err) {
      Alert.alert("Konum Hatası", "Konumunuz alınamadı. Tekrar deneyin.");
    } finally {
      setLoadingLocation(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin Gerekli", "Kamera erişimi gereklidir.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const selectedCat = CATEGORIES.find((c) => c.id === category);

  const handleSubmit = async () => {
    if (!image) {
      Alert.alert("Fotoğraf Gerekli", "Lütfen soruna ait bir fotoğraf ekleyin.");
      return;
    }
    setSubmitting(true);
    const success = await addReport({
      image,
      description: description.trim() || undefined,
      userCategory: category || undefined,
      userCategoryLabel: selectedCat?.label,
      latitude: location?.latitude || 0,
      longitude: location?.longitude || 0,
      address: location?.address || "Bilinmeyen",
    });
    setSubmitting(false);

    if (success) {
      Alert.alert(
        "Bildirim Gönderildi!",
        "Bildiriminiz başarıyla kaydedildi. Teşekkürler.",
        [{ text: "Tamam", onPress: () => router.replace("/history" as any) }],
      );
    } else {
      Alert.alert("Hata", "Bildirim gönderilemedi. Tekrar deneyin.");
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Photo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fotoğraf</Text>
        {image ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: image }} style={styles.preview} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => setImage(null)}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <View style={styles.photoBtnIcon}>
                <Ionicons
                  name="camera"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.photoBtnText}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
              <View style={styles.photoBtnIcon}>
                <Ionicons
                  name="images"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.photoBtnText}>Galeri</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Konum</Text>
        <TouchableOpacity
          style={styles.locationCard}
          onPress={getLocation}
          activeOpacity={0.7}
        >
          {loadingLocation ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : location ? (
            <View style={styles.locationRow}>
              <View style={styles.locationIconWrap}>
                <Ionicons
                  name="location"
                  size={18}
                  color={theme.colors.success}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationAddress}>{location.address}</Text>
                <Text style={styles.locationCoords}>
                  {location.latitude.toFixed(5)},{" "}
                  {location.longitude.toFixed(5)}
                </Text>
              </View>
              <Ionicons
                name="refresh"
                size={18}
                color={theme.colors.textTertiary}
              />
            </View>
          ) : (
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={20}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.locationMissing}>
                Konum almak için dokunun
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategori <Text style={{ fontWeight: '400', textTransform: 'none' }}>(opsiyonel)</Text></Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryItem,
                  isActive && styles.categoryItemActive,
                ]}
                onPress={() => setCategory(isActive ? "" : cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={20}
                  color={isActive ? "#fff" : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    isActive && styles.categoryLabelActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Açıklama <Text style={{ fontWeight: '400', textTransform: 'none' }}>(opsiyonel)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Sorunu detaylı bir şekilde açıklayın..."
          placeholderTextColor={theme.colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={styles.hint}>
          Aciliyet seviyesi açıklamanıza göre otomatik olarak belirlenir
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          (!image || submitting) && styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={styles.submitText}>Bildir</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  photoRow: {
    flexDirection: "row",
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  photoBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  photoBtnText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  imageWrapper: {
    position: "relative",
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: theme.borderRadius.lg,
  },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  locationCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  locationAddress: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
  },
  locationCoords: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  locationMissing: {
    color: theme.colors.textTertiary,
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryItemActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryLabel: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "500",
  },
  categoryLabelActive: {
    color: "#fff",
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 120,
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 6,
    fontStyle: "italic",
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    marginTop: 4,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
