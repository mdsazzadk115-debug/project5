
import { PathaoConfig, Order } from "../types";

const SETTINGS_URL = "api/settings.php";
const PROXY_URL = "api/pathao_proxy.php"; // Assuming a proxy script for Pathao exists or is needed for CORS

const fetchSetting = async (key: string) => {
  try {
    const res = await fetch(`${SETTINGS_URL}?key=${key}`);
    if (!res.ok) return null;
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  } catch (e) {
    return null;
  }
};

const saveSetting = async (key: string, value: any) => {
  try {
    await fetch(SETTINGS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: JSON.stringify(value) })
    });
  } catch (e) {
    console.error("Error saving Pathao setting:", e);
  }
};

export const getPathaoConfig = async (): Promise<PathaoConfig | null> => {
  const config = await fetchSetting('pathao_config');
  return config || {
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    storeId: '',
    isSandbox: true
  };
};

export const savePathaoConfig = async (config: PathaoConfig) => {
  await saveSetting('pathao_config', config);
};

// Generic fetcher that goes through our PHP proxy to handle OAuth and Pathao API
async function pathaoRequest(endpoint: string, method: string = 'GET', body: any = null) {
  const config = await getPathaoConfig();
  if (!config || !config.clientId) throw new Error("Pathao not configured");

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config,
      endpoint,
      method,
      data: body
    })
  });

  return await response.json();
}

export const getPathaoCities = async () => {
  const res = await pathaoRequest('aladdin/api/v1/cities', 'GET');
  return res.data?.data || [];
};

export const getPathaoZones = async (cityId: number) => {
  const res = await pathaoRequest(`aladdin/api/v1/cities/${cityId}/zone-list`, 'GET');
  return res.data?.data || [];
};

export const getPathaoAreas = async (zoneId: number) => {
  const res = await pathaoRequest(`aladdin/api/v1/zones/${zoneId}/area-list`, 'GET');
  return res.data?.data || [];
};

export const createPathaoOrder = async (order: Order, location: { city: number, zone: number, area: number }) => {
  const config = await getPathaoConfig();
  if (!config) throw new Error("Pathao config missing");

  const payload = {
    store_id: parseInt(config.storeId),
    merchant_order_id: order.id,
    recipient_name: order.customer.name,
    recipient_phone: order.customer.phone,
    recipient_address: order.address,
    recipient_city: location.city,
    recipient_zone: location.zone,
    recipient_area: location.area,
    delivery_type: 48, // Standard
    item_type: 2, // Parcel
    special_instruction: "Fragile",
    item_quantity: order.products.reduce((acc, p) => acc + p.qty, 0),
    item_weight: 0.5,
    amount_to_collect: order.total,
    item_description: order.products.map(p => p.name).join(', ')
  };

  const res = await pathaoRequest('aladdin/api/v1/orders', 'POST', payload);
  return res;
};
