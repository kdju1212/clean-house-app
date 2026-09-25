import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { createReservation } from "../../../src/api/reservations";
import { fetchAddressByCoords } from "../../../src/api/address";
import { fetchCategoryProfile } from "../../../src/api/category-profile";
import { fetchCompanyDetail, type CompanyDetailService } from "../../../src/api/companies";
import { getSelectedRegion, getStoredUser, updateStoredPhone } from "../../../src/storage/auth-storage";
import {
  getPricingQuantityKey,
  getReservationQuestions,
  PRICING_UNIT_LABEL,
  type ReservationQuestion,
} from "../../../src/utils/reservation-questions";
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
    // The service picked on the detail screen — pre-selected here; the
    // customer can add the company's other services to the same visit.
    categoryId: string;
  }>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [desiredTime, setDesiredTime] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [services, setServices] = useState<CompanyDetailService[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    params.categoryId ? [params.categoryId] : []
  );
  // Quote answers per service, keyed by categoryId.
  const [answersById, setAnswersById] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const isDesiredDateBlocked = blockedDates.includes(desiredDate);

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
    if (!params.id) return;
    fetchCompanyDetail(params.id)
      .then((detail) => {
        setBlockedDates(detail.blockedDates);
        setServices(detail.services);
        const initial = detail.services.find((s) => s.categoryId === params.categoryId);
        if (initial) loadSavedAnswers(initial);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Pre-fills 평수/브랜드/형태/대수 etc. from whatever the customer saved via
  // the categories screen's "정보입력" button, so they don't have to retype
  // it here too — same saved CategoryProfile either flow uses.
  function loadSavedAnswers(service: CompanyDetailService) {
    if (getReservationQuestions(service.categorySlug).length === 0) return;
    fetchCategoryProfile(service.categorySlug)
      .then((saved) => {
        if (!saved) return;
        setAnswersById((prev) =>
          prev[service.categoryId] ? prev : { ...prev, [service.categoryId]: saved }
        );
      })
      .catch(() => {});
  }

  function toggleService(service: CompanyDetailService) {
    if (selectedIds.includes(service.categoryId)) {
      setSelectedIds(selectedIds.filter((id) => id !== service.categoryId));
    } else {
      setSelectedIds([...selectedIds, service.categoryId]);
      loadSavedAnswers(service);
    }
  }

  function setAnswer(categoryId: string, key: string, value: string) {
    setAnswersById((prev) => ({ ...prev, [categoryId]: { ...prev[categoryId], [key]: value } }));
  }

  const selectedServices = services.filter((s) => selectedIds.includes(s.categoryId));

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

    if (isDesiredDateBlocked) {
      Alert.alert("알림", "해당 날짜는 업체 휴무일이에요. 다른 날짜를 선택해주세요.");
      return;
    }

    if (selectedIds.length === 0) {
      Alert.alert("알림", "청소 종류를 하나 이상 선택해주세요.");
      return;
    }

    for (const service of selectedServices) {
      const answers = answersById[service.categoryId] ?? {};
      const missing = getReservationQuestions(service.categorySlug).find(
        (q) => q.required && !answers[q.key]?.trim()
      );
      if (missing) {
        const prefix = selectedServices.length > 1 ? `[${service.categoryName}] ` : "";
        Alert.alert("알림", `${prefix}${missing.label} 항목을 입력해주세요.`);
        return;
      }
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
        items: selectedIds.map((categoryId) => ({
          categoryId,
          categoryAnswers: answersById[categoryId],
        })),
        name,
        phone,
        address,
        addressDetail: addressDetail || undefined,
        desiredDate,
        desiredTime,
        requestNote: requestNote || undefined,
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

      <Text style={styles.label}>
        청소 종류{services.length > 1 ? " (여러 개 선택 가능)" : ""}
      </Text>
      <View style={styles.serviceList}>
        {services.map((service) => {
          const selected = selectedIds.includes(service.categoryId);
          const unitLabel =
            service.pricingUnit === "PER_UNIT"
              ? PRICING_UNIT_LABEL[getPricingQuantityKey(service.categorySlug) ?? ""]
              : null;
          return (
            <Pressable
              key={service.categoryId}
              style={[styles.serviceRow, selected && styles.serviceRowSelected]}
              onPress={() => toggleService(service)}
            >
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.serviceName}>{service.categoryName}</Text>
              <Text style={styles.servicePrice}>
                {unitLabel ? `${unitLabel}당 ` : ""}
                {service.price.toLocaleString()}원~
              </Text>
            </Pressable>
          );
        })}
      </View>

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
      {isDesiredDateBlocked && (
        <Text style={styles.errorText}>
          해당 날짜는 업체 휴무일이에요. 다른 날짜를 선택해주세요.
        </Text>
      )}

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

      {selectedServices.map((service) => (
        <ServiceQuestions
          key={service.categoryId}
          title={selectedServices.length > 1 ? service.categoryName : null}
          questions={getReservationQuestions(service.categorySlug)}
          answers={answersById[service.categoryId] ?? {}}
          onChange={(key, value) => setAnswer(service.categoryId, key, value)}
        />
      ))}

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
        disabled={isDesiredDateBlocked || selectedIds.length === 0}
        style={styles.submitButton}
      />
    </Screen>
  );
}

/** One selected service's quote questions (평수, 에어컨 형태/대수, ...). */
function ServiceQuestions({
  title,
  questions,
  answers,
  onChange,
}: {
  title: string | null;
  questions: ReservationQuestion[];
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <View style={styles.questionsBox}>
      {title && <Text style={styles.questionsTitle}>{title}</Text>}
      <Text style={styles.questionsHint}>
        업체가 정확한 견적을 낼 수 있도록 아래 정보를 알려주세요.
      </Text>
      {questions.map((q) =>
        q.type === "select" ? (
          <View key={q.key}>
            <Text style={styles.label}>{q.label}{q.multiple ? " (복수 선택 가능)" : ""}</Text>
            <View style={styles.timeGrid}>
              {q.options?.map((option) => {
                const current = (answers[q.key] ?? "").split(",").filter(Boolean);
                const selected = q.multiple ? current.includes(option) : answers[q.key] === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.timeChip, selected && styles.timeChipSelected]}
                    onPress={() => {
                      if (!q.multiple) return onChange(q.key, option);
                      const next = current.includes(option)
                        ? current.filter((v) => v !== option)
                        : [...current, option];
                      onChange(q.key, next.join(","));
                    }}
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
            value={answers[q.key] ?? ""}
            onChangeText={(text) => onChange(q.key, text)}
            placeholder={q.placeholder}
            keyboardType={q.type === "number" ? "number-pad" : "default"}
          />
        )
      )}
    </View>
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
  questionsTitle: {
    marginBottom: spacing.xs,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  questionsHint: { fontSize: fontSize.xs, color: colors.textFaint },
  serviceList: { gap: spacing.sm },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  serviceRowSelected: { borderColor: colors.text, backgroundColor: colors.surfaceMuted },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: colors.text, borderColor: colors.text },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: fontWeight.bold, lineHeight: 16 },
  serviceName: { flex: 1, fontSize: fontSize.md, color: colors.text },
  servicePrice: { fontSize: fontSize.base, color: colors.textMuted },
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
