// app/map.web.tsx
import { View, Text } from 'react-native';

export default function MapWebFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Harita özelliği web sürümünde desteklenmiyor.</Text>
    </View>
  );
}