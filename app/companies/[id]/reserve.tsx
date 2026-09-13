import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { createReservation } from "../../../src/api/reservations";
import { getSelectedRegion } from "../../../src/storage/auth-storage";

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{params.name}</Text>
      <Text style={styles.subtitle}>예약 신청</Text>

      <Text style={styles.label}>이름</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="이름" />

      <Text style={styles.label}>연락처</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="01012345678"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>서비스 주소</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="주소"
      />
      <TextInput
        style={styles.input}
        value={addressDetail}
        onChangeText={setAddressDetail}
        placeholder="상세 주소 (선택)"
      />

      <Text style={styles.label}>희망 날짜 (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
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

      <Text style={styles.label}>요청사항 (선택)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={requestNote}
        onChangeText={setRequestNote}
        placeholder="전달하고 싶은 내용을 적어주세요"
        multiline
      />

      <Pressable
        style={[styles.submitButton, submitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>예약 신청하기</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { marginTop: 2, fontSize: 13, color: "#737373" },
  label: { marginTop: 16, marginBottom: 6, fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChip: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timeChipSelected: { backgroundColor: "#171717", borderColor: "#171717" },
  timeChipText: { fontSize: 13, color: "#404040" },
  timeChipTextSelected: { color: "#ffffff" },
  submitButton: {
    marginTop: 28,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#171717",
  },
  disabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
});
