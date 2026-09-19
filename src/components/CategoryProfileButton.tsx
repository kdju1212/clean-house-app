import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getReservationQuestions } from "../utils/reservation-questions";
import { saveCategoryProfile } from "../api/category-profile";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

const TIP_SEEN_KEY = "categoryProfileTipSeen";

/**
 * "정보입력" button next to a category's title — mirrors the web repo's
 * CategoryProfileButton. Opens a form for that category's questions
 * (평수, 브랜드/형태/대수, ...) and saves it as the customer's reusable
 * CategoryProfile, which the listing then uses to show a PER_UNIT-priced
 * company's estimated price instead of just its per-평/대 rate. A category
 * with no questions renders nothing.
 */
export function CategoryProfileButton({
  categorySlug,
  initialAnswers,
  onSaved,
}: {
  categorySlug: string;
  initialAnswers: Record<string, string> | null;
  onSaved: () => void;
}) {
  const questions = getReservationQuestions(categorySlug);
  const [open, setOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (questions.length === 0) return;
    AsyncStorage.getItem(TIP_SEEN_KEY).then((seen) => {
      if (!seen) setShowTip(true);
    });
  }, [questions.length]);

  if (questions.length === 0) return null;

  function dismissTip() {
    setShowTip(false);
    AsyncStorage.setItem(TIP_SEEN_KEY, "1").catch(() => {});
  }

  function handleOpen() {
    // Read initialAnswers fresh at the moment the sheet opens rather than
    // syncing it into state on every prop change (categoryProfile arrives
    // asynchronously after switching category tabs, well before the
    // customer would notice and tap this button) — avoids needing an
    // effect just to mirror a prop into state.
    setValues(initialAnswers ?? {});
    dismissTip();
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveCategoryProfile(categorySlug, values);
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Pressable onPress={handleOpen} style={styles.button}>
        <Text style={styles.buttonText}>{initialAnswers ? "내 정보 수정" : "정보입력"}</Text>
      </Pressable>

      {showTip && (
        <View style={styles.tip}>
          <Text style={styles.tipText}>
            여기에 정보를 입력하면{"\n"}정확한 예상 금액을 볼 수 있어요
          </Text>
          <Pressable onPress={dismissTip} style={styles.tipClose} hitSlop={8}>
            <Text style={styles.tipCloseText}>×</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>내 정보 입력</Text>
            <Text style={styles.sheetHint}>
              업체 목록에서 이 정보를 기준으로 예상 가격을 보여드려요.
            </Text>

            {questions.map((q) =>
              q.type === "select" ? (
                <View key={q.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{q.label}</Text>
                  <View style={styles.optionsRow}>
                    {q.options?.map((option) => {
                      const active = values[q.key] === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => setValues((prev) => ({ ...prev, [q.key]: option }))}
                          style={[styles.optionChip, active && styles.optionChipActive]}
                        >
                          <Text
                            style={[styles.optionChipText, active && styles.optionChipTextActive]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View key={q.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{q.label}</Text>
                  <TextInput
                    value={values[q.key] ?? ""}
                    onChangeText={(text) => setValues((prev) => ({ ...prev, [q.key]: text }))}
                    placeholder={q.placeholder}
                    placeholderTextColor={colors.textFaint}
                    keyboardType={q.type === "number" ? "number-pad" : "default"}
                    style={styles.input}
                  />
                </View>
              )
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.actions}>
              <Pressable
                onPress={() => setOpen(false)}
                style={[styles.actionButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[styles.actionButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>{saving ? "저장 중..." : "저장"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 1,
  },
  buttonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  tip: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: spacing.sm,
    width: 190,
    borderRadius: radius.md,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    zIndex: 10,
  },
  tipText: { fontSize: fontSize.xs, color: colors.onPrimary, lineHeight: 16 },
  tipClose: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#404040",
    alignItems: "center",
    justifyContent: "center",
  },
  tipCloseText: { fontSize: 10, color: colors.onPrimary, lineHeight: 12 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  sheetTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  sheetHint: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.textFaint },
  field: { marginTop: spacing.md },
  fieldLabel: {
    marginBottom: spacing.xs + 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  optionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionChipText: { fontSize: fontSize.base, color: colors.text },
  optionChipTextActive: { color: colors.onPrimary },
  errorText: { marginTop: spacing.sm, fontSize: fontSize.xs, color: colors.danger },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  actionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  cancelButton: { borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  saveButton: { backgroundColor: colors.primary },
  saveButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.onPrimary },
});
