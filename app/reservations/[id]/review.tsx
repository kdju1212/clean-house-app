import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getInfoAsync } from "expo-file-system";
import { submitReview, uploadReviewPhoto } from "../../../src/api/reviews";

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "사진을 첨부하려면 앨범 접근 권한이 필요해요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (content.trim().length === 0) {
      Alert.alert("알림", "리뷰 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      let publicId: string | null = null;
      if (photoUri) {
        const info = await getInfoAsync(photoUri);
        const size = info.exists ? (info as { size: number }).size : 0;
        publicId = await uploadReviewPhoto(id, {
          uri: photoUri,
          name: "review.jpg",
          type: "image/jpeg",
          size,
        });
      }

      const { companyId } = await submitReview({
        reservationId: id,
        rating,
        content,
        publicId,
      });
      router.replace(`/categories`);
      void companyId;
    } catch (err) {
      Alert.alert("리뷰 등록 실패", err instanceof Error ? err.message : "리뷰 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>리뷰 작성</Text>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)}>
            <Text style={styles.star}>{n <= rating ? "★" : "☆"}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.textarea}
        value={content}
        onChangeText={setContent}
        placeholder="어떤 점이 좋았는지, 아쉬웠는지 알려주세요."
        multiline
      />

      <Pressable style={styles.photoButton} onPress={pickPhoto}>
        <Text style={styles.photoButtonText}>
          {photoUri ? "사진 변경" : "사진 추가 (선택)"}
        </Text>
      </Pressable>
      {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}

      <Pressable
        style={[styles.submitButton, submitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>리뷰 등록</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56, paddingHorizontal: 20 },
  title: { fontSize: 18, fontWeight: "700" },
  stars: { flexDirection: "row", gap: 4, marginTop: 16 },
  star: { fontSize: 30, color: "#f59e0b" },
  textarea: {
    marginTop: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  photoButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  photoButtonText: { fontSize: 13, fontWeight: "500" },
  preview: { marginTop: 12, width: 100, height: 100, borderRadius: 10 },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#171717",
  },
  disabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
});
