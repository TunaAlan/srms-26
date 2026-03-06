import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const lightTheme = {
  screen: '#F2F4F7',
  card: '#FFFFFF',
  title: '#1C1C1E',
  subtitle: '#8E8E93',
  divider: '#E5E5EA',
  label: '#3A3A3C',
  inputBg: '#F9F9FB',
  inputBorder: '#D1D1D6',
  inputText: '#1C1C1E',
  placeholder: '#AAAAAA',
  imageBorder: '#E5E5EA',
  shadow: '#000',
};

const darkTheme = {
  screen: '#000000',
  card: '#1C1C1E',
  title: '#F2F2F7',
  subtitle: '#8E8E93',
  divider: '#38383A',
  label: '#EBEBF5',
  inputBg: '#2C2C2E',
  inputBorder: '#48484A',
  inputText: '#F2F2F7',
  placeholder: '#636366',
  imageBorder: '#38383A',
  shadow: '#000',
};

function generateRequestId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'SR-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

type SubmitResult = {
  status: 'success' | 'error';
  requestId: string;
  message: string;
} | null;

export default function ProblemReportScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Hata', 'Kamera izni vermeniz gerekiyor!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Hata', 'Lütfen önce bir fotoğraf çekin.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Hata', 'Lütfen sorunu yazın.');
      return;
    }

    const requestId = generateRequestId();
    setSubmitting(true);
    try {
      // Request location permission and get current position
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        Alert.alert('Hata', 'Konum izni vermeniz gerekiyor!');
        setSubmitting(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});

      // Build multipart form data with the actual photo file
      const formData = new FormData();
      formData.append('requestId', requestId);
      formData.append('description', description.trim());
      formData.append('latitude', String(location.coords.latitude));
      formData.append('longitude', String(location.coords.longitude));
      formData.append('photo', {
        uri: imageUri,
        name: `report_${requestId}.jpg`,
        type: 'image/jpeg',
      } as any);

      // TODO: Replace URL with your actual API endpoint
      const API_URL = 'https://your-api.example.com/reports';
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      console.log('Report submitted:', requestId);

      setSubmitResult({
        status: 'success',
        requestId,
        message: 'Başvurunuz alındı.',
      });
      // Reset form fields
      setImageUri(null);
      setDescription('');
    } catch (error) {
      console.error(error);
      setSubmitResult({
        status: 'error',
        requestId,
        message: 'Başvurunuz yapılamadı. Lütfen tekrar deneyin.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Result screen ----------
  if (submitResult) {
    const isSuccess = submitResult.status === 'success';
    return (
      <View style={[styles.screen, { backgroundColor: theme.screen }]}> 
        <View style={styles.resultContainer}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, shadowColor: theme.shadow },
            ]}
          >
            <Text style={styles.resultIcon}>{isSuccess ? '✅' : '❌'}</Text>
            <Text
              style={[
                styles.resultTitle,
                { color: isSuccess ? '#34C759' : '#FF3B30' },
              ]}
            >
              {isSuccess ? 'Başvurunuz Alındı!' : 'Başvurunuz Yapılamadı!'}
            </Text>
            <Text style={[styles.resultMessage, { color: theme.subtitle }]}>
              {submitResult.message}
            </Text>

            <View style={[styles.idBadge, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Text style={[styles.idLabel, { color: theme.label }]}>Talep No</Text>
              <Text style={[styles.idValue, { color: theme.title }]}>
                {submitResult.requestId}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { marginTop: 24 }]}
              onPress={() => setSubmitResult(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Yeni Bildirim</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ---------- Form screen ----------
  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.screen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, shadowColor: theme.shadow },
          ]}
        >
          {/* Title */}
          <Text style={[styles.title, { color: theme.title }]}>
            Sorun Bildir
          </Text>
          <Text style={[styles.subtitle, { color: theme.subtitle }]}>
            Fotoğraf çekin, sorunu açıklayın ve gönderin.
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Camera button */}
          <TouchableOpacity
            style={[styles.cameraButton, imageUri && styles.cameraButtonAlt]}
            onPress={takePhoto}
            activeOpacity={0.8}
          >
            <Text style={styles.cameraButtonText}>
              {imageUri ? '📷  Fotoğrafı Değiştir' : '📷  Kamerayı Aç'}
            </Text>
          </TouchableOpacity>

          {/* Photo preview */}
          {imageUri && (
            <View
              style={[styles.imageWrapper, { borderColor: theme.imageBorder }]}
            >
              <Image source={{ uri: imageUri }} style={styles.image} />
            </View>
          )}

          {/* Description input */}
          <Text style={[styles.label, { color: theme.label }]}>Açıklama</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.inputText,
              },
            ]}
            placeholder="Sorunu Yazın"
            placeholderTextColor={theme.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Gönder</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
  },
  cameraButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  cameraButtonAlt: {
    backgroundColor: '#5856D6',
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: 220,
  },
  input: {
    width: '100%',
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // ---------- Result screen ----------
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  resultIcon: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  idBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  idLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  idValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },
});