
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Users, 
  ShoppingBag, 
  Phone, 
  Mail, 
  MoreVertical, 
  MessageSquare,
  ChevronRight,
  User,
  Filter
} from 'lucide-react';
import { Customer } from '../types';

interface CustomerListViewProps {
  customers: Customer[];
  onNavigateToSMS: (phone: string) => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({ customers, onNavigateToSMS }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => b.orderCount - a.orderCount);
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Customer Management</h2>
          <p className="text-sm text-gray-500">View and manage your loyal customers from one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Customers</p>
              <p className="text-xl font-bold text-gray-800">{customers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Search by name, phone or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10 transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-orange-600 transition-all flex items-center justify-center gap-2 text-sm font-medium">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Total Orders</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCustomers.length > 0 ? filteredCustomers.map((customer, idx) => (
                <tr key={idx} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={customer.avatar} 
                          alt={customer.name} 
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors">{customer.name}</p>
                        <p className="text-[10px] text-orange-500 font-bold uppercase tracking-tighter">Gold Member</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <Phone size={12} className="text-gray-400" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <Mail size={12} />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
                      <ShoppingBag size={12} />
                      {customer.orderCount}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">
                      {customer.address || 'No address provided'}
                    </p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onNavigateToSMS(customer.phone)}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        title="Send SMS"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <User size={48} className="mb-4 text-gray-300" />
                      <p className="text-sm font-bold text-gray-500 italic">No customers found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
