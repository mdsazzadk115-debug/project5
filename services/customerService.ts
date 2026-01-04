
import { Customer } from "../types";

const CUSTOMERS_API = "api/customers.php";

export const fetchCustomersFromDB = async (): Promise<Customer[]> => {
  try {
    const res = await fetch(CUSTOMERS_API);
    if (!res.ok) {
      const err = await res.json();
      console.error("Server Error:", err.error);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
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
