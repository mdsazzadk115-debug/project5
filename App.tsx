
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
import { 
  Briefcase, 
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
import { syncOrderStatusWithCourier, createSteadfastOrder, saveTrackingLocally } from './services/courierService';
import { createPathaoOrder, getPathaoCities, getPathaoZones, getPathaoAreas } from './services/pathaoService';
import { getExpenses, saveExpenses } from './services/expenseService';
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
          <p className="text-xs opacity-80">Click the "Settings" (gear icon) in the Top Bar to enter your WordPress URL, Consumer Key, and Secret.</p>
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
      <StatCard title="Orders" value={statusCounts['All'].toString()} change={0} icon={<Truck size={20} />} isCurrency={false} />
      <StatCard title="Customers" value={stats.customers.toString()} change={0} icon={<Users size={20} />} isCurrency={false} />
      <StatCard title="Total Products" value={stats.totalProducts.toString()} change={100} icon={<Package size={20} />} isCurrency={false} />
    </div>

    {loadingData && (
      <div className="flex items-center justify-center gap-2 p-4 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 animate-pulse">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm font-bold">Synchronizing with WordPress & Courier...</span>
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
        <div className="bg-orange-500 text-white rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Box size={24} />
          </div>
          <div>
            <p className="text-xs opacity-80 font-medium mb-1">Pending</p>
            <p className="text-2xl font-bold">{statusCounts['Pending'] || 0}</p>
          </div>
        </div>
        <div className="bg-purple-500 text-white rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <p className="text-xs opacity-80 font-medium mb-1">Packaging</p>
            <p className="text-2xl font-bold">{statusCounts['Packaging'] || 0}</p>
          </div>
        </div>
        <div className="bg-blue-500 text-white rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-xs opacity-80 font-medium mb-1">On Shipping</p>
            <p className="text-2xl font-bold">{statusCounts['Shipping'] || 0}</p>
          </div>
        </div>
        <div className="bg-emerald-500 text-white rounded-xl p-6 flex flex-col items-center justify-center text-center gap-4 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <p className="text-xs opacity-80 font-medium mb-1">Complete Order</p>
            <p className="text-2xl font-bold">{statusCounts['Delivered'] || 0}</p>
          </div>
        </div>
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
            <div className="h-4 bg-white/20 rounded w-4/6"></div>
          </div>
        ) : (
          <ul className="space-y-4 relative z-10">
            {aiInsights.map((insight, idx) => (
              <li key={idx} className="flex gap-3 text-sm leading-relaxed bg-white/10 p-3 rounded-lg border border-white/10 hover:bg-white/20 transition-colors">
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
  const [manualCustomers, setManualCustomers] = useState<Customer[]>([]);
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

  const customers = useMemo(() => {
    const customerMap = new Map<string, Customer>();
    
    // Process orders to get customers
    orders.forEach(o => {
      const existing = customerMap.get(o.customer.phone);
      if (existing) {
        existing.orderCount++;
      } else {
        customerMap.set(o.customer.phone, { ...o.customer, orderCount: 1 });
      }
    });

    // Add manually created customers if they don't exist yet in the orders map
    manualCustomers.forEach(mc => {
      if (!customerMap.has(mc.phone)) {
        customerMap.set(mc.phone, mc);
      }
    });

    return Array.from(customerMap.values());
  }, [orders, manualCustomers]);

  const loadAllData = async () => {
    const config = await getWPConfig();
    if (!config || !config.url || !config.consumerKey) {
      setHasConfig(false);
      return;
    }
    setHasConfig(true);
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
      
      const totalSales = syncedOrders.reduce((acc, o) => acc + o.total, 0);
      const totalExpensesValue = dbExpenses.reduce((acc, e) => acc + e.amount, 0);
      
      setStats({
        totalPosSale: totalSales,
        totalExpenses: totalExpensesValue,
        netProfit: totalSales - totalExpensesValue,
        grossProfit: totalSales * 0.45,
        onlineSold: totalSales * 0.2,
        orders: syncedOrders.length,
        customers: new Set(syncedOrders.map(o => o.customer.email)).size,
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
    loadAllData(); // Refresh stats
  };

  const handleDeleteExpense = async (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    await saveExpenses(updated);
    loadAllData(); // Refresh stats
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
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } else {
      throw new Error("Failed to save order to database.");
    }
  };

  const handleAddManualCustomer = (customer: Customer) => {
    setManualCustomers(prev => {
      // Avoid duplicate phones
      if (prev.some(c => c.phone === customer.phone)) return prev;
      return [customer, ...prev];
    });
  };

  const handleSendToCourierDirectly = async (order: Order, courier: 'Steadfast' | 'Pathao') => {
    if (courier === 'Steadfast') {
      const res = await createSteadfastOrder(order);
      if (res.status === 200) {
        setOrders(prev => prev.map(o => o.id === order.id ? { 
          ...o, 
          courier_tracking_code: res.consignment.tracking_code,
          courier_name: 'Steadfast',
          courier_status: res.consignment.status,
          status: 'Shipping'
        } : o));
      }
      return res;
    } else {
      alert("Pathao requires location selection. Please send via Order Detail view.");
      throw new Error("Pathao requires detailed area selection.");
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: orders.length,
      Pending: 0,
      Packaging: 0,
      Shipping: 0,
      Delivered: 0,
      Cancelled: 0,
      Returned: 0,
      Rejected: 0,
    };
    orders.forEach(order => {
      if (counts[order.status] !== undefined) {
        counts[order.status]++;
      }
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
  }, [stats]);

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
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus } 
          : order
      )
    );
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardContent 
            stats={stats} 
            loadingInsights={loadingInsights} 
            aiInsights={aiInsights} 
            statusCounts={statusCounts} 
            loadingData={loadingData}
            onRefresh={loadAllData}
            hasConfig={hasConfig}
          />
        );
      case 'analytics':
        return <AnalyticsView orders={orders} stats={stats} />;
      case 'bulk-sms':
        return <BulkSMSView customers={customers} orders={orders} products={products} />;
      case 'courier':
        return <CourierDashboardView orders={orders} onRefresh={loadAllData} />;
      case 'expenses':
        return <ExpenseListView expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} />;
      case 'pos':
        return (
          <POSView 
            products={products} 
            customers={customers} 
            categories={categories} 
            onPlaceOrder={handlePlacePOSOrder}
            onSendToCourier={handleSendToCourierDirectly}
            onAddCustomer={handleAddManualCustomer}
          />
        );
      case 'orders':
        return (
          <OrderDashboardView 
            orders={filteredOrders} 
            onViewOrder={handleViewOrder} 
            onUpdateStatus={handleUpdateOrderStatus}
          />
        );
      case 'order-detail':
        return selectedOrder ? <OrderDetailView order={selectedOrder} onBack={() => setActivePage('orders')} /> : null;
      case 'all-products':
        return <ProductListView initialProducts={products} />;
      default:
        return (
          <DashboardContent 
            stats={stats} 
            loadingInsights={loadingInsights} 
            aiInsights={aiInsights} 
            statusCounts={statusCounts} 
            loadingData={loadingData}
            onRefresh={loadAllData}
            hasConfig={hasConfig}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        activePage={activePage === 'order-detail' ? 'orders' : activePage} 
        onNavigate={handleNavigate} 
        statusCounts={statusCounts}
        activeStatus={filterStatus}
        onStatusFilter={setFilterStatus}
      />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
