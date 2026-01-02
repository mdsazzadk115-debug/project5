import { PathaoConfig, Order } from "../types";

const SETTINGS_URL = "api/settings.php";
const PROXY_URL = "api/pathao_proxy.php";

const fetchSetting = async (key: string) => {
  try {
    const res = await fetch(`${SETTINGS_URL}?key=${key}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text === "null") return null;
    try {
      const data = JSON.parse(text);
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
      console.error(`Error parsing setting for key ${key}:`, e);
      return null;
    }
  } catch (e) {
    console.error(`Error fetching setting for key ${key}:`, e);
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

async function pathaoRequest(endpoint: string, method: string = 'GET', body: any = null) {
  const config = await getPathaoConfig();
  if (!config || !config.clientId) {
    throw new Error("Pathao not configured");
  }

  try {
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
  } catch (error) {
    console.error(`Pathao API Request Failed (${endpoint}):`, error);
    return { error: true, message: "Network error or invalid response from proxy" };
  }
}

export const getPathaoOrderStatus = async (trackingCode: string) => {
  return await pathaoRequest(`aladdin/api/v1/orders/${trackingCode}`, 'GET');
};

export const getPathaoBalance = async () => {
  // Pathao doesn't have a direct "balance" API like Steadfast in their merchant API usually,
  // but we can check store connectivity or fetch a summary.
  // For now we'll return a static "API Active" or placeholder.
  const res = await pathaoRequest('aladdin/api/v1/stores', 'GET');
  return res.code === 200 ? 1 : 0; // Return 1 if store is accessible
};

/**
 * According to Pathao Documentation:
 * List endpoints return: { data: { data: [ ... ] }, code: 200, ... }
 */
const extractPathaoData = (res: any): any[] => {
  if (!res) return [];

  // Check for errors from proxy or API
  if (res.error || (res.code && res.code !== 200 && res.code !== "200")) {
    console.warn("Pathao API Error:", res.message || res);
    return [];
  }

  // Pathao returns data in nested layers: res.data.data
  if (res.data && res.data.data && Array.isArray(res.data.data)) {
    return res.data.data;
  }

  // For some endpoints it might just be res.data
  if (res.data && Array.isArray(res.data)) {
    return res.data;
  }

  return [];
};

export const getPathaoCities = async () => {
  const res = await pathaoRequest('aladdin/api/v1/city-list', 'GET');
  return extractPathaoData(res);
};

export const getPathaoZones = async (cityId: number) => {
  const res = await pathaoRequest(`aladdin/api/v1/cities/${cityId}/zone-list`, 'GET');
  return extractPathaoData(res);
};

export const getPathaoAreas = async (zoneId: number) => {
  const res = await pathaoRequest(`aladdin/api/v1/zones/${zoneId}/area-list`, 'GET');
  return extractPathaoData(res);
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
    delivery_type: 48, // 48 for Normal Delivery
    item_type: 2, // 2 for Parcel
    special_instruction: "Handle with care",
    item_quantity: order.products.reduce((acc, p) => acc + p.qty, 0) || 1,
    item_weight: "0.5",
    amount_to_collect: order.total,
    item_description: order.products.map(p => p.name).join(', ')
  };

  const res = await pathaoRequest('aladdin/api/v1/orders', 'POST', payload);
  return res;
};