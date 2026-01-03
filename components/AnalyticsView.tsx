
import React, { useState, useMemo } from 'react';
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
import { Order, DashboardStats } from '../types';

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

interface AnalyticsViewProps {
  orders: Order[];
  stats: DashboardStats;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ orders, stats }) => {
  // Use last 7 days as default range if possible, or current day
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({
    start: lastWeekStr,
    end: today
  });

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  }, [orders, dateRange]);

  const analyticsData = useMemo(() => {
    const totalPosSale = filteredOrders.reduce((acc, o) => acc + o.total, 0);
    const expenses = filteredOrders.length * 5;
    const netProfit = totalPosSale - expenses; // New Logic: Profit = Total Sale - Expenses
    const grossProfit = totalPosSale * 0.45;

    // Grouping by Day of Week for chart
    const dayMap: Record<string, number> = {
      'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
    };
    
    filteredOrders.forEach(o => {
      const dayName = new Date(o.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      if (dayMap[dayName] !== undefined) {
        dayMap[dayName] += o.total;
      }
    });

    const chartData = Object.entries(dayMap).map(([name, value]) => ({ name, value }));

    // Status Percentages
    const totalCount = filteredOrders.length || 1;
    const getStatusCount = (s: Order['status']) => filteredOrders.filter(o => o.status === s).length;
    
    return {
      netProfit,
      grossProfit,
      expenses,
      posSale: totalPosSale,
      chartData,
      statusPercentages: {
        delivered: Math.round((getStatusCount('Delivered') / totalCount) * 100),
        shipping: Math.round((getStatusCount('Shipping') / totalCount) * 100),
        cancelled: Math.round((getStatusCount('Cancelled') / totalCount) * 100),
        returned: Math.round((getStatusCount('Returned') / totalCount) * 100)
      }
    };
  }, [filteredOrders]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Profit" 
          value={analyticsData.netProfit.toLocaleString()} 
          change={100} 
          icon={<DollarSign size={20} />} 
        />
        <StatCard 
          title="Total Expenses" 
          value={analyticsData.expenses.toLocaleString()} 
          change={0} 
          icon={<CreditCard size={20} />} 
        />
        <StatCard 
          title="Total Sale" 
          value={analyticsData.posSale.toLocaleString()} 
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
            <SellingStatistics data={analyticsData.chartData} />
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
            percentage={`${analyticsData.statusPercentages.delivered}% of orders`} 
            count={analyticsData.statusPercentages.delivered}
            icon={<Package size={20} />} 
            iconBg="bg-green-50" 
            iconColor="text-green-600" 
          />
          <StatusTrackingCard 
            label="Shipping" 
            percentage={`${analyticsData.statusPercentages.shipping}% of orders`} 
            count={analyticsData.statusPercentages.shipping}
            icon={<Truck size={20} />} 
            iconBg="bg-blue-50" 
            iconColor="text-blue-500" 
          />
          <StatusTrackingCard 
            label="Cancelled" 
            percentage={`${analyticsData.statusPercentages.cancelled}% of orders`} 
            count={analyticsData.statusPercentages.cancelled}
            icon={<XCircle size={20} />} 
            iconBg="bg-red-50" 
            iconColor="text-red-500" 
          />
          <StatusTrackingCard 
            label="Returned" 
            percentage={`${analyticsData.statusPercentages.returned}% of orders`} 
            count={analyticsData.statusPercentages.returned}
            icon={<RotateCcw size={20} />} 
            iconBg="bg-orange-50" 
            iconColor="text-orange-500" 
          />
        </div>
      </div>
    </div>
  );
};
