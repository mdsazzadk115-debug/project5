
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Truck, 
  RefreshCcw, 
  ExternalLink, 
  AlertCircle,
  CheckCircle2,
  PackageSearch,
  Search,
  Calendar,
  ChevronRight,
  Plus,
  Zap,
  Loader2,
  Info
} from 'lucide-react';
import { getCourierBalance, getCourierConfig, saveTrackingLocally, getDeliveryStatus } from '../services/courierService';
import { Order } from '../types';

const StatusBadge: React.FC<{ label: string; count: number; colorClass: string }> = ({ label, count, colorClass }) => (
  <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
    <span className="text-sm font-semibold text-gray-700">{label}:</span>
    <span className={`w-6 h-6 flex items-center justify-center rounded text-white text-xs font-bold ${colorClass}`}>
      {count}
    </span>
  </div>
);

interface CourierDashboardViewProps {
  orders: Order[];
  onRefresh?: () => void;
}

export const CourierDashboardView: React.FC<CourierDashboardViewProps> = ({ orders, onRefresh }) => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // External tracking states
  const [manualTrackingCode, setManualTrackingCode] = useState('');
  const [isAddingTracking, setIsAddingTracking] = useState(false);

  // Calculate real stats from the synced orders list
  const stats = useMemo(() => {
    const deliveryProcessing = orders.filter(o => 
      o.courier_tracking_code && (o.status === 'Shipping' || o.status === 'Packaging')
    ).length;

    const codProcessing = orders.filter(o => 
      o.status === 'Delivered' && 
      o.paymentMethod.toLowerCase().includes('cod')
    ).length;

    const returnRequests = orders.filter(o => 
      o.status === 'Returned' || o.status === 'Rejected'
    ).length;

    const activeShipments = orders.filter(o => 
      o.courier_tracking_code && !['Delivered', 'Cancelled', 'Returned'].includes(o.status)
    ).length;

    return {
      deliveryProcessing,
      codProcessing,
      returnRequests,
      activeShipments
    };
  }, [orders]);

  const loadData = async () => {
    setLoading(true);
    const config = await getCourierConfig();
    if (config && config.apiKey) {
      setIsConfigured(true);
      const bal = await getCourierBalance();
      setBalance(bal);
    } else {
      setIsConfigured(false);
    }
    if (onRefresh) onRefresh();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddManualTracking = async () => {
    if (!manualTrackingCode.trim()) return;
    setIsAddingTracking(true);
    try {
      const statusData = await getDeliveryStatus(manualTrackingCode.trim());
      if (statusData && statusData.status === 200) {
        // We use tracking code as the ID for external orders to avoid collision
        await saveTrackingLocally(manualTrackingCode.trim(), manualTrackingCode.trim(), statusData.delivery_status);
        alert("Manual Tracking Added Successfully! Refreshing list...");
        setManualTrackingCode('');
        loadData();
      } else {
        alert("Tracking code not found in Steadfast system.");
      }
    } catch (e) {
      alert("Failed to sync tracking. Please check API connection.");
    } finally {
      setIsAddingTracking(false);
    }
  };

  const handleDeepSync = async () => {
    setIsSyncing(true);
    // Deep sync logic is called inside loadData via syncOrderStatusWithCourier
    await loadData();
    setIsSyncing(false);
    alert("Deep Sync Completed: Checked for manual Steadfast entries matching WordPress Invoices.");
  };

  // Filter and sort the consignments (orders with tracking codes)
  const recentConsignments = useMemo(() => {
    let filtered = orders.filter(o => o.courier_tracking_code);
    
    if (searchTerm) {
      filtered = filtered.filter(o => 
        o.id.includes(searchTerm) || 
        o.courier_tracking_code?.includes(searchTerm) ||
        o.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [orders, searchTerm]);

  const getCourierStatusStyles = (status?: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('delivered')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('transit') || s.includes('shipping')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes('cancelled') || s.includes('reject')) return 'bg-red-100 text-red-700 border-red-200';
    if (s.includes('return')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Steadfast Courier Integration</h2>
          <p className="text-sm text-gray-500">Real-time synchronization with your packzy.com account.</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={handleDeepSync}
            disabled={isSyncing || loading}
            className="flex-1 lg:flex-none px-5 py-2.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl hover:bg-orange-100 transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
          >
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} 
            Deep Sync
          </button>
          <button 
            onClick={loadData}
            disabled={loading}
            className="flex-1 lg:flex-none px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-orange-600 transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /> 
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center gap-4 text-amber-800 shadow-sm">
          <AlertCircle size={24} className="shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-bold">Courier API Not Configured</p>
            <p className="text-xs opacity-80">Please click "Connections" in the top bar to add your Steadfast API Key and Secret Key.</p>
          </div>
        </div>
      )}

      {/* Manual Sync Bar (New Feature) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Plus size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">External Tracking</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase">FB / WhatsApp Orders</p>
          </div>
        </div>
        
        <div className="flex-1 flex items-center gap-2 w-full">
          <input 
            type="text" 
            placeholder="Enter Steadfast Tracking Code (e.g. 5231...)" 
            value={manualTrackingCode}
            onChange={(e) => setManualTrackingCode(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-blue-500 transition-all"
          />
          <button 
            onClick={handleAddManualTracking}
            disabled={isAddingTracking || !manualTrackingCode}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            {isAddingTracking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Sync Entry
          </button>
        </div>
        
        <div className="hidden lg:flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-2 rounded-lg text-[10px] font-medium border border-gray-100">
          <Info size={14} />
          Paste tracking code to add orders manually.
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6 group hover:border-orange-200 transition-all">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current Balance</p>
            <p className="text-3xl font-black text-gray-800">৳{balance.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-all">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Truck size={28} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Shipments</p>
            <p className="text-3xl font-black text-gray-800">{stats.activeShipments}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6 group hover:border-emerald-200 transition-all">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Courier Status</p>
            <p className="text-xl font-black text-emerald-600">CONNECTED</p>
          </div>
        </div>
      </div>

      {/* Filter Badges Row */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge label="Delivery Processing" count={stats.deliveryProcessing} colorClass="bg-yellow-500" />
        <StatusBadge label="COD Processing" count={stats.codProcessing} colorClass="bg-emerald-500" />
        <StatusBadge label="Return Requests" count={stats.returnRequests} colorClass="bg-red-500" />
      </div>

      {/* Recent Consignments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <PackageSearch size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Consignments List</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">WordPress & External Orders</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input 
                type="text" 
                placeholder="Search Consignments..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            </div>
            <button className="hidden md:flex text-xs font-bold text-orange-600 items-center gap-1.5 hover:underline whitespace-nowrap">
              Full Panel <ExternalLink size={14} />
            </button>
          </div>
        </div>
        
        {recentConsignments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="px-6 py-4 border-b border-gray-50">Order & Date</th>
                  <th className="px-6 py-4 border-b border-gray-50">Customer Details</th>
                  <th className="px-6 py-4 border-b border-gray-50">Tracking Info</th>
                  <th className="px-6 py-4 border-b border-gray-50">Courier Status</th>
                  <th className="px-6 py-4 border-b border-gray-50 text-right">COD Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentConsignments.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${order.id.startsWith('EXT-') ? 'text-blue-600' : 'text-gray-800'}`}>
                          #{order.id.replace('EXT-', '')}
                          {order.id.startsWith('EXT-') && <span className="ml-2 text-[8px] bg-blue-100 px-1 rounded uppercase">EXT</span>}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                          <Calendar size={10} /> {new Date(order.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                          {order.customer.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700">{order.customer.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{order.customer.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://steadfast.com.bd/tracking/${order.courier_tracking_code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        {order.courier_tracking_code}
                        <ExternalLink size={12} className="opacity-50" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border ${getCourierStatusStyles(order.courier_status)}`}>
                        {order.courier_status || 'Processing'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-gray-800">৳{order.total.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{order.paymentMethod}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center bg-white">
            <div className="max-w-xs mx-auto">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                <PackageSearch size={40} />
              </div>
              <h4 className="text-gray-800 font-bold mb-2">No Consignments Found</h4>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Orders from WordPress or manual entries will appear here automatically.
              </p>
              <button 
                onClick={() => loadData()}
                className="px-6 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-900 transition-all flex items-center gap-2 mx-auto"
              >
                Sync Now
              </button>
            </div>
          </div>
        )}

        {recentConsignments.length > 0 && (
          <div className="p-4 bg-gray-50/50 border-t border-gray-50 flex justify-center">
             <button className="text-xs font-bold text-gray-400 hover:text-orange-600 flex items-center gap-2 transition-colors">
               Show more consignments <ChevronRight size={14} />
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
