
import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StatCard } from './components/StatCard';
import { SellingStatistics, MiniLineChart } from './components/Charts';
import { AnalyticsView } from './components/AnalyticsView';
import { OrderDashboardView } from './components/OrderDashboardView';
import { OrderDetailView } from './components/OrderDetailView';
import { ProductListView } from './components/ProductListView';
import { BulkSMSView } from './components/BulkSMSView';
import { CourierDashboardView } from './components/CourierDashboardView';
import { ExpenseListView } from './components/ExpenseListView';
import { POSView } from './components/POSView';
import { CustomerListView } from './components/CustomerListView';
import { 
  DollarSign, 
  CreditCard, 
  Package, 
  Users, 
  ShoppingCart,
  Sparkles,
  Truck,
  Box,
  ClipboardCheck,
  Zap,
  Receipt,
  Loader2,
  RefreshCcw,
  AlertTriangle
} from 'lucide-react';
import { getBusinessInsights } from './services/geminiService';
import { fetchOrdersFromWP, fetchProductsFromWP, getWPConfig, fetchCategoriesFromWP, WPCategory, savePOSOrderLocally } from './services/wordpressService';
import { syncOrderStatusWithCourier, createSteadfastOrder } from './services/courierService';
import { getExpenses, saveExpenses } from './services/expenseService';
import { fetchCustomersFromDB, syncCustomerWithDB } from './services/customerService';
import { DashboardStats, Order, InventoryProduct, Customer, Expense } from './types';

const DashboardContent: React.FC<{ 
  stats: DashboardStats; 
  loadingInsights: boolean; 
  aiInsights: string[];
  statusCounts: Record<string, number>;
  loadingData: boolean;
  onRefresh: () => void;
  hasConfig: boolean;
}> = ({ stats, loadingInsights, aiInsights, statusCounts, loadingData, onRefresh, hasConfig }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    {!hasConfig && (
      <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-4 text-red-600 shadow-sm animate-pulse">
        <AlertTriangle size={24} className="shrink-0" />
        <div>
          <p className="text-sm font-bold uppercase tracking-tight">WordPress Connection Required</p>
          <p className="text-xs opacity-80">Check connections in the top bar settings.</p>
        </div>
      </div>
    )}

    <div className="flex justify-between items-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <StatCard title="Profit" value={stats.netProfit.toLocaleString()} change={100} icon={<DollarSign size={20} />} />
        <StatCard title="Total Expenses" value={stats.totalExpenses.toLocaleString()} change={0} icon={<CreditCard size={20} />} />
        <StatCard title="Total Sale" value={stats.totalPosSale.toLocaleString()} change={100} icon={<Receipt size={20} />} />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Online Sold" value={stats.onlineSold.toLocaleString()} change={0} icon={<ShoppingCart size={20} />} />
      <StatCard title="Orders" value={statusCounts['All']?.toString() || "0"} change={0} icon={<Truck size={20} />} isCurrency={false} />
      <StatCard title="Customers" value={stats.customers.toString()} change={0} icon={<Users size={20} />} isCurrency={false} />
      <StatCard title="Total Products" value={stats.totalProducts.toString()} change={100} icon={<Package size={20} />} isCurrency={false} />
    </div>

    {loadingData && (
      <div className="flex items-center justify-center gap-2 p-4 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 animate-pulse">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm font-bold">Synchronizing Database...</span>
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-gray-100 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Week Earnings</h3>
          <button onClick={onRefresh} className="p-1 hover:bg-gray-100 rounded">
            <RefreshCcw size={12} className={loadingData ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-2xl font-bold text-gray-800 mb-4">৳{(stats.totalPosSale / 10).toLocaleString()}</p>
        <div className="flex-1 min-h-[100px]">
          <MiniLineChart />
        </div>
      </div>

      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        {['Pending', 'Packaging', 'Shipping', 'Delivered'].map((st) => (
          <div key={st} className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 hover:shadow-lg transition-all cursor-pointer">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{st}</p>
            <p className="text-2xl font-black text-gray-800">{statusCounts[st] || 0}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <div className="lg:col-span-1 bg-gradient-to-br from-orange-600 to-red-700 p-6 rounded-xl text-white shadow-xl relative overflow-hidden group">
        <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:scale-110 transition-transform">
          <Zap size={140} />
        </div>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles size={20} className="text-orange-200" />
          <h3 className="font-bold text-lg">AI Business Insights</h3>
        </div>
        
        {loadingInsights ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-white/20 rounded w-full"></div>
            <div className="h-4 bg-white/20 rounded w-5/6"></div>
          </div>
        ) : (
          <ul className="space-y-4 relative z-10">
            {aiInsights.map((insight, idx) => (
              <li key={idx} className="flex gap-3 text-sm leading-relaxed bg-white/10 p-3 rounded-lg border border-white/10">
                <span className="shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
                {insight}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lg:col-span-2">
        <SellingStatistics />
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<WPCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dbCustomers, setDbCustomers] = useState<Customer[]>([]);
  const [smsPhoneTarget, setSmsPhoneTarget] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [hasConfig, setHasConfig] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    netProfit: 0,
    grossProfit: 0,
    totalExpenses: 0,
    totalPosSale: 0,
    onlineSold: 0,
    orders: 0,
    customers: 0,
    totalProducts: 0
  });

  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const customers = useMemo(() => dbCustomers, [dbCustomers]);

  const loadAllData = async () => {
    const config = await getWPConfig();
    if (!config || !config.url || !config.consumerKey) {
      setHasConfig(false);
    }
    setLoadingData(true);
    try {
      const [wpOrders, wpProducts, dbExpenses, wpCats] = await Promise.all([
        fetchOrdersFromWP(),
        fetchProductsFromWP(),
        getExpenses(),
        fetchCategoriesFromWP()
      ]);
      
      const enrichedOrders = wpOrders.map(order => ({
        ...order,
        products: order.products.map(p => {
          const match = wpProducts.find(invP => invP.id === p.id);
          return match ? { ...p, img: match.img } : p;
        })
      }));

      const syncedOrders = await syncOrderStatusWithCourier(enrichedOrders);
      setOrders(syncedOrders);
      setProducts(wpProducts);
      setExpenses(dbExpenses);
      setCategories(wpCats);

      // Auto-sync WordPress customers to local DB
      // We identify unique customers from the orders to minimize API calls
      const uniqueCustomers = new Map();
      syncedOrders.forEach(o => {
        const phone = o.customer.phone?.trim();
        if (phone && phone.length > 5) {
          // If we haven't seen this customer yet, or if this order's total is needed for accumulation
          // The backend usually handles accumulation, but we ensure we send all unique ones from this fetch
          uniqueCustomers.set(phone, {
            ...o.customer,
            total: o.total,
            address: o.address
          });
        }
      });

      // Execute syncs in parallel
      if (uniqueCustomers.size > 0) {
        await Promise.all(
          Array.from(uniqueCustomers.values()).map(cust => syncCustomerWithDB(cust))
        );
      }

      // Re-fetch customer list from DB to get the latest updated data (including counts)
      const customersList = await fetchCustomersFromDB();
      setDbCustomers(customersList);

      const totalSales = syncedOrders.reduce((acc, o) => acc + o.total, 0);
      const totalExpensesValue = dbExpenses.reduce((acc, e) => acc + e.amount, 0);
      
      setStats({
        totalPosSale: totalSales,
        totalExpenses: totalExpensesValue,
        netProfit: totalSales - totalExpensesValue,
        grossProfit: totalSales * 0.45,
        onlineSold: totalSales * 0.2,
        orders: syncedOrders.length,
        customers: customersList.length,
        totalProducts: wpProducts.length
      });
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleAddExpense = async (data: Omit<Expense, 'id' | 'timestamp'>) => {
    const newExpense: Expense = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    const updated = [...expenses, newExpense];
    setExpenses(updated);
    await saveExpenses(updated);
    loadAllData();
  };

  const handleDeleteExpense = async (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    await saveExpenses(updated);
    loadAllData();
  };

  const handlePlacePOSOrder = async (orderData: Omit<Order, 'id' | 'timestamp' | 'date' | 'statusHistory'>): Promise<Order | null> => {
    const newOrder: Order = {
      ...orderData,
      id: `POS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      statusHistory: { placed: new Date().toLocaleDateString() }
    };
    
    const success = await savePOSOrderLocally(newOrder);
    if (success) {
      await syncCustomerWithDB({
        ...newOrder.customer,
        total: newOrder.total,
        address: newOrder.address
      });
      setOrders(prev => [newOrder, ...prev]);
      const updatedCustomers = await fetchCustomersFromDB();
      setDbCustomers(updatedCustomers);
      return newOrder;
    }
    return null;
  };

  const handleAddManualCustomer = async (customer: Customer) => {
    await syncCustomerWithDB(customer);
    const updatedCustomers = await fetchCustomersFromDB();
    setDbCustomers(updatedCustomers);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: orders.length };
    orders.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'All') return orders;
    return orders.filter(order => order.status === filterStatus);
  }, [filterStatus, orders]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (stats.orders === 0) return;
      setLoadingInsights(true);
      const insights = await getBusinessInsights(stats);
      setAiInsights(insights);
      setLoadingInsights(false);
    };
    fetchInsights();
  }, [stats.orders]); // Optimized to only run when order count changes

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setSelectedOrder(null);
    if (page !== 'orders') setFilterStatus('All');
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setActivePage('order-detail');
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardContent stats={stats} loadingInsights={loadingInsights} aiInsights={aiInsights} statusCounts={statusCounts} loadingData={loadingData} onRefresh={loadAllData} hasConfig={hasConfig} />;
      case 'analytics':
        return <AnalyticsView orders={orders} stats={stats} />;
      case 'bulk-sms':
        return <BulkSMSView customers={customers} orders={orders} products={products} initialTargetPhone={smsPhoneTarget} />;
      case 'courier':
        return <CourierDashboardView orders={orders} onRefresh={loadAllData} />;
      case 'expenses':
        return <ExpenseListView expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} />;
      case 'pos':
        return <POSView products={products} customers={customers} categories={categories} onPlaceOrder={handlePlacePOSOrder} onSendToCourier={async () => {}} onAddCustomer={handleAddManualCustomer} />;
      case 'customers':
        return <CustomerListView customers={customers} onNavigateToSMS={(p) => { setSmsPhoneTarget(p); setActivePage('bulk-sms'); }} />;
      case 'orders':
        return <OrderDashboardView orders={filteredOrders} onViewOrder={handleViewOrder} onUpdateStatus={handleUpdateOrderStatus} />;
      case 'order-detail':
        return selectedOrder ? <OrderDetailView order={selectedOrder} onBack={() => setActivePage('orders')} /> : null;
      case 'all-products':
        return <ProductListView initialProducts={products} />;
      default:
        return <DashboardContent stats={stats} loadingInsights={loadingInsights} aiInsights={aiInsights} statusCounts={statusCounts} loadingData={loadingData} onRefresh={loadAllData} hasConfig={hasConfig} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage={activePage === 'order-detail' ? 'orders' : activePage} onNavigate={handleNavigate} statusCounts={statusCounts} activeStatus={filterStatus} onStatusFilter={setFilterStatus} />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-8">{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;
