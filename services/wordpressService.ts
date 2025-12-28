
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

export const getWPConfig = (): WPConfig | null => {
  const saved = localStorage.getItem('wp_config');
  return saved ? JSON.parse(saved) : null;
};

export const saveWPConfig = (config: WPConfig) => {
  localStorage.setItem('wp_config', JSON.stringify(config));
};

export const fetchOrdersFromWP = async (): Promise<Order[]> => {
  const config = getWPConfig();
  if (!config) throw new Error("WordPress not configured");

  const { url, consumerKey, consumerSecret } = config;
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const apiBase = `${baseUrl}/wp-json/wc/v3/orders?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100`;

  try {
    let allWcOrders: any[] = [];
    let page = 1;
    let totalPages = 1;

    const firstResponse = await fetch(`${apiBase}&page=${page}`);
    if (!firstResponse.ok) throw new Error("Failed to fetch from WordPress");
    
    totalPages = parseInt(firstResponse.headers.get('X-WP-TotalPages') || '1');
    const firstPageOrders = await firstResponse.json();
    allWcOrders = [...firstPageOrders];

    if (totalPages > 1) {
      const pagePromises = [];
      for (let i = 2; i <= totalPages; i++) {
        pagePromises.push(
          fetch(`${apiBase}&page=${i}`).then(res => res.ok ? res.json() : [])
        );
      }
      const remainingPagesResults = await Promise.all(pagePromises);
      remainingPagesResults.forEach(pageOrders => {
        allWcOrders = [...allWcOrders, ...pageOrders];
      });
    }

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

      const products: Product[] = wc.line_items.map((item: any) => ({
        id: item.product_id.toString(),
        name: item.name,
        brand: 'N/A',
        price: parseFloat(item.price),
        qty: item.quantity,
        img: 'https://picsum.photos/seed/' + item.product_id + '/100/100'
      }));

      const dateObj = new Date(wc.date_created);
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return {
        id: wc.id.toString(),
        timestamp: dateObj.getTime(),
        customer: {
          name: `${wc.billing.first_name} ${wc.billing.last_name}`.trim() || wc.billing.email || 'Guest Customer',
          email: wc.billing.email,
          phone: wc.billing.phone,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(wc.billing.first_name || 'U')}+${encodeURIComponent(wc.billing.last_name || 'C')}&background=random`,
          orderCount: 0
        },
        address: `${wc.billing.address_1}${wc.billing.city ? ', ' + wc.billing.city : ''}${wc.billing.country ? ', ' + wc.billing.country : ''}`,
        date: formattedDate,
        paymentMethod: wc.payment_method_title || 'Unknown',
        products: products,
        subtotal: parseFloat(wc.total) - (parseFloat(wc.shipping_total) || 0),
        shippingCharge: parseFloat(wc.shipping_total) || 0,
        discount: parseFloat(wc.discount_total) || 0,
        total: parseFloat(wc.total),
        status: mappedStatus,
        statusHistory: {
          placed: formattedDate,
          packaging: wc.status === 'processing' || wc.status === 'completed' ? formattedDate : undefined,
          delivered: wc.status === 'completed' ? formattedDate : undefined
        }
      };
    });
  } catch (error) {
    console.error("WordPress Orders API Error:", error);
    throw error;
  }
};

export const fetchProductsFromWP = async (): Promise<InventoryProduct[]> => {
  const config = getWPConfig();
  if (!config) throw new Error("WordPress not configured");

  const { url, consumerKey, consumerSecret } = config;
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const apiBase = `${baseUrl}/wp-json/wc/v3/products?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100`;

  try {
    let allWcProducts: any[] = [];
    let page = 1;
    let totalPages = 1;

    const firstResponse = await fetch(`${apiBase}&page=${page}`);
    if (!firstResponse.ok) throw new Error("Failed to fetch products from WordPress");
    
    totalPages = parseInt(firstResponse.headers.get('X-WP-TotalPages') || '1');
    const firstPageProducts = await firstResponse.json();
    allWcProducts = [...firstPageProducts];

    if (totalPages > 1) {
      const pagePromises = [];
      for (let i = 2; i <= totalPages; i++) {
        pagePromises.push(
          fetch(`${apiBase}&page=${i}`).then(res => res.ok ? res.json() : [])
        );
      }
      const remainingPagesResults = await Promise.all(pagePromises);
      remainingPagesResults.forEach(pageProducts => {
        allWcProducts = [...allWcProducts, ...pageProducts];
      });
    }

    return allWcProducts.map((wc: any): InventoryProduct => {
      const price = parseFloat(wc.price || '0');
      const regularPrice = parseFloat(wc.regular_price || wc.price || '0');
      const discountPercent = regularPrice > price 
        ? Math.round(((regularPrice - price) / regularPrice) * 100) 
        : 0;

      return {
        id: wc.id.toString(),
        name: wc.name,
        brand: wc.attributes?.find((a: any) => a.name.toLowerCase() === 'brand')?.options[0] || 'N/A',
        category: wc.categories[0]?.name || 'Uncategorized',
        price: price,
        originalPrice: regularPrice > price ? regularPrice : undefined,
        discountPercent: discountPercent,
        stock: wc.stock_quantity || 0,
        status: wc.status === 'publish',
        img: wc.images[0]?.src || 'https://picsum.photos/seed/' + wc.id + '/100/100'
      };
    });
  } catch (error) {
    console.error("WordPress Products API Error:", error);
    throw error;
  }
};

export const fetchCategoriesFromWP = async (): Promise<WPCategory[]> => {
  const config = getWPConfig();
  if (!config) return [];

  const { url, consumerKey, consumerSecret } = config;
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const apiBase = `${baseUrl}/wp-json/wc/v3/products/categories?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}&per_page=100`;

  try {
    const response = await fetch(apiBase);
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat.count
    }));
  } catch (error) {
    console.error("WordPress Categories API Error:", error);
    return [];
  }
};
