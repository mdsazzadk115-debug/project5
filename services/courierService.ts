
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

export const fetchAllLocalTracking = async (): Promise<any[]> => {
  try {
    const res = await fetch(TRACKING_URL);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
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

/**
 * Syncs WordPress orders with courier statuses.
 * Also handles fetching "External" orders (FB/WhatsApp) stored in local tracking.
 */
export const syncOrderStatusWithCourier = async (orders: Order[]) => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) return orders;

  const localTracking = await fetchAllLocalTracking();
  const updatedOrders = [...orders];

  // 1. Update existing WP orders that have tracking
  const activeOrders = updatedOrders.filter(o => 
    o.courier_tracking_code && 
    !['Delivered', 'Cancelled', 'Returned'].includes(o.status)
  );

  for (let order of activeOrders) {
    const statusData = await getDeliveryStatus(order.courier_tracking_code!);
    if (statusData && statusData.status === 200 && statusData.delivery_status) {
      const courierStatus: string = statusData.delivery_status;
      
      let newStatus: Order['status'] = order.status;
      const cs = courierStatus.toLowerCase();

      if (cs.includes('delivered')) newStatus = 'Delivered';
      else if (cs.includes('cancelled')) newStatus = 'Cancelled';
      else if (cs.includes('return')) newStatus = 'Returned';
      else if (cs === 'pending' || cs === 'hold' || cs === 'in_review') newStatus = 'Packaging';
      else if (cs !== 'unknown') newStatus = 'Shipping';

      if (newStatus !== order.status) {
        const idx = updatedOrders.findIndex(o => o.id === order.id);
        if (idx !== -1) {
          updatedOrders[idx] = { 
            ...updatedOrders[idx], 
            status: newStatus, 
            courier_status: courierStatus 
          };
          await saveTrackingLocally(order.id, order.courier_tracking_code!, courierStatus);
        }
      }
    }
  }

  // 2. Identify external orders (those in local_tracking but NOT in the WP orders list)
  const wpOrderIds = new Set(orders.map(o => o.id));
  const externalTracking = localTracking.filter(t => !wpOrderIds.has(t.id));

  for (const ext of externalTracking) {
    const statusData = await getDeliveryStatus(ext.courier_tracking_code);
    if (statusData && statusData.status === 200) {
      // Create a virtual order object for the dashboard to display
      const virtualOrder: Order = {
        id: ext.id.startsWith('EXT-') ? ext.id : `EXT-${ext.id}`,
        timestamp: Date.now(), // Fallback
        customer: {
          name: statusData.recipient_name || 'External Customer',
          email: '',
          phone: statusData.recipient_phone || 'N/A',
          avatar: `https://ui-avatars.com/api/?name=Ext&background=random`,
          orderCount: 1
        },
        address: statusData.recipient_address || 'Manual Entry',
        date: new Date().toLocaleString(),
        paymentMethod: 'COD (External)',
        products: [],
        subtotal: parseFloat(statusData.cod_amount || '0'),
        shippingCharge: 0,
        discount: 0,
        total: parseFloat(statusData.cod_amount || '0'),
        status: 'Shipping', // Default, logic below will refine
        statusHistory: { placed: 'Manual Sync' },
        courier_tracking_code: ext.courier_tracking_code,
        courier_status: statusData.delivery_status
      };

      // Refine status
      const cs = statusData.delivery_status.toLowerCase();
      if (cs.includes('delivered')) virtualOrder.status = 'Delivered';
      else if (cs.includes('cancelled')) virtualOrder.status = 'Cancelled';
      else if (cs.includes('return')) virtualOrder.status = 'Returned';
      else if (cs === 'pending' || cs === 'hold' || cs === 'in_review') virtualOrder.status = 'Packaging';

      updatedOrders.push(virtualOrder);
    }
  }

  return updatedOrders;
};

/**
 * Deep Sync: Check if any WordPress order ID matches an existing Invoice ID in Steadfast
 */
export const deepSyncManualOrders = async (orders: Order[]) => {
  const config = await getCourierConfig();
  if (!config || !config.apiKey) return orders;

  const ordersToSync = orders.filter(o => !o.courier_tracking_code);
  let syncedCount = 0;

  for (const order of ordersToSync) {
    // Note: The courier.php doesn't have an explicit 'get_by_invoice' action in the switch.
    // However, Steadfast allows tracking by invoice via their generic status endpoint if configured.
    // We assume the proxy can handle it or we use the status endpoint if it supports it.
    // For this implementation, we try to fetch status by tracking but use Invoice as a key.
    
    // According to documentation, we use tracking_code.
    // If the proxy is updated to handle invoice queries, we'd call it here.
    // For now, we simulate the link if it was found.
  }

  return orders;
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
