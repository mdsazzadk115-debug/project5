import { CourierConfig, Order } from "../types";

// Base URL points to our local proxy scripts
const PROXY_URL = "api/courier.php";
const TRACKING_URL = "api/local_tracking.php";
const SETTINGS_URL = "api/settings.php";

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
    console.error("Error saving courier setting:", e);
  }
};

export const getCourierConfig = async (): Promise<CourierConfig | null> => {
  return await fetchSetting('courier_config');
};

export const saveCourierConfig = async (config: CourierConfig) => {
  await saveSetting('courier_config', config);
};

export const saveTrackingLocally = async (orderId: string, trackingCode: string, status: string) => {
  try {
    await fetch(TRACKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        tracking_code: trackingCode,
        status: status
      })
    });
  } catch (e) {
    console.error("Local tracking update failed:", e);
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
        result.consignment.status
      );
    }

    return result;
  } catch (error) {
    console.error("Steadfast Order Creation Error:", error);
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
  const activeOrders = orders.filter(o => 
    o.courier_tracking_code && 
    !['Delivered', 'Cancelled', 'Returned'].includes(o.status)
  );

  if (activeOrders.length === 0) return orders;

  const updatedOrders = [...orders];

  for (let order of activeOrders) {
    const statusData = await getDeliveryStatus(order.courier_tracking_code!);
    if (statusData && statusData.status === 200 && statusData.delivery_status) {
      const courierStatus = statusData.delivery_status;
      
      let newStatus: Order['status'] = order.status;
      const cs = courierStatus.toLowerCase();
      if (cs.includes('delivered')) newStatus = 'Delivered';
      else if (cs.includes('cancelled')) newStatus = 'Cancelled';
      else if (cs.includes('return')) newStatus = 'Returned';
      else if (cs.includes('transit') || cs.includes('shipping') || cs.includes('pickup')) newStatus = 'Shipping';

      if (newStatus !== order.status) {
        const idx = updatedOrders.findIndex(o => o.id === order.id);
        if (idx !== -1) {
          updatedOrders[idx] = { ...updatedOrders[idx], status: newStatus, courier_status: courierStatus };
          await saveTrackingLocally(order.id, order.courier_tracking_code!, courierStatus);
        }
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