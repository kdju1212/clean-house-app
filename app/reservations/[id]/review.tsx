import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getInfoAsync } from "expo-file-system";
import { submitReview, uploadReviewPhoto } from "../../../src/api/reviews";
import { Screen } from "../../../src/components/Screen";
import { Button } from "../../../src/components/Button";
import { TextField } from "../../../src/components/TextField";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

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
    <Screen scroll>
      <Text style={styles.title}>리뷰 작성</Text>

      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)}>
            <Text style={styles.star}>{n <= rating ? "★" : "☆"}</Text>
          </Pressable>
        ))}
      </View>

      <TextField
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

      <Button title="리뷰 등록" onPress={handleSubmit} loading={submitting} style={styles.submitButton} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  stars: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.lg },
  star: { fontSize: 30, color: colors.star },
  photoButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
  },
  photoButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  preview: { marginTop: spacing.md, width: 100, height: 100, borderRadius: radius.md },
  submitButton: { marginTop: spacing.xxl },
});
