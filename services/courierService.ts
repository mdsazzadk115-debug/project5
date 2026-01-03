
import { CourierConfig, Order } from "../types";
import { getPathaoOrderStatus } from "./pathaoService";

const PROXY_URL = "api/courier.php";
const TRACKING_URL = "api/local_tracking.php";
const SETTINGS_URL = "api/settings.php";

/**
 * Smartly identifies the courier based on the tracking code pattern.
 */
export const identifyCourierByTrackingCode = (trackingCode: string): 'Steadfast' | 'Pathao' => {
  if (!trackingCode) return 'Steadfast';
  const isNumeric = /^\d+$/.test(trackingCode);
  return isNumeric ? 'Pathao' : 'Steadfast';
};

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
    console.error("Error saving setting:", e);
  }
};

export const getCourierConfig = async (): Promise<CourierConfig | null> => {
  return await fetchSetting('courier_config');
};

export const saveCourierConfig = async (config: CourierConfig) => {
  await saveSetting('courier_config', config);
};

export const fetchAllLocalTracking = async (): Promise<any[]> => {
  try {
    const res = await fetch(TRACKING_URL);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
};

export const saveTrackingLocally = async (orderId: string, trackingCode: string, status: string, courier?: 'Steadfast' | 'Pathao') => {
  const detectedCourier = courier || identifyCourierByTrackingCode(trackingCode);
  
  try {
    const response = await fetch(TRACKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        tracking_code: trackingCode,
        status: status,
        courier_name: detectedCourier 
      })
    });
    return await response.json();
  } catch (e) {
    console.error("Local tracking update failed:", e);
    return { status: "error" };
  }
};

export const createSteadfastOrder = async (order: Order) => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) throw new Error("Courier API not configured");

  try {
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
        note: `Order from Admin Dashboard`
      })
    });

    const result = await response.json();
    
    if (result.status === 200 && result.consignment) {
      await saveTrackingLocally(
        order.id, 
        result.consignment.tracking_code, 
        result.consignment.status,
        'Steadfast'
      );
    }

    return result;
  } catch (error) {
    throw error;
  }
};

export const getDeliveryStatus = async (trackingCode: string) => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) return null;

  try {
    const response = await fetch(`${PROXY_URL}?action=status&tracking_code=${trackingCode}`, {
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

export const syncOrderStatusWithCourier = async (orders: Order[]) => {
  const localTracking = await fetchAllLocalTracking();
  const updatedOrders = [...orders];

  for (let i = 0; i < updatedOrders.length; i++) {
    const order = updatedOrders[i];
    const trackingInfo = localTracking.find(t => t.id === order.id);
    
    if (trackingInfo) {
      const courier = trackingInfo.courier_name || identifyCourierByTrackingCode(trackingInfo.courier_tracking_code);
      
      updatedOrders[i] = {
        ...updatedOrders[i],
        courier_name: courier as 'Steadfast' | 'Pathao',
        courier_tracking_code: trackingInfo.courier_tracking_code,
        courier_status: trackingInfo.courier_status
      };
    }
  }

  const activeOrders = updatedOrders.filter(o => 
    o.courier_tracking_code && 
    !['Delivered', 'Cancelled', 'Returned'].includes(o.status)
  );

  for (let order of activeOrders) {
    const courier = order.courier_name || identifyCourierByTrackingCode(order.courier_tracking_code!);
    let courierStatus = '';

    if (courier === 'Pathao') {
      const rawStatusData = await getPathaoOrderStatus(order.courier_tracking_code!);
      if (rawStatusData?.data?.order_status) {
        courierStatus = rawStatusData.data.order_status;
      }
    } else {
      const rawStatusData = await getDeliveryStatus(order.courier_tracking_code!);
      if (rawStatusData?.status === 200 && rawStatusData.delivery_status) {
        courierStatus = rawStatusData.delivery_status;
      }
    }

    if (courierStatus) {
      let newStatus: Order['status'] = order.status;
      const cs = courierStatus.toLowerCase();

      if (cs.includes('delivered')) newStatus = 'Delivered';
      else if (cs.includes('cancelled')) newStatus = 'Cancelled';
      else if (cs.includes('return')) newStatus = 'Returned';
      else if (cs === 'pending' || cs === 'hold' || cs === 'packaging') newStatus = 'Packaging';
      else if (cs !== 'unknown') newStatus = 'Shipping';

      const idx = updatedOrders.findIndex(o => o.id === order.id);
      if (idx !== -1 && (newStatus !== updatedOrders[idx].status || courierStatus !== updatedOrders[idx].courier_status)) {
        updatedOrders[idx] = { 
          ...updatedOrders[idx], 
          status: newStatus, 
          courier_status: courierStatus,
          courier_name: courier
        };
        await saveTrackingLocally(order.id, order.courier_tracking_code!, courierStatus, courier);
      }
    }
  }

  return updatedOrders;
};

export const getCourierBalance = async () => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) return 0;

  try {
    const response = await fetch(`${PROXY_URL}?action=balance`, {
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
