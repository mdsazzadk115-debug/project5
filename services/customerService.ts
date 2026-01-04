
import { Customer } from "../types";

const CUSTOMERS_API = "api/customers.php";

export const fetchCustomersFromDB = async (): Promise<Customer[]> => {
  try {
    const res = await fetch(CUSTOMERS_API);
    if (!res.ok) return [];
    const data = await res.json();
    // Handling possible error response from PHP
    if (data.error) {
      console.error("Database Error:", data.error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Error fetching customers from DB:", e);
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
