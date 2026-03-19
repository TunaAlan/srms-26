import { theme } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
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

const SECRET_TAP_COUNT = 5;
const SECRET_TAP_WINDOW = 3000; // ms

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Secret gesture: tap logo 5 times within 3 seconds
  const tapCountRef = useRef(0);
  const firstTapTimeRef = useRef(0);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - firstTapTimeRef.current > SECRET_TAP_WINDOW) {
      tapCountRef.current = 0;
    }
    if (tapCountRef.current === 0) {
      firstTapTimeRef.current = now;
    }
    tapCountRef.current += 1;
    if (tapCountRef.current >= SECRET_TAP_COUNT) {
      tapCountRef.current = 0;
      router.push("/admin-login" as any);
    }
  };

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
          {/* Header — tap logo 5x quickly to access staff login */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleLogoTap}
              activeOpacity={1}
            >
              <View style={styles.logoCircle}>
                <Ionicons
                  name="shield-checkmark"
                  size={48}
                  color={theme.colors.primary}
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>ABB</Text>
            <Text style={styles.headerSubtitle}>
              Altyapı Bildirim Sistemi
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Giriş Yap</Text>
            <Text style={styles.formSubtitle}>
              Devam etmek için hesabınıza giriş yapın
            </Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-posta</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="ornek@ankara.bel.tr"
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

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>Şifremi Unuttum</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerLinkContainer}>
              <Text style={styles.registerLinkText}>Hesabınız yok mu? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.registerLink}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: theme.colors.primary,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  formCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: 24,
    marginTop: -20,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  formSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
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
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  registerLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  registerLinkText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  footer: {
    textAlign: "center",
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: "auto",
    paddingVertical: 24,
  },
});
