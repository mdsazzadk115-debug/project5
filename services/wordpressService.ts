import { Order, Product, InventoryProduct } from "../types";

export interface WPConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

const SETTINGS_URL = "api/settings.php";
const TRACKING_URL = "api/local_tracking.php";

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
    console.error("Error saving setting:", key, e);
  }
};

let cachedConfig: WPConfig | null = null;

export const getWPConfig = async (): Promise<WPConfig | null> => {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await fetchSetting('wp_config');
  return cachedConfig;
};

export const saveWPConfig = async (config: WPConfig) => {
  cachedConfig = config;
  await saveSetting('wp_config', config);
};

const fetchLocalTrackingData = async (): Promise<any[]> => {
  try {
    const res = await fetch(TRACKING_URL);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Error fetching local tracking data:", e);
    return [];
  }
};

export const fetchOrdersFromWP = async (): Promise<Order[]> => {
  try {
    const config = await getWPConfig();
    if (!config || !config.url || !config.consumerKey) {
      return [];
    }

    const { url, consumerKey, consumerSecret } = config;
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const localTracking = await fetchLocalTrackingData();
    
    const apiBase = `${baseUrl}/wp-json/wc/v3/orders?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100`;

    const response = await fetch(apiBase);
    if (!response.ok) return [];
    const allWcOrders = await response.json();

    if (!Array.isArray(allWcOrders)) return [];

    return allWcOrders.map((wc: any): Order => {
      const tracking = localTracking.find(t => t.id === wc.id.toString());
      let mappedStatus: Order['status'] = 'Pending';
      
      if (tracking && tracking.courier_status) {
        const cs = tracking.courier_status.toLowerCase();
        if (cs.includes('delivered')) mappedStatus = 'Delivered';
        else if (cs.includes('cancelled')) mappedStatus = 'Cancelled';
        else if (cs.includes('return')) mappedStatus = 'Returned';
        else if (cs.includes('transit') || cs.includes('shipping') || cs.includes('pickup')) mappedStatus = 'Shipping';
        else mappedStatus = 'Packaging';
      } else {
        switch (wc.status) {
          case 'processing': mappedStatus = 'Packaging'; break;
          case 'completed': mappedStatus = 'Delivered'; break;
          case 'on-hold': mappedStatus = 'Pending'; break;
          case 'cancelled': mappedStatus = 'Cancelled'; break;
          case 'refunded': mappedStatus = 'Returned'; break;
          case 'failed': mappedStatus = 'Rejected'; break;
          default: mappedStatus = 'Pending';
        }
      }

      return {
        id: wc.id.toString(),
        timestamp: new Date(wc.date_created).getTime(),
        customer: {
          name: `${wc.billing.first_name} ${wc.billing.last_name}`.trim() || wc.billing.email || 'Guest Customer',
          email: wc.billing.email,
          phone: wc.billing.phone,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(wc.billing.first_name || 'U')}+${encodeURIComponent(wc.billing.last_name || 'C')}&background=random`,
          orderCount: 0
        },
        address: `${wc.billing.address_1}${wc.billing.city ? ', ' + wc.billing.city : ''}`,
        date: new Date(wc.date_created).toLocaleString(),
        paymentMethod: wc.payment_method_title || 'Unknown',
        products: wc.line_items.map((item: any) => ({
          id: item.product_id.toString(),
          name: item.name,
          brand: 'N/A',
          price: parseFloat(item.price),
          qty: item.quantity,
          img: 'https://picsum.photos/seed/' + item.product_id + '/100/100'
        })),
        subtotal: parseFloat(wc.total) - (parseFloat(wc.shipping_total) || 0),
        shippingCharge: parseFloat(wc.shipping_total) || 0,
        discount: parseFloat(wc.discount_total) || 0,
        total: parseFloat(wc.total),
        status: mappedStatus,
        statusHistory: { placed: new Date(wc.date_created).toLocaleDateString() },
        courier_tracking_code: tracking?.courier_tracking_code || undefined,
        courier_status: tracking?.courier_status || undefined
      };
    });
  } catch (error) {
    return [];
  }
};

export const fetchProductsFromWP = async (): Promise<InventoryProduct[]> => {
  try {
    const config = await getWPConfig();
    if (!config || !config.url) return [];

    const { url, consumerKey, consumerSecret } = config;
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const apiBase = `${baseUrl}/wp-json/wc/v3/products?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100`;

    const response = await fetch(apiBase);
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((wc: any): InventoryProduct => ({
      id: wc.id.toString(),
      name: wc.name,
      brand: 'N/A',
      category: wc.categories[0]?.name || 'Uncategorized',
      price: parseFloat(wc.price || '0'),
      discountPercent: 0,
      stock: wc.stock_quantity || 0,
      status: wc.status === 'publish',
      img: wc.images[0]?.src || 'https://picsum.photos/seed/' + wc.id + '/100/100'
    }));
  } catch (error) {
    return [];
  }
};

export const fetchCategoriesFromWP = async (): Promise<WPCategory[]> => {
  try {
    const config = await getWPConfig();
    if (!config || !config.url) return [];
    const { url, consumerKey, consumerSecret } = config;
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const apiBase = `${baseUrl}/wp-json/wc/v3/products/categories?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    const res = await fetch(apiBase);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
};