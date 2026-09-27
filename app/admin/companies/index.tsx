import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  fetchAdminCompanies,
  type AdminCompanyListItem,
  type AdminCompanyStatus,
} from "../../../src/api/admin";
import { Screen } from "../../../src/components/Screen";
import { Card } from "../../../src/components/Card";
import { Badge } from "../../../src/components/Badge";
import { EmptyState } from "../../../src/components/EmptyState";
import { colors, fontSize, fontWeight, spacing } from "../../../src/theme";

const STATUS_FILTERS: { value: AdminCompanyStatus | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: "PENDING", label: "승인 대기" },
  { value: "ACTIVE", label: "활성" },
  { value: "SUSPENDED", label: "정지" },
];

/** Mirrors the web repo's /admin/companies list. Reached from the 관리자
 * dashboard's stat cards (app/(tabs)/reservations.tsx), optionally with an
 * initial ?status filter already applied. */
export default function AdminCompaniesScreen() {
  const { status: initialStatus } = useLocalSearchParams<{ status?: string }>();
  const [activeStatus, setActiveStatus] = useState<AdminCompanyStatus | "">(
    (initialStatus as AdminCompanyStatus) ?? ""
  );
  const [companies, setCompanies] = useState<AdminCompanyListItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return fetchAdminCompanies(activeStatus || undefined).then(setCompanies);
  }, [activeStatus]);

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
    <Screen>
      <Text style={styles.title}>업체 관리</Text>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.filterChip, activeStatus === f.value && styles.filterChipActive]}
            onPress={() => setActiveStatus(f.value)}
          >
            <Text
              style={[styles.filterChipText, activeStatus === f.value && styles.filterChipTextActive]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={companies ?? []}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={companies ? <EmptyState text="해당하는 업체가 없어요." /> : null}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => router.push(`/admin/companies/${item.id}`)}>
            <View style={styles.cardHeader}>
              <Text style={styles.companyName} numberOfLines={1}>
                {item.name}
              </Text>
              <Badge
                label={STATUS_LABEL[item.status]}
                tone={item.status === "PENDING" ? "warning" : "neutral"}
              />
            </View>
            <Text style={styles.meta}>
              등록일 {new Date(item.createdAt).toLocaleDateString("ko-KR")}
            </Text>
            <Text style={styles.meta}>
              소유자 {item.ownerName ?? "-"} ({item.ownerEmail ?? "이메일 없음"})
            </Text>
            {item.categoryNames.length > 0 && (
              <Text style={styles.meta} numberOfLines={1}>
                서비스 {item.categoryNames.join(", ")}
              </Text>
            )}
          </Card>
        )}
      />
    </Screen>
  );
}

const STATUS_LABEL: Record<AdminCompanyStatus, string> = {
  PENDING: "승인 대기",
  ACTIVE: "활성",
  SUSPENDED: "정지",
};

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  filterRow: { marginTop: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: "#525252" },
  filterChipTextActive: { color: colors.onPrimary },
  list: { marginTop: spacing.lg },
  card: { marginBottom: spacing.sm + 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  companyName: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  meta: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
});
