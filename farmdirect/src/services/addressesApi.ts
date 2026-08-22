import { api } from "./apiClient";

export interface ApiAddress {
  id: string;
  label: string | null;
  fullName: string | null;
  phone: string | null;
  addressLine: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  label?: string;
  fullName?: string;
  phone?: string;
  addressLine: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export async function fetchAddresses(): Promise<ApiAddress[]> {
  const res = await api.get<{ data: ApiAddress[] }>("/addresses");
  return res.data;
}

export async function createAddress(input: AddressInput): Promise<ApiAddress> {
  const res = await api.post<{ address: ApiAddress }>("/addresses", input);
  return res.address;
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<ApiAddress> {
  const res = await api.put<{ address: ApiAddress }>(`/addresses/${id}`, input);
  return res.address;
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/addresses/${id}`);
}
