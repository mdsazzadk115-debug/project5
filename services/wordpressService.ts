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

// Helper to interact with PHP Backend
const fetchSetting = async (key: string) => {
  try {
    // Path remains api/ because public/api becomes dist/api
    const res = await fetch(`api/settings.php?key=${key}`);
    const data = await res.json();
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Error fetching setting:", key, e);
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

export const fetchOrdersFromWP = async (): Promise<Order[]> => {
  const config = await getWPConfig();
  if (!config || !config.url) throw new Error("WordPress not configured");

  const { url, consumerKey, consumerSecret } = config;
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const apiBase = `${baseUrl}/wp-json/wc/v3/orders?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100`;

  try {
    const response = await fetch(`${apiBase}`);
    if (!response.ok) throw new Error("Failed to fetch from WordPress");
    const allWcOrders = await response.json();

    return allWcOrders.map((wc: any): Order => {
      let mappedStatus: Order['status'] = 'Pending';
      switch (wc.status) {
        case 'processing': mappedStatus = 'Packaging'; break;
        case 'completed': mappedStatus = 'Delivered'; break;
        case 'on-hold': mappedStatus = 'Pending'; break;
        case 'cancelled': mappedStatus = 'Cancelled'; break;
        case 'refunded': mappedStatus = 'Returned'; break;
        case 'failed': mappedStatus = 'Rejected'; break;
        default: mappedStatus = 'Pending';
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
        statusHistory: { placed: new Date(wc.date_created).toLocaleDateString() }
      };
    });
  } catch (error) {
    console.error("WordPress Orders API Error:", error);
    return [];
  }
};

export const fetchProductsFromWP = async (): Promise<InventoryProduct[]> => {
  const config = await getWPConfig();
  if (!config || !config.url) return [];

  const { url, consumerKey, consumerSecret } = config;
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const apiBase = `${baseUrl}/wp-json/wc/v3/products?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100`;

  try {
    const response = await fetch(apiBase);
    const data = await response.json();
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
    console.error("WordPress Products API Error:", error);
    return [];
  }
};

export const fetchCategoriesFromWP = async (): Promise<WPCategory[]> => {
  const config = await getWPConfig();
  if (!config || !config.url) return [];
  const { url, consumerKey, consumerSecret } = config;
  const apiBase = `${url}/wp-json/wc/v3/products/categories?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
  try {
    const res = await fetch(apiBase);
    return await res.json();
  } catch (e) {
    console.error("WordPress Categories API Error:", e);
    return [];
  }
};