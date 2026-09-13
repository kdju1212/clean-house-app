import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { createReservation } from "../../../src/api/reservations";
import { getSelectedRegion } from "../../../src/storage/auth-storage";
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
    price: string;
  }>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [desiredTime, setDesiredTime] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!desiredTime) {
      Alert.alert("알림", "희망 시간을 선택해주세요.");
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
      });

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

      <TextField label="서비스 주소" value={address} onChangeText={setAddress} placeholder="주소" />
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

      <TextField
        label="요청사항 (선택)"
        value={requestNote}
        onChangeText={setRequestNote}
        placeholder="전달하고 싶은 내용을 적어주세요"
        multiline
      />

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
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.xs + 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
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
  submitButton: { marginTop: spacing.xxl + spacing.xs },
});
