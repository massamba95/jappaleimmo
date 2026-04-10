export type PropertyType = "APARTMENT" | "HOUSE" | "COMMERCIAL" | "LAND";
export type PropertyStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
export type LeaseStatus = "ACTIVE" | "EXPIRED" | "TERMINATED";
export type PaymentMethod = "CASH" | "TRANSFER" | "WAVE" | "ORANGE_MONEY";
export type PaymentStatus = "PAID" | "LATE" | "PARTIAL" | "PENDING";
export type UserRole = "OWNER" | "MANAGER" | "ACCOUNTANT";

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  title: string;
  type: PropertyType;
  address: string;
  city: string;
  rooms: number | null;
  area: number | null;
  rent_amount: number;
  charges: number;
  status: PropertyStatus;
  photos: string[];
  created_at: string;
}

export interface Tenant {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  cni: string | null;
  created_at: string;
}

export interface Lease {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  deposit: number;
  status: LeaseStatus;
  created_at: string;
  property?: Property;
  tenant?: Tenant;
}

export interface Payment {
  id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  receipt_url: string | null;
  created_at: string;
  lease?: Lease;
}

export interface DashboardStats {
  total_properties: number;
  occupied_properties: number;
  total_tenants: number;
  monthly_revenue: number;
  pending_payments: number;
  occupancy_rate: number;
}
