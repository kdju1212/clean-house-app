import { apiFetch } from "./client";

export type AdminDashboard = {
  pendingCompanies: number;
  pendingReports: number;
  requestedReservations: number;
  totalUsers: number;
};

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  return apiFetch<AdminDashboard>("/api/mobile/admin/dashboard");
}

export type AdminCompanyStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export type AdminCompanyListItem = {
  id: string;
  name: string;
  status: AdminCompanyStatus;
  isVerified: boolean;
  hasBusinessRegistration: boolean;
  phone: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
  categoryNames: string[];
  regionNames: string[];
};

/** Mirrors the web repo's /admin/companies list. `status` omitted = every
 * status. */
export async function fetchAdminCompanies(status?: AdminCompanyStatus): Promise<AdminCompanyListItem[]> {
  const query = status ? `?status=${status}` : "";
  const { companies } = await apiFetch<{ companies: AdminCompanyListItem[] }>(
    `/api/mobile/admin/companies${query}`
  );
  return companies;
}

export type AdminCompanyDetail = {
  id: string;
  name: string;
  status: AdminCompanyStatus;
  isVerified: boolean;
  businessRegistrationNumber: string | null;
  representativeName: string | null;
  phone: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
  businessHours: string | null;
  isAvailable: boolean;
  introText: string | null;
  suspendedReason: string | null;
  averageRating: number;
  reviewCount: number;
  reservationCounts: {
    requested: number;
    accepted: number;
    completed: number;
    rejectedOrCancelled: number;
    noShow: number;
  };
  services: { categoryName: string; price: number }[];
  regionNames: string[];
};

export async function fetchAdminCompanyDetail(id: string): Promise<AdminCompanyDetail> {
  const { company } = await apiFetch<{ company: AdminCompanyDetail }>(
    `/api/mobile/admin/companies/${id}`
  );
  return company;
}

export type AdminCompanyAction = "approve" | "suspend" | "reactivate" | "verify" | "unverify";

/** Mirrors the web repo's admin/companies Server Actions — one endpoint,
 * `action` picks which. `reason` only matters for "suspend". */
export async function performAdminCompanyAction(
  id: string,
  action: AdminCompanyAction,
  reason?: string
): Promise<void> {
  await apiFetch(`/api/mobile/admin/companies/${id}/action`, {
    method: "POST",
    body: { action, reason },
  });
}

export type AdminReportTargetType = "REVIEW" | "COMPANY";
export type AdminReportStatus = "PENDING" | "RESOLVED";

export type AdminReport = {
  id: string;
  targetType: AdminReportTargetType;
  reporterName: string | null;
  reason: string;
  createdAt: string;
  reviewPreview: {
    companyName: string;
    customerName: string | null;
    rating: number;
    content: string;
    hidden: boolean;
  } | null;
  companyPreview: { id: string; name: string; status: AdminCompanyStatus } | null;
};

export async function fetchAdminReports(status: AdminReportStatus): Promise<AdminReport[]> {
  const { reports } = await apiFetch<{ reports: AdminReport[] }>(
    `/api/mobile/admin/reports?status=${status}`
  );
  return reports;
}

export type AdminReportAction = "hide" | "dismiss" | "suspend";

export async function resolveAdminReport(id: string, action: AdminReportAction): Promise<void> {
  await apiFetch(`/api/mobile/admin/reports/${id}/resolve`, {
    method: "POST",
    body: { action },
  });
}
