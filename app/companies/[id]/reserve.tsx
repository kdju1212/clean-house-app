import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { createReservation } from "../../../src/api/reservations";
import { fetchAddressByCoords } from "../../../src/api/address";
import { fetchCategoryProfile } from "../../../src/api/category-profile";
import { getSelectedRegion, getStoredUser, updateStoredPhone } from "../../../src/storage/auth-storage";
import { getReservationQuestions } from "../../../src/utils/reservation-questions";
import { Screen } from "../../../src/components/Screen";
import { Button } from "../../../src/components/Button";
import { TextField } from "../../../src/components/TextField";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export default function ReserveScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    categoryId: string;
    categorySlug: string;
    price: string;
  }>();
  const questions = getReservationQuestions(params.categorySlug ?? "");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [desiredTime, setDesiredTime] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [categoryAnswers, setCategoryAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    // Web pre-fills name/phone from the account (Kakao profile name, phone
    // set once in mypage), so it never seems to "ask" for them — the app
    // has no mypage-style edit screen yet, so this is the closest parity:
    // pre-fill from whatever's stored (name from login, phone from a
    // previous reservation), letting the customer just confirm instead of
    // retyping every time.
    getStoredUser().then((user) => {
      if (!user) return;
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
    });
  }, []);

  useEffect(() => {
    if (!params.categorySlug || questions.length === 0) return;
    // Pre-fills 평수/브랜드/형태/대수 etc. from whatever the customer saved
    // via the categories screen's "정보입력" button, so they don't have to
    // retype it here too — same saved CategoryProfile either flow uses.
    fetchCategoryProfile(params.categorySlug)
      .then((saved) => {
        if (saved) setCategoryAnswers(saved);
      })
      .catch(() => {});
  }, [params.categorySlug, questions.length]);

  async function handleLocateAddress() {
    setLocateError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocateError("위치 권한을 허용해주세요.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const { address: found } = await fetchAddressByCoords(
        position.coords.latitude,
        position.coords.longitude
      );
      setAddress(found);
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : "위치로 주소를 찾지 못했어요.");
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit() {
    if (!desiredTime) {
      Alert.alert("알림", "희망 시간을 선택해주세요.");
      return;
    }

    const missing = questions.find((q) => q.required && !categoryAnswers[q.key]?.trim());
    if (missing) {
      Alert.alert("알림", `${missing.label} 항목을 입력해주세요.`);
      return;
    }

    setSubmitting(true);
    try {
      const region = await getSelectedRegion();
      if (!region) {
        router.replace("/region-select");
        return;
      }

      const { reservationId } = await createReservation({
        regionId: region.id,
        companyId: params.id,
        categoryId: params.categoryId,
        name,
        phone,
        address,
        addressDetail: addressDetail || undefined,
        desiredDate,
        desiredTime,
        requestNote: requestNote || undefined,
        categoryAnswers: questions.length > 0 ? categoryAnswers : undefined,
      });

      await updateStoredPhone(phone);

      Alert.alert("예약 신청 완료", "업체 확인 후 예약이 확정돼요.", [
        { text: "확인", onPress: () => router.replace("/categories") },
      ]);
      void reservationId;
    } catch (err) {
      Alert.alert(
        "예약 실패",
        err instanceof Error ? err.message : "예약 신청에 실패했어요."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{params.name}</Text>
      <Text style={styles.subtitle}>예약 신청</Text>

      <TextField label="이름" value={name} onChangeText={setName} placeholder="이름" />

      <TextField
        label="연락처"
        value={phone}
        onChangeText={setPhone}
        placeholder="01012345678"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>집주소</Text>
      <View style={styles.addressRow}>
        <TextInput
          style={styles.addressInput}
          value={address}
          onChangeText={setAddress}
          placeholder="주소"
          placeholderTextColor={colors.textFaint}
        />
        <Pressable style={styles.locateButton} onPress={handleLocateAddress} disabled={locating}>
          <Text style={styles.locateButtonText}>{locating ? "찾는 중..." : "내 위치로 찾기"}</Text>
        </Pressable>
      </View>
      {locateError && <Text style={styles.errorText}>{locateError}</Text>}
      <TextField value={addressDetail} onChangeText={setAddressDetail} placeholder="상세 주소 (선택)" />

      <TextField
        label="희망 날짜 (YYYY-MM-DD)"
        value={desiredDate}
        onChangeText={setDesiredDate}
        placeholder="2026-01-15"
      />

      <Text style={styles.label}>희망 시간</Text>
      <View style={styles.timeGrid}>
        {TIME_SLOTS.map((slot) => (
          <Pressable
            key={slot}
            style={[styles.timeChip, desiredTime === slot && styles.timeChipSelected]}
            onPress={() => setDesiredTime(slot)}
          >
            <Text
              style={[
                styles.timeChipText,
                desiredTime === slot && styles.timeChipTextSelected,
              ]}
            >
              {slot}
            </Text>
          </Pressable>
        ))}
      </View>

      {questions.length > 0 && (
        <View style={styles.questionsBox}>
          <Text style={styles.questionsHint}>
            업체가 정확한 견적을 낼 수 있도록 아래 정보를 알려주세요.
          </Text>
          {questions.map((q) =>
            q.type === "select" ? (
              <View key={q.key}>
                <Text style={styles.label}>{q.label}{q.multiple ? " (복수 선택 가능)" : ""}</Text>
                <View style={styles.timeGrid}>
                  {q.options?.map((option) => {
                    const selected = q.multiple
                      ? (categoryAnswers[q.key] ?? "").split(",").includes(option)
                      : categoryAnswers[q.key] === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.timeChip, selected && styles.timeChipSelected]}
                        onPress={() =>
                          setCategoryAnswers((prev) => {
                            if (!q.multiple) return { ...prev, [q.key]: option };
                            const current = (prev[q.key] ?? "").split(",").filter(Boolean);
                            const next = current.includes(option)
                              ? current.filter((v) => v !== option)
                              : [...current, option];
                            return { ...prev, [q.key]: next.join(",") };
                          })
                        }
                      >
                        <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <TextField
                key={q.key}
                label={q.required ? q.label : `${q.label} (선택)`}
                value={categoryAnswers[q.key] ?? ""}
                onChangeText={(text) =>
                  setCategoryAnswers((prev) => ({ ...prev, [q.key]: text }))
                }
                placeholder={q.placeholder}
                keyboardType={q.type === "number" ? "number-pad" : "default"}
              />
            )
          )}
        </View>
      )}

      <TextField
        label="요청사항 (선택)"
        value={requestNote}
        onChangeText={setRequestNote}
        placeholder="전달하고 싶은 내용을 적어주세요"
        multiline
      />

      <Text style={styles.policyHint}>
        예약 시간에 연락 없이 방문하지 않으면 노쇼로 처리될 수 있어요. 취소하실 경우
        업체에 미리 연락해주세요.
      </Text>

      <Button
        title="예약 신청하기"
        onPress={handleSubmit}
        loading={submitting}
        style={styles.submitButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { marginTop: 2, fontSize: fontSize.base, color: colors.textMuted },
  questionsBox: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  questionsHint: { fontSize: fontSize.xs, color: colors.textFaint },
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.xs + 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  addressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  locateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  locateButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  errorText: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.danger },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  timeChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeChipText: { fontSize: fontSize.base, color: "#404040" },
  timeChipTextSelected: { color: colors.onPrimary },
  policyHint: { marginTop: spacing.lg, fontSize: fontSize.xs, color: colors.textFaint },
  submitButton: { marginTop: spacing.sm },
});
