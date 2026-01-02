
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
    console.error("Pathao Config is missing.");
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

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Pathao API Request Failed (${endpoint}):`, error);
    return { error: true, message: error };
  }
}

/**
 * Robustly extract data array from Pathao response.
 * Handles cases where data might be nested in multiple 'data' keys 
 * or returned as a JSON string within the object.
 */
const extractPathaoData = (res: any): any[] => {
  if (!res) return [];

  // If the proxy returns an error, log it and return empty
  if (res.error || (res.data && res.data.error)) {
    console.warn("Pathao API returned an error:", res);
    return [];
  }

  let current = res;

  // Sometimes the entire response is inside a 'data' key from the proxy
  if (current.data !== undefined) {
    current = current.data;
  }

  // Handle double stringification (if PHP proxy returns a JSON string instead of object)
  if (typeof current === 'string') {
    try {
      current = JSON.parse(current);
    } catch (e) {
      return [];
    }
  }

  // Drill down through 'data' keys until we find an array or run out of options
  // Pathao typically uses { data: { data: [ ... ] } }
  let safetyCounter = 0;
  while (current && !Array.isArray(current) && current.data && safetyCounter < 3) {
    current = current.data;
    if (typeof current === 'string') {
      try {
        current = JSON.parse(current);
      } catch (e) {
        break;
      }
    }
    safetyCounter++;
  }

  if (Array.isArray(current)) {
    return current;
  }

  // Last ditch effort: if it's an object with an array property, return that array
  if (current && typeof current === 'object') {
    const arrays = Object.values(current).filter(val => Array.isArray(val));
    if (arrays.length > 0) return arrays[0] as any[];
  }

  return [];
};

export const getPathaoCities = async () => {
  const res = await pathaoRequest('aladdin/api/v1/cities', 'GET');
  const data = extractPathaoData(res);
  console.log("Pathao Cities Found:", data.length);
  return data;
};

export const getPathaoZones = async (cityId: number) => {
  const res = await pathaoRequest(`aladdin/api/v1/cities/${cityId}/zone-list`, 'GET');
  const data = extractPathaoData(res);
  console.log(`Pathao Zones for City ${cityId}:`, data.length);
  return data;
};

export const getPathaoAreas = async (zoneId: number) => {
  const res = await pathaoRequest(`aladdin/api/v1/zones/${zoneId}/area-list`, 'GET');
  const data = extractPathaoData(res);
  console.log(`Pathao Areas for Zone ${zoneId}:`, data.length);
  return data;
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
