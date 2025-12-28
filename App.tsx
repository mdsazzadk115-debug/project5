
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
  Loader2
} from 'lucide-react';
import { getBusinessInsights } from './services/geminiService';
import { fetchOrdersFromWP, fetchProductsFromWP, getWPConfig } from './services/wordpressService';
import { DashboardStats, Order, InventoryProduct, Customer } from './types';

const INITIAL_ORDERS: Order[] = [
  {
    id: 'OYVu3fdO7m',
    timestamp: new Date('2025-09-04T05:56:00').getTime(),
    customer: {
      name: 'Demo Customer',
      email: 'customer@bdcommerce.app',
      phone: '01715494846',
      avatar: 'https://picsum.photos/seed/c1/100/100',
      orderCount: 1
    },
    address: 'Bangladesh Chittagong Av. Atlântica, 1702 Copacabana Rio de Janeiro - RJ, Brazil...',
    date: '4 Sept 2025, 5:56 AM',
    paymentMethod: 'COD',
    status: 'Shipping',
    subtotal: 164252,
    shippingCharge: 0,
    discount: 32552,
    total: 131700,
    statusHistory: {
      placed: '4 Sept 2025',
      packaging: '18 Nov 2025',
      shipping: '19 Nov 2025'
    },
    products: [
      { id: '1', name: 'Dyson V15 Detect Absolute Vacuum', brand: 'Canon', price: 160000, qty: 1, img: 'https://picsum.photos/seed/v1/100/100' },
      { id: '2', name: 'Logitech MX Master 3S Mouse', brand: 'Logitech', price: 1562, qty: 1, img: 'https://picsum.photos/seed/v2/100/100' }
    ]
  }
];

const DashboardContent: React.FC<{ 
  stats: DashboardStats; 
  loadingInsights: boolean; 
  aiInsights: string[];
  statusCounts: Record<string, number>;
  loadingData: boolean;
}> = ({ stats, loadingInsights, aiInsights, statusCounts, loadingData }) => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Net Profit" value={stats.netProfit.toLocaleString()} change={100} icon={<DollarSign size={20} />} />
      <StatCard title="Gross Profit" value={stats.grossProfit.toLocaleString()} change={100} icon={<Briefcase size={20} />} />
      <StatCard title="Total Expenses" value={stats.totalExpenses.toLocaleString()} change={0} icon={<CreditCard size={20} />} />
      <StatCard title="Total POS Sale" value={stats.totalPosSale.toLocaleString()} change={100} icon={<Receipt size={20} />} />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Online Sold" value={stats.onlineSold.toLocaleString()} change={0} icon={<ShoppingCart size={20} />} />
      <StatCard title="Orders" value={statusCounts['All'].toString()} change={-77.78} icon={<Truck size={20} />} />
      <StatCard title="Customers" value={stats.customers.toString()} change={-100} icon={<Users size={20} />} />
      <StatCard title="Total Products" value={stats.totalProducts.toString()} change={100} icon={<Package size={20} />} />
    </div>

    {loadingData && (
      <div className="flex items-center justify-center gap-2 p-4 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 animate-pulse">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm font-bold">Synchronizing with WordPress Store...</span>
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-gray-100 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Week Earnings</h3>
          <select className="text-[11px] border-none bg-gray-50 rounded px-2 py-1 outline-none">
            <option>Week</option>
          </select>
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
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    netProfit: 162808,
    grossProfit: 163308,
    totalExpenses: 500,
    totalPosSale: 156808,
    onlineSold: 25080,
    orders: INITIAL_ORDERS.length,
    customers: 1,
    totalProducts: 13
  });

  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Derive unique customers from orders
  const customers = useMemo(() => {
    const customerMap = new Map<string, Customer>();
    orders.forEach(o => {
      const existing = customerMap.get(o.customer.phone);
      if (existing) {
        existing.orderCount++;
      } else {
        customerMap.set(o.customer.phone, { ...o.customer, orderCount: 1 });
      }
    });
    return Array.from(customerMap.values());
  }, [orders]);

  useEffect(() => {
    const loadWPData = async () => {
      const config = getWPConfig();
      if (!config) return;

      setLoadingData(true);
      try {
        const [wpOrders, wpProducts] = await Promise.all([
          fetchOrdersFromWP(),
          fetchProductsFromWP()
        ]);
        
        const enrichedOrders = wpOrders.map(order => ({
          ...order,
          products: order.products.map(p => {
            const match = wpProducts.find(invP => invP.id === p.id);
            return match ? { ...p, img: match.img } : p;
          })
        }));

        setOrders(enrichedOrders);
        setProducts(wpProducts);
        
        const totalSales = wpOrders.reduce((acc, o) => acc + o.total, 0);
        setStats(prev => ({
          ...prev,
          totalPosSale: totalSales,
          netProfit: totalSales * 0.4,
          grossProfit: totalSales * 0.45,
          orders: wpOrders.length,
          customers: new Set(wpOrders.map(o => o.customer.email)).size,
          totalProducts: wpProducts.length
        }));
      } catch (err) {
        console.error("Auto-sync failed:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadWPData();
  }, []);

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
          />
        );
      case 'analytics':
        return <AnalyticsView />;
      case 'bulk-sms':
        return <BulkSMSView customers={customers} orders={orders} products={products} />;
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
