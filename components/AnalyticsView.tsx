
import React, { useState, useEffect } from 'react';
import { StatCard } from './StatCard';
import { SellingStatistics } from './Charts';
import { 
  DollarSign, 
  Briefcase, 
  CreditCard, 
  Receipt,
  Calendar,
  Package,
  Truck,
  XCircle,
  RotateCcw
} from 'lucide-react';

const StatusTrackingCard: React.FC<{ 
  label: string; 
  percentage: string; 
  count: number;
  icon: React.ReactNode; 
  iconBg: string; 
  iconColor: string;
}> = ({ label, percentage, count, icon, iconBg, iconColor }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 flex items-center justify-between group hover:shadow-sm transition-all duration-300">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 ${iconBg} ${iconColor} rounded-full flex items-center justify-center transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-gray-800 text-sm mb-1">{label}</h4>
        <p className="text-xs font-bold text-green-500">{percentage}</p>
      </div>
    </div>
    <div className="w-12 h-12 rounded-full border-2 border-gray-100 flex items-center justify-center relative">
      <span className="text-[10px] font-bold text-gray-800">{count}%</span>
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke="currentColor"
          strokeWidth="2"
          fill="transparent"
          className="text-gray-100"
        />
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke="currentColor"
          strokeWidth="2"
          fill="transparent"
          strokeDasharray={138.23}
          strokeDashoffset={138.23 - (138.23 * count) / 100}
          className={iconColor}
        />
      </svg>
    </div>
  </div>
);

export const AnalyticsView: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    start: '2025-12-23',
    end: '2025-12-23'
  });

  const [dynamicData, setDynamicData] = useState({
    netProfit: 162808,
    grossProfit: 163308,
    expenses: 500,
    posSale: 156808,
    chartData: [
      { name: 'Mon', value: 2400 },
      { name: 'Tue', value: 1398 },
      { name: 'Wed', value: 9800 },
      { name: 'Thu', value: 3908 },
      { name: 'Fri', value: 4800 },
      { name: 'Sat', value: 3800 },
      { name: 'Sun', value: 4300 },
    ],
    statusCounts: {
      delivered: 65,
      shipping: 15,
      cancelled: 5,
      returned: 15
    }
  });

  const [loading, setLoading] = useState(false);

  // Function to simulate fetching/generating dynamic data
  useEffect(() => {
    setLoading(true);
    // Simulate a small delay for "loading" effect
    const timer = setTimeout(() => {
      const randomMultiplier = Math.random() * 0.5 + 0.75; // 0.75 to 1.25
      
      setDynamicData({
        netProfit: Math.floor(162808 * randomMultiplier),
        grossProfit: Math.floor(163308 * randomMultiplier),
        expenses: Math.floor(500 * (Math.random() * 2)),
        posSale: Math.floor(156808 * randomMultiplier),
        chartData: [
          { name: 'Mon', value: Math.floor(Math.random() * 5000 + 1000) },
          { name: 'Tue', value: Math.floor(Math.random() * 5000 + 1000) },
          { name: 'Wed', value: Math.floor(Math.random() * 10000 + 2000) },
          { name: 'Thu', value: Math.floor(Math.random() * 5000 + 1000) },
          { name: 'Fri', value: Math.floor(Math.random() * 6000 + 1000) },
          { name: 'Sat', value: Math.floor(Math.random() * 4000 + 1000) },
          { name: 'Sun', value: Math.floor(Math.random() * 5000 + 1000) },
        ],
        statusCounts: {
          delivered: Math.floor(Math.random() * 40 + 50),
          shipping: Math.floor(Math.random() * 20 + 10),
          cancelled: Math.floor(Math.random() * 10),
          returned: Math.floor(Math.random() * 15)
        }
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [dateRange]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      {/* Top Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Net Profit" 
          value={dynamicData.netProfit.toLocaleString()} 
          change={100} 
          icon={<DollarSign size={20} />} 
        />
        <StatCard 
          title="Gross Profit" 
          value={dynamicData.grossProfit.toLocaleString()} 
          change={100} 
          icon={<Briefcase size={20} />} 
        />
        <StatCard 
          title="Total Expenses" 
          value={dynamicData.expenses.toLocaleString()} 
          change={0} 
          icon={<CreditCard size={20} />} 
        />
        <StatCard 
          title="Total POS Sale" 
          value={dynamicData.posSale.toLocaleString()} 
          change={100} 
          icon={<Receipt size={20} />} 
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Selling Statistics Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-800">Selling Statistics</h3>
            
            {/* Interactive Date Picker Container */}
            <div className="flex items-center gap-2 relative group">
              <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-100 rounded text-xs font-medium text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden">
                <span>{formatDate(dateRange.start)} - {formatDate(dateRange.end)}</span>
                <input 
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div className="p-1.5 border border-gray-100 rounded text-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden">
                <Calendar size={14} />
                <input 
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>
          
          <div className="flex-1 h-[400px]">
            <SellingStatistics data={dynamicData.chartData} />
          </div>

          {/* Chart Legend */}
          <div className="flex justify-center items-center gap-6 mt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
              <span className="text-xs text-gray-500 font-medium">Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
              <span className="text-xs text-gray-500 font-medium">Delivered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-orange-400"></div>
                <div className="w-1 h-1 rounded-full bg-orange-400 absolute"></div>
              </div>
              <span className="text-xs text-gray-500 font-medium">Returned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-500 font-medium">Cancelled</span>
            </div>
          </div>
        </div>

        {/* Right: Order Status Tracking */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <StatusTrackingCard 
            label="Delivered" 
            percentage="0.00%" 
            count={dynamicData.statusCounts.delivered}
            icon={<Package size={20} />} 
            iconBg="bg-green-50" 
            iconColor="text-green-600" 
          />
          <StatusTrackingCard 
            label="Shipping" 
            percentage="0.00%" 
            count={dynamicData.statusCounts.shipping}
            icon={<Truck size={20} />} 
            iconBg="bg-blue-50" 
            iconColor="text-blue-500" 
          />
          <StatusTrackingCard 
            label="Cancelled" 
            percentage="0.00%" 
            count={dynamicData.statusCounts.cancelled}
            icon={<XCircle size={20} />} 
            iconBg="bg-red-50" 
            iconColor="text-red-500" 
          />
          <StatusTrackingCard 
            label="Returned" 
            percentage="0.00%" 
            count={dynamicData.statusCounts.returned}
            icon={<RotateCcw size={20} />} 
            iconBg="bg-orange-50" 
            iconColor="text-orange-500" 
          />
        </div>
      </div>
    </div>
  );
};
