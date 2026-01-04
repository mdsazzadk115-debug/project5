
import { Customer } from "../types";

const CUSTOMERS_API = "api/customers.php";

export const fetchCustomersFromDB = async (): Promise<Customer[]> => {
  try {
    const res = await fetch(CUSTOMERS_API);
    if (!res.ok) {
      console.error(`HTTP Error: ${res.status}`);
      return [];
    }
    const text = await res.text();
    if (!text || text.trim() === "" || text === "null") {
      return [];
    }
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (parseError) {
      console.error("Error parsing customer JSON:", parseError, "Response text:", text);
      return [];
    }
  } catch (e) {
    console.error("Network error fetching customers:", e);
    return [];
  }
};

export const syncCustomerWithDB = async (customer: Partial<Customer> & { total?: number }) => {
  try {
    const response = await fetch(CUSTOMERS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        address: customer.address,
        total: customer.total || 0,
        avatar: customer.avatar
      })
    });
    return await response.json();
  } catch (e) {
    console.error("Error syncing customer:", e);
    return { error: true };
  }
};
