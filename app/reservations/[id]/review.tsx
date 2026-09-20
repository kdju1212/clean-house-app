import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { submitReview, uploadReviewPhoto } from "../../../src/api/reviews";
import { Screen } from "../../../src/components/Screen";
import { Button } from "../../../src/components/Button";
import { TextField } from "../../../src/components/TextField";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

const MAX_PHOTOS = 5;

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "사진을 첨부하려면 앨범 접근 권한이 필요해요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photoUris.length,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(uri: string) {
    setPhotoUris((prev) => prev.filter((u) => u !== uri));
  }

  async function handleSubmit() {
    if (content.trim().length === 0) {
      Alert.alert("알림", "리뷰 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const publicIds: string[] = [];
      for (const uri of photoUris) {
        const size = new File(uri).size;
        const publicId = await uploadReviewPhoto(id, {
          uri,
          name: "review.jpg",
          type: "image/jpeg",
          size,
        });
        publicIds.push(publicId);
      }

      const { companyId } = await submitReview({
        reservationId: id,
        rating,
        content,
        publicIds,
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

      {photoUris.length < MAX_PHOTOS && (
        <Pressable style={styles.photoButton} onPress={pickPhotos}>
          <Text style={styles.photoButtonText}>
            사진 추가 (선택, 최대 {MAX_PHOTOS}장)
          </Text>
        </Pressable>
      )}
      {photoUris.length > 0 && (
        <View style={styles.previewRow}>
          {photoUris.map((uri) => (
            <View key={uri} style={styles.previewWrap}>
              <Image source={{ uri }} style={styles.preview} />
              <Pressable style={styles.removeButton} onPress={() => removePhoto(uri)} hitSlop={8}>
                <Text style={styles.removeButtonText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

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
  previewRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  previewWrap: { position: "relative" },
  preview: { width: 90, height: 90, borderRadius: radius.md },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: { color: colors.onPrimary, fontSize: fontSize.sm, lineHeight: fontSize.sm },
  submitButton: { marginTop: spacing.xxl },
});
