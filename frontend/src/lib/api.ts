import type {
  ExecutiveData,
  SalesRow,
  InventoryRow,
  ProcurementRow,
  LogisticsRow,
  ReturnsRow,
  PaginatedResult,
  SalesOrderRow,
  InventoryRecordRow,
  ProcurementOrderRow,
  ShipmentRow,
  ReturnRecordRow,
} from "@/types/analytics";

/**
 * Base URL of the FastAPI backend.
 * Falls back to the local FastAPI dev server when the env var is unset.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetches the executive dashboard summary from the FastAPI backend.
 * Always hits the live API — never returns mock or hardcoded data.
 */
export async function fetchExecutiveData(): Promise<ExecutiveData> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/executive`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Could not reach the FastAPI backend. Check that it is running."
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `The API responded with an error (status ${response.status}).`
    );
  }

  const data = (await response.json()) as ExecutiveData;
  return data;
}

/** Generic GET helper for the list-shaped analytics endpoints. */
async function fetchList<T>(path: string): Promise<T[]> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Could not reach the FastAPI backend. Check that it is running."
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `The API responded with an error (status ${response.status}).`
    );
  }

  return (await response.json()) as T[];
}

export const fetchSalesData = () => fetchList<SalesRow>("/api/sales");
export const fetchInventoryData = () =>
  fetchList<InventoryRow>("/api/inventory");
export const fetchProcurementData = () =>
  fetchList<ProcurementRow>("/api/procurement");
export const fetchLogisticsData = () =>
  fetchList<LogisticsRow>("/api/logistics");
export const fetchReturnsData = () => fetchList<ReturnsRow>("/api/returns");

export interface PaginatedParams {
  page: number;
  pageSize: number;
  search?: string;
}

/** Generic GET helper for the paginated, searchable drill-down endpoints. */
async function fetchPaginated<T>(
  path: string,
  { page, pageSize, search }: PaginatedParams
): Promise<PaginatedResult<T>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (search) params.set("search", search);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Could not reach the FastAPI backend. Check that it is running."
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `The API responded with an error (status ${response.status}).`
    );
  }

  return (await response.json()) as PaginatedResult<T>;
}

export const fetchSalesOrders = (params: PaginatedParams) =>
  fetchPaginated<SalesOrderRow>("/api/sales/orders", params);
export const fetchInventoryRecords = (params: PaginatedParams) =>
  fetchPaginated<InventoryRecordRow>("/api/inventory/records", params);
export const fetchProcurementOrders = (params: PaginatedParams) =>
  fetchPaginated<ProcurementOrderRow>("/api/procurement/orders", params);
export const fetchLogisticsShipments = (params: PaginatedParams) =>
  fetchPaginated<ShipmentRow>("/api/logistics/shipments", params);
export const fetchReturnsRecords = (params: PaginatedParams) =>
  fetchPaginated<ReturnRecordRow>("/api/returns/records", params);

export interface UploadResult {
  table: string;
  rows_loaded: number;
  message: string;
}

/** Uploads a CSV to replace the given raw table's data in Postgres. */
export async function uploadTableCsv(
  table: string,
  file: File
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/upload/${table}`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Could not reach the FastAPI backend. Check that it is running."
    );
  }

  if (!response.ok) {
    let detail = `The API responded with an error (status ${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // response body wasn't JSON; fall back to the generic message
    }
    throw new ApiError(detail);
  }

  return (await response.json()) as UploadResult;
}
