/**
 * Biteship wrapper — area search, rate check, order booking.
 * SERVER-ONLY.
 */

const BASE_URL = "https://api.biteship.com/v1";

function headers() {
  return {
    Authorization: process.env.BITESHIP_API_KEY ?? "",
    "Content-Type": "application/json",
  };
}

export interface BiteshipArea {
  id: string;
  name: string;
  administrative_division_level_1_name: string;
  administrative_division_level_2_name: string;
  administrative_division_level_3_name: string;
}

export async function searchBiteshipArea(query: string): Promise<BiteshipArea[]> {
  const url = `${BASE_URL}/maps/areas?countries=ID&input=${encodeURIComponent(query)}&type=single`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Biteship area search failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return ((data.areas ?? []) as BiteshipArea[]).slice(0, 10);
}

export interface BiteshipCourierRate {
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  price: number;
  duration: string;
}

export async function getBiteshipRates(req: {
  originAreaId: string;
  destinationAreaId: string;
  items: Array<{ name: string; value: number; weight: number; quantity: number }>;
}): Promise<BiteshipCourierRate[]> {
  const res = await fetch(`${BASE_URL}/rates/couriers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      origin_area_id: req.originAreaId,
      destination_area_id: req.destinationAreaId,
      couriers: "jne,jnt,sicepat,anteraja,ninja,pos",
      items: req.items,
    }),
  });
  if (!res.ok) throw new Error(`Biteship rate check failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.pricing ?? []) as BiteshipCourierRate[];
}

export interface BiteshipOrderResult {
  id: string;
  courier: { tracking_id: string };
}

export async function createBiteshipOrder(req: {
  shipperName: string;
  originAreaId: string;
  destinationContactName: string;
  destinationContactPhone: string;
  destinationAddress: string;
  destinationAreaId: string;
  courierCompany: string;
  courierType: string;
  items: Array<{ name: string; value: number; weight: number; quantity: number }>;
}): Promise<BiteshipOrderResult> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      shipper_contact_name: req.shipperName,
      origin_area_id: req.originAreaId,
      destination_contact_name: req.destinationContactName,
      destination_contact_phone: req.destinationContactPhone,
      destination_address: req.destinationAddress,
      destination_area_id: req.destinationAreaId,
      courier_company: req.courierCompany,
      courier_type: req.courierType,
      delivery_type: "now",
      items: req.items,
    }),
  });
  if (!res.ok) throw new Error(`Biteship order creation failed: ${res.status} ${await res.text()}`);
  return res.json();
}
