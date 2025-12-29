
import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Truck, 
  RefreshCcw, 
  ExternalLink, 
  AlertCircle,
  CheckCircle2,
  PackageSearch
} from 'lucide-react';
import { getCourierBalance, getCourierConfig } from '../services/courierService';

export const CourierDashboardView: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

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
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Steadfast Courier Integration</h2>
          <p className="text-sm text-gray-500">Manage your shipments and track delivery performance.</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-orange-600 transition-all flex items-center gap-2 text-sm font-medium"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </div>

      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl flex items-center gap-4 text-amber-800">
          <AlertCircle size={24} className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Courier API Not Configured</p>
            <p className="text-xs opacity-80">Go to Settings (WP Connect icon in TopBar) and add your Steadfast API credentials.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
            <Wallet size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-gray-800">৳{balance.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Truck size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Shipments</p>
            <p className="text-3xl font-bold text-gray-800">0</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Success Rate</p>
            <p className="text-3xl font-bold text-gray-800">100%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <PackageSearch size={18} className="text-orange-600" /> Recent Consignments
          </h3>
          <button className="text-xs font-bold text-orange-600 flex items-center gap-1 hover:underline">
            View All in Steadfast <ExternalLink size={14} />
          </button>
        </div>
        <div className="p-12 text-center text-gray-400 italic">
          <Truck size={48} className="mx-auto mb-4 opacity-10" />
          No recent shipments found. Create a consignment from the Order Detail page.
        </div>
      </div>
    </div>
  );
};
