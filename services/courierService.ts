import { CourierConfig, Order } from "../types";
import { getPathaoOrderStatus } from "./pathaoService";

// Base URL points to our local proxy scripts
const PROXY_URL = "api/courier.php";
const TRACKING_URL = "api/local_tracking.php";
const SETTINGS_URL = "api/settings.php";

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
    console.error("Error saving courier setting:", e);
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

export const saveTrackingLocally = async (orderId: string, trackingCode: string, status: string, courier: 'Steadfast' | 'Pathao' = 'Steadfast') => {
  try {
    await fetch(TRACKING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        tracking_code: trackingCode,
        status: status,
        courier_name: courier // Storing the courier name is crucial for the list view
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
        result.consignment.status,
        'Steadfast'
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
  const localTracking = await fetchAllLocalTracking();
  const updatedOrders = [...orders];

  // 1. Update existing WP orders that have tracking
  const activeOrders = updatedOrders.filter(o => 
    o.courier_tracking_code && 
    !['Delivered', 'Cancelled', 'Returned'].includes(o.status)
  );

  for (let order of activeOrders) {
    // Find which courier this tracking belongs to
    const trackingInfo = localTracking.find(t => t.id === order.id || t.courier_tracking_code === order.courier_tracking_code);
    const courier = trackingInfo?.courier_name || 'Steadfast';
    
    let courierStatus = '';
    let rawStatusData: any = null;

    if (courier === 'Pathao') {
      rawStatusData = await getPathaoOrderStatus(order.courier_tracking_code!);
      if (rawStatusData?.data?.order_status) {
        courierStatus = rawStatusData.data.order_status;
      }
    } else {
      rawStatusData = await getDeliveryStatus(order.courier_tracking_code!);
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

      if (newStatus !== order.status) {
        const idx = updatedOrders.findIndex(o => o.id === order.id);
        if (idx !== -1) {
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
  }

  // 2. Identify external orders
  const wpOrderIds = new Set(orders.map(o => o.id));
  const externalTracking = localTracking.filter(t => !wpOrderIds.has(t.id));

  for (const ext of externalTracking) {
    const courier = ext.courier_name || 'Steadfast';
    let virtualOrder: Order | null = null;

    if (courier === 'Pathao') {
      const statusData = await getPathaoOrderStatus(ext.courier_tracking_code);
      if (statusData?.data) {
        const d = statusData.data;
        virtualOrder = {
          id: ext.id,
          timestamp: Date.now(),
          customer: { name: d.recipient_name || 'Pathao Customer', email: '', phone: d.recipient_phone || 'N/A', avatar: `https://ui-avatars.com/api/?name=Pathao&background=random`, orderCount: 1 },
          address: d.recipient_address || 'N/A',
          date: new Date().toLocaleString(),
          paymentMethod: 'COD (Pathao)',
          products: [],
          subtotal: parseFloat(d.amount_to_collect || '0'),
          shippingCharge: 0,
          discount: 0,
          total: parseFloat(d.amount_to_collect || '0'),
          status: 'Shipping',
          statusHistory: { placed: 'Pathao Sync' },
          courier_tracking_code: ext.courier_tracking_code,
          courier_status: d.order_status,
          courier_name: 'Pathao'
        };
      }
    } else {
      const statusData = await getDeliveryStatus(ext.courier_tracking_code);
      if (statusData && statusData.status === 200) {
        virtualOrder = {
          id: ext.id,
          timestamp: Date.now(),
          customer: { name: statusData.recipient_name || 'External Customer', email: '', phone: statusData.recipient_phone || 'N/A', avatar: `https://ui-avatars.com/api/?name=Ext&background=random`, orderCount: 1 },
          address: statusData.recipient_address || 'Manual Entry',
          date: new Date().toLocaleString(),
          paymentMethod: 'COD (External)',
          products: [],
          subtotal: parseFloat(statusData.cod_amount || '0'),
          shippingCharge: 0,
          discount: 0,
          total: parseFloat(statusData.cod_amount || '0'),
          status: 'Shipping',
          statusHistory: { placed: 'Manual Sync' },
          courier_tracking_code: ext.courier_tracking_code,
          courier_status: statusData.delivery_status,
          courier_name: 'Steadfast'
        };
      }
    }

    if (virtualOrder) {
      const cs = (virtualOrder.courier_status || '').toLowerCase();
      if (cs.includes('delivered')) virtualOrder.status = 'Delivered';
      else if (cs.includes('cancelled')) virtualOrder.status = 'Cancelled';
      else if (cs.includes('return')) virtualOrder.status = 'Returned';
      updatedOrders.push(virtualOrder);
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
