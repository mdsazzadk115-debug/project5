
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
    return { error: true, message: "Pathao is not configured in settings." };
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
    
    // Pathao status codes can be 200 (Success), 201 (Created), 202 (Accepted)
    const successCodes = [200, 201, 202, "200", "201", "202"];
    
    if (!successCodes.includes(result.code)) {
      // Pathao often returns specific validation errors in 'errors' object
      let errorMessage = result.message || "API Connection Error";
      
      if (result.errors) {
        if (typeof result.errors === 'object') {
          const firstErrorKey = Object.keys(result.errors)[0];
          const firstErrorVal = result.errors[firstErrorKey];
          errorMessage = `${firstErrorKey}: ${Array.isArray(firstErrorVal) ? firstErrorVal[0] : firstErrorVal}`;
        } else {
          errorMessage = JSON.stringify(result.errors);
        }
      }
      
      return { 
        error: true, 
        message: errorMessage,
        code: result.code 
      };
    }

    return result;
  } catch (error: any) {
    console.error(`Pathao API Request Failed (${endpoint}):`, error);
    return { error: true, message: "Network error. Please check your hosting/proxy script." };
  }
}

export const getPathaoOrderStatus = async (trackingCode: string) => {
  return await pathaoRequest(`aladdin/api/v1/orders/${trackingCode}/info`, 'GET');
};

export const checkPathaoConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await pathaoRequest('aladdin/api/v1/stores', 'GET');
    if (res.error) {
      return { success: false, message: res.message };
    }
    if (res.code === 200 || res.code === "200") {
      return { success: true, message: "Successfully connected to Pathao API" };
    }
    return { success: false, message: res.message || "Failed to fetch stores." };
  } catch (e: any) {
    return { success: false, message: e.message || "Unknown connection error" };
  }
};

export const getPathaoBalance = async () => {
  const diagnostic = await checkPathaoConnection();
  return diagnostic.success ? 1 : 0;
};

const extractPathaoData = (res: any): any[] => {
  if (!res || res.error) return [];
  if (res.data && res.data.data && Array.isArray(res.data.data)) return res.data.data;
  if (res.data && Array.isArray(res.data)) return res.data;
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

  // Pathao strictly requires 11 digit phone number starting with 01
  let cleanPhone = order.customer.phone.trim().replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('8801')) {
    cleanPhone = cleanPhone.substring(2);
  } else if (cleanPhone.startsWith('801')) {
    cleanPhone = '0' + cleanPhone.substring(1);
  }
  
  // Ensure it starts with 0
  if (!cleanPhone.startsWith('0')) {
      cleanPhone = '0' + cleanPhone;
  }

  const payload = {
    store_id: parseInt(config.storeId),
    merchant_order_id: order.id,
    recipient_name: order.customer.name.substring(0, 50),
    recipient_phone: cleanPhone,
    recipient_address: order.address.substring(0, 200),
    recipient_city: location.city,
    recipient_zone: location.zone,
    recipient_area: location.area,
    delivery_type: 48, 
    item_type: 2, 
    special_instruction: "Handle with care",
    item_quantity: Math.max(1, order.products.reduce((acc, p) => acc + p.qty, 0)),
    item_weight: 0.5,
    amount_to_collect: Math.round(order.total),
    item_description: order.products.map(p => p.name).join(', ').substring(0, 200)
  };

  return await pathaoRequest('aladdin/api/v1/orders', 'POST', payload);
};
