
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
  Store,
  Map
} from 'lucide-react';
import { 
  getCourierBalance, 
  getCourierConfig, 
  getPathaoConfig,
  saveTrackingLocally, 
  getDeliveryStatus, 
  createManualCourierOrder,
  fetchPathaoCities,
  fetchPathaoZones,
  fetchPathaoAreas,
  fetchPathaoStores
} from '../services/courierService';
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

  // Manual Creation States
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'steadfast' | 'pathao'>('steadfast');

  // Pathao Data States
  const [cities, setCities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    address: '',
    amount: '',
    note: '',
    city_id: '',
    zone_id: '',
    area_id: '',
    store_id: ''
  });

  const loadData = async () => {
    setLoading(true);
    const sfConfig = await getCourierConfig();
    const phConfig = await getPathaoConfig();
    setIsConfigured(!!(sfConfig?.apiKey || phConfig?.clientId));
    
    if (sfConfig?.apiKey) {
      const bal = await getCourierBalance();
      setBalance(bal);
    }
    if (onRefresh) onRefresh();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch Pathao locations when provider is Pathao and modal opens
  useEffect(() => {
    if (isManualModalOpen && selectedProvider === 'pathao') {
      const loadPathaoLocs = async () => {
        setLoadingLocations(true);
        const [cityList, storeList] = await Promise.all([fetchPathaoCities(), fetchPathaoStores()]);
        setCities(cityList);
        setStores(storeList);
        if (storeList.length > 0) setManualForm(prev => ({ ...prev, store_id: storeList[0].store_id }));
        setLoadingLocations(false);
      };
      loadPathaoLocs();
    }
  }, [isManualModalOpen, selectedProvider]);

  // Handle City Change -> Fetch Zones
  const handleCityChange = async (cityId: string) => {
    setManualForm({ ...manualForm, city_id: cityId, zone_id: '', area_id: '' });
    setZones([]);
    setAreas([]);
    if (!cityId) return;
    setLoadingLocations(true);
    const zoneList = await fetchPathaoZones(parseInt(cityId));
    setZones(zoneList);
    setLoadingLocations(false);
  };

  // Handle Zone Change -> Fetch Areas
  const handleZoneChange = async (zoneId: string) => {
    setManualForm({ ...manualForm, zone_id: zoneId, area_id: '' });
    setAreas([]);
    if (!zoneId) return;
    setLoadingLocations(true);
    const areaList = await fetchPathaoAreas(parseInt(zoneId));
    setAreas(areaList);
    setLoadingLocations(false);
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.phone || !manualForm.address || !manualForm.amount) {
      alert("Please fill all required fields.");
      return;
    }
    if (selectedProvider === 'pathao' && (!manualForm.city_id || !manualForm.zone_id || !manualForm.store_id)) {
      alert("City, Zone and Store are required for Pathao.");
      return;
    }

    setIsCreatingOrder(true);
    try {
      const result = await createManualCourierOrder(manualForm, selectedProvider);
      if (result.status === 200 || result.code === 200) {
        alert("Order Created Successfully!");
        setIsManualModalOpen(false);
        setManualForm({ name: '', phone: '', address: '', amount: '', note: '', city_id: '', zone_id: '', area_id: '', store_id: '' });
        loadData();
      } else {
        alert("Error: " + (result.message || "Failed to create order"));
      }
    } catch (err: any) {
      alert("Creation Failed: " + err.message);
    } finally {
      setIsCreatingOrder(false);
    }
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Courier Management</h2>
          <p className="text-sm text-gray-500">Connected to Steadfast & Pathao</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsManualModalOpen(true)} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all flex items-center gap-2 text-sm font-bold shadow-lg">
            <Plus size={18} /> Create Consignment
          </button>
          <button onClick={loadData} className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-orange-600 transition-all flex items-center gap-2 text-sm font-bold shadow-sm">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Manual Creation Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Create New Consignment</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Manual Order Entry</p>
              </div>
              <button onClick={() => setIsManualModalOpen(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateManualOrder} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Provider Selection */}
              <div className="flex p-1 bg-gray-100 rounded-2xl gap-1">
                <button type="button" onClick={() => setSelectedProvider('steadfast')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${selectedProvider === 'steadfast' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>
                  Steadfast Courier
                </button>
                <button type="button" onClick={() => setSelectedProvider('pathao')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${selectedProvider === 'pathao' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                  Pathao Courier
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><User size={12} /> Recipient Name *</label>
                  <input required type="text" placeholder="Customer Name" value={manualForm.name} onChange={(e) => setManualForm({...manualForm, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><Phone size={12} /> Phone Number *</label>
                  <input required type="tel" placeholder="017xxxxxxxx" value={manualForm.phone} onChange={(e) => setManualForm({...manualForm, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono" />
                </div>
              </div>

              {selectedProvider === 'pathao' && (
                <div className="space-y-6 border-y border-gray-100 py-6 bg-blue-50/20 -mx-8 px-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2"><Store size={12} /> Pickup Store *</label>
                      <select required value={manualForm.store_id} onChange={(e) => setManualForm({...manualForm, store_id: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:border-blue-500">
                        {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2"><MapPin size={12} /> Recipient City *</label>
                      <select required value={manualForm.city_id} onChange={(e) => handleCityChange(e.target.value)} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:border-blue-500">
                        <option value="">Select City</option>
                        {cities.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2"><Map size={12} /> Recipient Zone *</label>
                      <select required disabled={!manualForm.city_id || loadingLocations} value={manualForm.zone_id} onChange={(e) => handleZoneChange(e.target.value)} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:border-blue-500 disabled:opacity-50">
                        <option value="">Select Zone</option>
                        {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2">Area (Optional)</label>
                      <select disabled={!manualForm.zone_id || loadingLocations} value={manualForm.area_id} onChange={(e) => setManualForm({...manualForm, area_id: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm outline-none focus:border-blue-500 disabled:opacity-50">
                        <option value="">Select Area</option>
                        {areas.map(a => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
                      </select>
                    </div>
                  </div>
                  {loadingLocations && <div className="text-[10px] text-blue-500 font-bold flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Fetching location details from Pathao...</div>}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><MapPin size={12} /> Full Address *</label>
                <textarea required placeholder="Detailed address" value={manualForm.address} onChange={(e) => setManualForm({...manualForm, address: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm h-20 resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><CircleDollarSign size={12} /> COD Amount *</label>
                  <input required type="number" value={manualForm.amount} onChange={(e) => setManualForm({...manualForm, amount: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><FileText size={12} /> Notes</label>
                  <input type="text" value={manualForm.note} onChange={(e) => setManualForm({...manualForm, note: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="pt-4 flex gap-4 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl">Cancel</button>
                <button type="submit" disabled={isCreatingOrder} className={`flex-[2] py-4 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 ${selectedProvider === 'pathao' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                  {isCreatingOrder ? <Loader2 size={20} className="animate-spin" /> : <Truck size={20} />}
                  Submit to {selectedProvider === 'pathao' ? 'Pathao' : 'Steadfast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consignments List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/30">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><PackageSearch size={20} /></div>
             <div><h3 className="font-bold text-gray-800">Consignments List</h3><p className="text-[10px] text-gray-400 font-bold uppercase">All Providers</p></div>
          </div>
          <div className="relative md:w-64"><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500" /><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /></div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white text-[10px] uppercase font-bold text-gray-400 tracking-wider"><th className="px-6 py-4">Order & Provider</th><th className="px-6 py-4">Customer Details</th><th className="px-6 py-4">Tracking Info</th><th className="px-6 py-4 text-right">COD Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentConsignments.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800">#{order.id.slice(-6)}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded w-fit mt-1 ${order.id.includes('PTH') || order.courier_provider === 'pathao' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        {order.id.includes('PTH') || order.courier_provider === 'pathao' ? 'Pathao' : 'Steadfast'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-xs font-bold text-gray-700">{order.customer.name}</span><br/><span className="text-[10px] text-gray-400 font-mono">{order.customer.phone}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold text-blue-600">{order.courier_tracking_code}</span>
                      <span className="text-[10px] font-bold uppercase text-gray-400">{order.courier_status || 'Syncing...'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right"><span className="text-sm font-black text-gray-800">৳{order.total.toLocaleString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
