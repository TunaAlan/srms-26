import { theme } from "@/constants/theme";
import { UserRole, useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type StaffRole = "admin" | "department";

const ROLE_CONFIG: Record<
  StaffRole,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  admin: {
    label: "Yönetici",
    icon: "settings",
    color: theme.colors.danger,
  },
  department: {
    label: "Departman Çalışanı",
    icon: "people",
    color: theme.colors.info,
  },
};

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<StaffRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const config = ROLE_CONFIG[selectedRole];

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Uyarı", "Lütfen e-posta adresinizi girin.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Uyarı", "Lütfen şifrenizi girin.");
      return;
    }

    const success = await login(email.trim(), password);
    if (success) {
      router.replace("/");
    } else {
      Alert.alert("Hata", "Giriş başarısız. Lütfen tekrar deneyin.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.colors.primaryDark }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.logoCircle}>
              <Ionicons name="lock-closed" size={40} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.headerTitle}>Yetkili Girişi</Text>
            <Text style={styles.headerSubtitle}>
              Bu alan sadece yetkili personel içindir
            </Text>
          </View>

          {/* Role Selector */}
          <View style={styles.roleSelectorContainer}>
            <View style={styles.roleSelector}>
              {(Object.keys(ROLE_CONFIG) as StaffRole[]).map((role) => {
                const rc = ROLE_CONFIG[role];
                const isActive = selectedRole === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleTab,
                      isActive && { backgroundColor: rc.color },
                    ]}
                    onPress={() => setSelectedRole(role)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={rc.icon}
                      size={18}
                      color={isActive ? "#FFFFFF" : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.roleTabText,
                        isActive && styles.roleTabTextActive,
                      ]}
                    >
                      {rc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={[styles.roleBadge, { backgroundColor: config.color + "18" }]}>
                <Ionicons name={config.icon} size={20} color={config.color} />
              </View>
              <View style={styles.formHeaderText}>
                <Text style={styles.formTitle}>{config.label} Girişi</Text>
                <Text style={styles.formSubtitle}>
                  Kurumsal kimlik bilgilerinizi girin
                </Text>
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kurumsal E-posta</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="ad.soyad@ankara.bel.tr"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Şifre</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: config.color }]}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              <Ionicons name={config.icon} size={20} color="#FFFFFF" />
              <Text style={styles.loginButtonText}>
                {config.label} Olarak Giriş Yap
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Ankara Büyükşehir Belediyesi</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primaryDark,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: "absolute",
    top: 52,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "rgba(0,0,0,0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },
  roleSelectorContainer: {
    paddingHorizontal: 24,
    marginTop: -18,
    zIndex: 1,
  },
  roleSelector: {
    flexDirection: "row",
    backgroundColor: theme.colors.white,
    borderRadius: 14,
    padding: 4,
    elevation: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  roleTabTextActive: {
    color: "#FFFFFF",
  },
  formCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  roleBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  formHeaderText: {
    flex: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  formSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  loginButton: {
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footer: {
    textAlign: "center",
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: "auto",
    paddingVertical: 24,
  },
});
