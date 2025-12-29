
import { CourierConfig, Order } from "../types";

const BASE_URL = "https://portal.packzy.com/api/v1";

const fetchSetting = async (key: string) => {
  try {
    const res = await fetch(`api/settings.php?key=${key}`);
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
    await fetch(`api/settings.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: JSON.stringify(value) })
    });
  } catch (e) {
    console.error("Error saving courier setting:", e);
  }
};

export const getCourierConfig = async (): Promise<CourierConfig | null> => {
  return await fetchSetting('courier_config');
};

export const saveCourierConfig = async (config: CourierConfig) => {
  await saveSetting('courier_config', config);
};

// Internal function to save tracking info locally
const saveTrackingLocally = async (orderId: string, trackingCode: string, status: string) => {
  try {
    await fetch('api/update_order_courier.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        tracking_code: trackingCode,
        status: status
      })
    });
  } catch (e) {
    console.error("Local DB update failed:", e);
  }
};

export const createSteadfastOrder = async (order: Order) => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) throw new Error("Courier API not configured");

  try {
    const response = await fetch(`${BASE_URL}/create_order`, {
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
        note: `Order from Dashboard - Method: ${order.paymentMethod}`
      })
    });

    const result = await response.json();
    
    // If successful, save the tracking code to our MySQL database
    if (result.status === 200 && result.consignment) {
      await saveTrackingLocally(
        order.id, 
        result.consignment.tracking_code, 
        result.consignment.status
      );
    }

    return result;
  } catch (error) {
    console.error("Steadfast Order Creation Error:", error);
    throw error;
  }
};

export const getCourierBalance = async () => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) return 0;

  try {
    const response = await fetch(`${BASE_URL}/get_balance`, {
      method: 'GET',
      headers: {
        'Api-Key': config.apiKey,
        'Secret-Key': config.secretKey,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.current_balance || 0;
  } catch (error) {
    return 0;
  }
};

export const getDeliveryStatus = async (trackingCode: string) => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) return null;

  try {
    const response = await fetch(`${BASE_URL}/status_by_trackingcode/${trackingCode}`, {
      method: 'GET',
      headers: {
        'Api-Key': config.apiKey,
        'Secret-Key': config.secretKey,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    return null;
  }
};
