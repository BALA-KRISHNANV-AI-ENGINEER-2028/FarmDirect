import {
  deleteAddress as deleteAddressModel,
  insertAddress,
  listAddressesByCustomerId,
  updateAddress as updateAddressModel,
  type CreateAddressInput,
  type UpdateAddressInput,
} from "../models/address.model";

function toAddressDto(row: Awaited<ReturnType<typeof listAddressesByCustomerId>>[number]) {
  return {
    id: row.id,
    label: row.label,
    fullName: row.full_name,
    phone: row.phone,
    addressLine: row.address_line,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    isDefault: row.is_default,
  };
}

export async function listMyAddresses(customerId: string) {
  const rows = await listAddressesByCustomerId(customerId);
  return rows.map(toAddressDto);
}

export async function createAddress(customerId: string, input: Omit<CreateAddressInput, "customerId">) {
  const created = await insertAddress({ ...input, customerId });
  return toAddressDto(created);
}

export async function updateMyAddress(customerId: string, addressId: string, input: UpdateAddressInput) {
  const updated = await updateAddressModel(addressId, customerId, input);
  return updated ? toAddressDto(updated) : null;
}

export async function deleteMyAddress(addressId: string) {
  await deleteAddressModel(addressId);
}
