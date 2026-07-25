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
  price: number; // Final price (includes insurance/COD if enabled) - used for shippingCost
  shipping_fee?: number; // Base shipping fee before add-ons
  duration: string; // e.g. "2 - 3 days"
  available_for_cash_on_delivery?: boolean;
  available_for_insurance?: boolean;
}

export interface BiteshipRateItem {
  name: string;
  value: number;
  weight: number; // in grams
  quantity: number;
  category?: string; // e.g. "fashion", "food_and_drink", "others"
  length?: number; // in cm (volumetric weight)
  width?: number; // in cm
  height?: number; // in cm
}

export interface BiteshipRateRequest {
  // Mode 1: By Area ID (Recommended & default)
  originAreaId?: string;
  destinationAreaId?: string;
  // Mode 2: By Postal Code
  originPostalCode?: number;
  destinationPostalCode?: number;
  // Mode 3: By Coordinates (Required for instant couriers e.g. Grab/Gojek)
  originLatitude?: number;
  originLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
  // Couriers list string
  couriers?: string;
  items: BiteshipRateItem[];
}

export async function getBiteshipRates(req: BiteshipRateRequest): Promise<BiteshipCourierRate[]> {
  const body: Record<string, any> = {
    couriers: req.couriers ?? "jne,jnt,sicepat,anteraja,ninja,pos",
    items: req.items.map((item) => ({
      name: item.name,
      value: item.value,
      weight: item.weight,
      quantity: item.quantity,
      ...(item.category ? { category: item.category } : {}),
      ...(item.length ? { length: item.length } : {}),
      ...(item.width ? { width: item.width } : {}),
      ...(item.height ? { height: item.height } : {}),
    })),
  };

  // Location params (Mode 1, 2, 3, or Mix)
  if (req.originAreaId) body.origin_area_id = req.originAreaId;
  if (req.destinationAreaId) body.destination_area_id = req.destinationAreaId;
  if (req.originPostalCode) body.origin_postal_code = req.originPostalCode;
  if (req.destinationPostalCode) body.destination_postal_code = req.destinationPostalCode;
  if (req.originLatitude) body.origin_latitude = req.originLatitude;
  if (req.originLongitude) body.origin_longitude = req.originLongitude;
  if (req.destinationLatitude) body.destination_latitude = req.destinationLatitude;
  if (req.destinationLongitude) body.destination_longitude = req.destinationLongitude;

  const res = await fetch(`${BASE_URL}/rates/couriers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
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
  originContactName: string;
  originContactPhone: string;
  originAddress: string;
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
      origin_contact_name: req.originContactName,
      origin_contact_phone: req.originContactPhone,
      origin_address: req.originAddress,
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
