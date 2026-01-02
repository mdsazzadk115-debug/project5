import { CourierConfig, PathaoConfig, Order } from "../types";

const PROXY_URL = "api/courier.php";
const SETTINGS_URL = "api/settings.php";
const TRACKING_URL = "api/local_tracking.php";

const fetchSetting = async (key: string) => {
  try {
    const res = await fetch(`${SETTINGS_URL}?key=${key}`);
    if (!res.ok) return null;
    const text = await res.text();
    const data = JSON.parse(text);
    return data ? JSON.parse(data) : null;
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
    console.error(`Error saving ${key}:`, e);
  }
};

export const getCourierConfig = async (): Promise<CourierConfig | null> => fetchSetting('courier_config');
export const saveCourierConfig = async (config: CourierConfig) => saveSetting('courier_config', config);

export const getCourierBalance = async (): Promise<number> => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) return 0;
  try {
    const res = await fetch(`${PROXY_URL}?action=balance`, {
      headers: { 'Api-Key': config.apiKey, 'Secret-Key': config.secretKey }
    });
    const data = await res.json();
    return data.current_balance || 0;
  } catch (e) { return 0; }
};

export const getPathaoConfig = async (): Promise<PathaoConfig | null> => fetchSetting('pathao_config');
export const savePathaoConfig = async (config: PathaoConfig) => saveSetting('pathao_config', config);

const getPathaoToken = async (): Promise<string | null> => {
  const cached = await fetchSetting('pathao_token_data');
  if (cached && cached.expires_at > Date.now()) return cached.access_token;

  const config = await getPathaoConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${PROXY_URL}?action=pathao_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await response.json();
    if (data.access_token) {
      await saveSetting('pathao_token_data', {
        ...data,
        expires_at: Date.now() + (data.expires_in * 1000) - 60000
      });
      return data.access_token;
    }
    return null;
  } catch (e) { return null; }
};

export const fetchPathaoCities = async () => {
  const token = await getPathaoToken();
  if (!token) return [];
  const res = await fetch(`${PROXY_URL}?action=pathao_cities&token=${token}`);
  const result = await res.json();
  return result.data?.data || [];
};

export const fetchPathaoZones = async (cityId: number) => {
  const token = await getPathaoToken();
  if (!token) return [];
  const res = await fetch(`${PROXY_URL}?action=pathao_zones&token=${token}&city_id=${cityId}`);
  const result = await res.json();
  return result.data?.data || [];
};

export const fetchPathaoAreas = async (zoneId: number) => {
  const token = await getPathaoToken();
  if (!token) return [];
  const res = await fetch(`${PROXY_URL}?action=pathao_areas&token=${token}&zone_id=${zoneId}`);
  const result = await res.json();
  return result.data?.data || [];
};

export const fetchPathaoStores = async () => {
  const token = await getPathaoToken();
  if (!token) return [];
  const res = await fetch(`${PROXY_URL}?action=pathao_stores&token=${token}`);
  const result = await res.json();
  return result.data?.data || [];
};

export const createSteadfastOrder = async (order: Order) => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) throw new Error("Steadfast API Key not found in Connections.");

  const response = await fetch(`${PROXY_URL}?action=create`, {
    method: 'POST',
    headers: {
      'Api-Key': config.apiKey,
      'Secret-Key': config.secretKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      invoice: order.id,
      recipient_name: order.customer.name,
      recipient_phone: order.customer.phone,
      recipient_address: order.address,
      cod_amount: order.total,
      note: "Sent from Admin Dashboard"
    })
  });

  return await response.json();
};

export const createPathaoOrder = async (orderData: any) => {
  const token = await getPathaoToken();
  if (!token) throw new Error("Pathao authentication failed. Check credentials.");

  const response = await fetch(`${PROXY_URL}?action=pathao_create&token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });

  return await response.json();
};

// Fixed: Added missing export saveTrackingLocally to handle local persistence of tracking data.
export const saveTrackingLocally = async (orderId: string, trackingCode: string, provider: string) => {
  try {
    await fetch(TRACKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, courier_tracking_code: trackingCode, courier_provider: provider })
    });
  } catch (e) {
    console.error("Error saving tracking locally:", e);
  }
};

// Fixed: Added missing export getDeliveryStatus to query courier APIs for shipment updates.
export const getDeliveryStatus = async (trackingCode: string) => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) return { status: 'unknown' };
  try {
    const res = await fetch(`${PROXY_URL}?action=status&tracking_code=${trackingCode}`, {
      headers: { 'Api-Key': config.apiKey, 'Secret-Key': config.secretKey }
    });
    return await res.json();
  } catch (e) { return { status: 'unknown' }; }
};

// Fixed: Added missing export createManualCourierOrder to support manual consignment creation from the UI.
export const createManualCourierOrder = async (formData: any, provider: 'steadfast' | 'pathao') => {
  if (provider === 'steadfast') {
    return await createSteadfastOrder({
      id: `MAN-${Date.now()}`,
      customer: { 
        name: formData.name, 
        phone: formData.phone, 
        email: '', 
        avatar: '', 
        orderCount: 0 
      },
      address: formData.address,
      total: parseFloat(formData.amount || '0'),
    } as any);
  } else {
    const payload = {
      store_id: parseInt(formData.store_id),
      merchant_order_id: `MAN-${Date.now()}`,
      recipient_name: formData.name,
      recipient_phone: formData.phone,
      recipient_address: formData.address,
      recipient_city: parseInt(formData.city_id),
      recipient_zone: parseInt(formData.zone_id),
      recipient_area: formData.area_id ? parseInt(formData.area_id) : undefined,
      delivery_type: 48,
      item_type: 2,
      item_quantity: 1,
      item_weight: 0.5,
      amount_to_collect: parseFloat(formData.amount || '0')
    };
    return await createPathaoOrder(payload);
  }
};

export const syncOrderStatusWithCourier = async (orders: Order[]) => orders;