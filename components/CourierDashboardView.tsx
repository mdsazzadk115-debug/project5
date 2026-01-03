
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
  Info,
  X,
  User,
  Phone,
  MapPin,
  CircleDollarSign,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { 
  getCourierBalance, 
  getCourierConfig, 
  saveTrackingLocally, 
  getDeliveryStatus,
  identifyCourierByTrackingCode
} from '../services/courierService';
import { getPathaoConfig, checkPathaoConnection } from '../services/pathaoService';
import { Order } from '../types';

type CourierType = 'Steadfast' | 'Pathao';

export const CourierDashboardView: React.FC<{ orders: Order[]; onRefresh?: () => void }> = ({ orders, onRefresh }) => {
  const [activeCourier, setActiveCourier] = useState<CourierType>('Steadfast');
  const [balance, setBalance] = useState<number>(0);
  const [isApiActive, setIsApiActive] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const loadData = async () => {
    setLoading(true);
    setConnectionError(null);
    
    if (activeCourier === 'Steadfast') {
      const config = await getCourierConfig();
      if (config && config.apiKey) {
        setIsConfigured(true);
        try {
          const bal = await getCourierBalance();
          setBalance(bal);
          setIsApiActive(true);
        } catch (e: any) {
          setIsApiActive(false);
          setConnectionError("Steadfast API key is invalid or unauthorized.");
        }
      } else {
        setIsConfigured(false);
        setIsApiActive(false);
      }
    } else {
      const config = await getPathaoConfig();
      if (config && config.clientId && config.clientSecret) {
        setIsConfigured(true);
        const diagnostic = await checkPathaoConnection();
        setIsApiActive(diagnostic.success);
        if (!diagnostic.success) {
          setConnectionError(diagnostic.message);
        }
        setBalance(0); 
      } else {
        setIsConfigured(false);
        setIsApiActive(false);
      }
    }
    if (onRefresh) onRefresh();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeCourier]);

  const stats = useMemo(() => {
    const courierOrders = orders.filter(o => {
      if (o.courier_name) return o.courier_name === activeCourier;
      if (o.courier_tracking_code) return identifyCourierByTrackingCode(o.courier_tracking_code) === activeCourier;
      return false;
    });
    
    const activeShipments = courierOrders.filter(o => 
      o.courier_tracking_code && !['Delivered', 'Cancelled', 'Returned'].includes(o.status)
    ).length;
    return { activeShipments };
  }, [orders, activeCourier]);

  const recentConsignments = useMemo(() => {
    let filtered = orders.filter(o => {
      if (!o.courier_tracking_code) return false;
      
      // 1. If courier_name exists, strictly filter by it
      if (o.courier_name) return o.courier_name === activeCourier;
      
      // 2. If courier_name is missing, use smart detection as fallback
      const detected = identifyCourierByTrackingCode(o.courier_tracking_code);
      return detected === activeCourier;
    });
    
    if (searchTerm) {
      filtered = filtered.filter(o => 
        o.id.includes(searchTerm) || 
        o.courier_tracking_code?.includes(searchTerm) ||
        o.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [orders, searchTerm, activeCourier]);

  const getStatusStyles = (status?: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('delivered')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('transit') || s.includes('shipping') || s.includes('picked')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes('cancelled') || s.includes('reject')) return 'bg-red-100 text-red-700 border-red-200';
    if (s.includes('return')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const themeText = activeCourier === 'Steadfast' ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex p-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button 
          onClick={() => setActiveCourier('Steadfast')}
          className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeCourier === 'Steadfast' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Truck size={18} /> Steadfast
        </button>
        <button 
          onClick={() => setActiveCourier('Pathao')}
          className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeCourier === 'Pathao' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Truck size={18} /> Pathao
        </button>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{activeCourier} Courier Dashboard</h2>
          <p className="text-sm text-gray-500">Manage your consignments for {activeCourier}.</p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            disabled={loading}
            onClick={loadData}
            className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-orange-600 transition-all flex items-center gap-2 text-sm font-bold shadow-sm"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-center gap-4 text-amber-800 shadow-sm">
          <AlertCircle size={24} className="shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-bold">{activeCourier} Not Configured</p>
            <p className="text-xs opacity-80">Check Settings (Gear Icon) to add your {activeCourier} API credentials.</p>
          </div>
        </div>
      )}

      {connectionError && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700 shadow-sm animate-in slide-in-from-top-2">
          <AlertTriangle size={20} className="shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-tight">Connection Problem Detected</p>
            <p className="text-xs opacity-90">{connectionError}</p>
          </div>
          <button onClick={loadData} className="text-[10px] font-bold underline uppercase">Try Again</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6 group hover:border-orange-200 transition-all">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${activeCourier === 'Steadfast' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              {activeCourier === 'Steadfast' ? 'Current Balance' : 'Account Status'}
            </p>
            <p className="text-3xl font-black text-gray-800">
              {activeCourier === 'Steadfast' ? `৳${balance.toLocaleString()}` : (isApiActive ? 'ACTIVE' : 'OFFLINE')}
            </p>
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
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${isApiActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Connection</p>
            <p className={`text-xl font-black uppercase ${isApiActive ? 'text-emerald-600' : 'text-red-500'}`}>
              {isApiActive ? 'CONNECTED' : 'DISCONNECTED'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${themeText} ${activeCourier === 'Steadfast' ? 'bg-orange-100' : 'bg-red-100'}`}>
              <PackageSearch size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{activeCourier} Consignments</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Showing orders filtered for {activeCourier}</p>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
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
                        <span className="text-sm font-bold text-gray-800">#{order.id.slice(-6)}</span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                          <Calendar size={10} /> {new Date(order.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">{order.customer.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{order.customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${activeCourier === 'Steadfast' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                        {order.courier_tracking_code}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border ${getStatusStyles(order.courier_status)}`}>
                        {order.courier_status || 'Processing'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-gray-800">৳{order.total.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <p className="text-gray-400 text-sm">No {activeCourier} consignments found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
