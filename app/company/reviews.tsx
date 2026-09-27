import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  fetchCompanyReviews,
  replyToReview,
  deleteReviewReply,
  type CompanyOwnReview,
} from "../../src/api/company-reviews";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingView } from "../../src/components/LoadingView";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";

/** Mirrors the web repo's /company/reviews management page — reply to (or
 * edit/delete a reply on) each of this company's reviews. */
export default function CompanyReviewsScreen() {
  const [reviews, setReviews] = useState<CompanyOwnReview[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => fetchCompanyReviews().then(setReviews), []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <Text style={styles.title}>리뷰 관리</Text>
      <Text style={styles.subtitle}>
        고객이 남긴 리뷰에 답글을 달 수 있어요. 답글은 고객에게도 공개돼요.
      </Text>

      {!reviews ? (
        <LoadingView />
      ) : reviews.length === 0 ? (
        <EmptyState text="아직 작성된 리뷰가 없어요." />
      ) : (
        <View style={styles.list}>
          {reviews.map((review) => (
            <ReviewRow key={review.id} review={review} onChanged={load} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function ReviewRow({ review, onChanged }: { review: CompanyOwnReview; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.ownerReply ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (draft.trim().length === 0) {
      Alert.alert("알림", "답글 내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await replyToReview(review.id, draft.trim());
      setEditing(false);
      onChanged();
    } catch (err) {
      Alert.alert("등록 실패", err instanceof Error ? err.message : "답글 등록에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteReviewReply(review.id);
      onChanged();
    } catch (err) {
      Alert.alert("삭제 실패", err instanceof Error ? err.message : "삭제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.stars}>
          {"★".repeat(review.rating)}
          {"☆".repeat(5 - review.rating)}
        </Text>
        <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString("ko-KR")}</Text>
      </View>
      <Text style={styles.author}>{review.customerName ?? "익명"}</Text>
      <Text style={styles.content}>{review.content}</Text>
      {review.hidden && <Text style={styles.hiddenNote}>숨김 처리된 리뷰예요.</Text>}

      {review.ownerReply && !editing ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>사장님 답글</Text>
          <Text style={styles.replyText}>{review.ownerReply}</Text>
          <View style={styles.replyActionsRow}>
            <Pressable onPress={() => setEditing(true)}>
              <Text style={styles.linkText}>수정</Text>
            </Pressable>
            <Pressable onPress={handleDelete} disabled={saving}>
              <Text style={styles.linkText}>{saving ? "삭제 중..." : "삭제"}</Text>
            </Pressable>
          </View>
        </View>
      ) : editing ? (
        <View style={styles.replyForm}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="고객님께 전할 답글을 입력해주세요"
            placeholderTextColor={colors.textFaint}
            multiline
            style={styles.replyInput}
          />
          <View style={styles.replyActionsRow}>
            <Button title="등록" size="sm" loading={saving} onPress={handleSave} />
            <Pressable onPress={() => setEditing(false)} style={styles.cancelButton}>
              <Text style={styles.linkText}>취소</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.replyPromptText}>답글 달기</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  list: { marginTop: spacing.lg, gap: spacing.sm + 2 },
  card: {},
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stars: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.star },
  date: { fontSize: fontSize.xs, color: colors.textFaint },
  author: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  content: { marginTop: spacing.xs, fontSize: fontSize.base, color: colors.text },
  hiddenNote: { marginTop: spacing.xs, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.danger },
  replyPromptText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  replyBox: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.infoBg,
    padding: spacing.sm + 2,
  },
  replyLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.info },
  replyText: { marginTop: 2, fontSize: fontSize.sm, color: colors.text },
  replyForm: { marginTop: spacing.sm },
  replyInput: {
    minHeight: 70,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  replyActionsRow: { marginTop: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.md },
  linkText: { fontSize: fontSize.xs, color: colors.textFaint, textDecorationLine: "underline" },
  cancelButton: { paddingVertical: spacing.xs },
});
