
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Send, 
  Wand2, 
  Users, 
  CheckCircle2, 
  Loader2,
  MessageSquare,
  Layers,
  Package,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { Customer, Order, InventoryProduct } from '../types';
import { generateSMSTemplate } from '../services/smsService';

interface BulkSMSViewProps {
  customers: Customer[];
  orders: Order[];
  products: InventoryProduct[];
}

export const BulkSMSView: React.FC<BulkSMSViewProps> = ({ customers, orders, products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<{ phone: string; status: 'sent' | 'failed' }[]>([]);

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Get products filtered by current category selection
  const filteredProductsByCat = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  // Filtering Logic for Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // 1. Text Search Filter
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        customer.phone.includes(searchTerm);

      if (!matchesSearch) return false;

      // 2. Category / Product Purchase History Filter
      const customerOrders = orders.filter(o => o.customer.phone === customer.phone);
      
      // If filtering by specific product
      if (selectedProduct !== 'All') {
        const hasBoughtProduct = customerOrders.some(order => 
          order.products.some(p => p.id === selectedProduct || p.name === selectedProduct)
        );
        if (!hasBoughtProduct) return false;
      } 
      // Else if filtering by specific category
      else if (selectedCategory !== 'All') {
        const hasBoughtInCategory = customerOrders.some(order => 
          order.products.some(orderProd => {
            const productInfo = products.find(p => p.id === orderProd.id || p.name === orderProd.name);
            return productInfo?.category === selectedCategory;
          })
        );
        if (!hasBoughtInCategory) return false;
      }

      return true;
    });
  }, [customers, searchTerm, selectedCategory, selectedProduct, orders, products]);

  const toggleSelectAll = () => {
    if (selectedPhones.size === filteredCustomers.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(filteredCustomers.map(c => c.phone)));
    }
  };

  const toggleSelectCustomer = (phone: string) => {
    const newSet = new Set(selectedPhones);
    if (newSet.has(phone)) {
      newSet.delete(phone);
    } else {
      newSet.add(phone);
    }
    setSelectedPhones(newSet);
  };

  const handleGenerateAI = async (purpose: string) => {
    setIsGenerating(true);
    const text = await generateSMSTemplate(purpose, "bdcommerce");
    setMessage(text);
    setIsGenerating(false);
  };

  const handleSendSMS = async () => {
    if (selectedPhones.size === 0 || !message.trim()) return;

    setIsSending(true);
    setSendLogs([]);
    
    const phones = Array.from(selectedPhones);
    for (const phone of phones) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setSendLogs(prev => [...prev, { phone, status: 'sent' }]);
    }
    
    setIsSending(false);
    alert(`${selectedPhones.size} messages sent successfully!`);
    setSelectedPhones(new Set());
    setMessage('');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedProduct('All');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bulk SMS System</h2>
          <p className="text-sm text-gray-500">Reach your customers instantly with personalized SMS.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-orange-50 rounded-lg border border-orange-100 flex items-center gap-2">
            <Users size={16} className="text-orange-600" />
            <span className="text-sm font-bold text-orange-600">{selectedPhones.size} Selected</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customer Selection */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
          {/* Filtering Section */}
          <div className="p-4 border-b border-gray-50 bg-gray-50/30 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <input 
                  type="text" 
                  placeholder="Search name or phone..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <select 
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedProduct('All'); // Reset product when category changes
                  }}
                  className="appearance-none pl-9 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white hover:border-orange-500 transition-colors focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'Select Category' : cat}</option>
                  ))}
                </select>
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>

              {/* Product Filter */}
              <div className="relative">
                <select 
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="appearance-none pl-9 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white hover:border-orange-500 transition-colors focus:outline-none max-w-[180px]"
                >
                  <option value="All">Select Product</option>
                  {filteredProductsByCat.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>

              <button 
                onClick={resetFilters}
                className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Reset Filters"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Found {filteredCustomers.length} Customers
              </span>
              <button 
                onClick={toggleSelectAll}
                className="text-xs font-bold text-orange-600 hover:bg-orange-50 px-3 py-1 rounded-lg transition-colors"
              >
                {selectedPhones.size === filteredCustomers.length && filteredCustomers.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">Selected</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">Customer</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">Phone</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map((c) => (
                  <tr 
                    key={c.phone} 
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedPhones.has(c.phone) ? 'bg-orange-50/30' : ''}`}
                    onClick={() => toggleSelectCustomer(c.phone)}
                  >
                    <td className="px-6 py-4">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedPhones.has(c.phone) ? 'bg-orange-500 border-orange-500' : 'border-gray-200 bg-white'}`}>
                        {selectedPhones.has(c.phone) && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full border border-gray-100" />
                        <span className="text-sm font-medium text-gray-700">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.phone}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-400">{c.orderCount} Orders</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCustomers.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <Users className="mx-auto text-gray-200" size={48} />
                <p className="text-sm text-gray-400">No customers found matching these filters.</p>
                <button onClick={resetFilters} className="text-xs text-orange-600 font-bold hover:underline">Reset Filters</button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Message Composer */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare size={16} className="text-orange-500" /> Compose Message
              </h3>
              <span className={`text-[10px] font-bold ${message.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                {message.length} / 160 Characters
              </span>
            </div>

            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full h-40 p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500 resize-none"
            />

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Assistance (Draft with Gemini)</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  disabled={isGenerating}
                  onClick={() => handleGenerateAI("Seasonal 50% Discount Sale Invitation")}
                  className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-semibold border border-orange-100 hover:bg-orange-100 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wand2 size={12} /> Discount Sale
                </button>
                <button 
                  disabled={isGenerating}
                  onClick={() => handleGenerateAI("New Product Collection Arrival Notification")}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold border border-blue-100 hover:bg-blue-100 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wand2 size={12} /> New Arrival
                </button>
                <button 
                  disabled={isGenerating}
                  onClick={() => handleGenerateAI("Customer Loyalty Appreciation Message")}
                  className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-semibold border border-purple-100 hover:bg-purple-100 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wand2 size={12} /> Loyalty Greet
                </button>
              </div>
            </div>

            <button 
              disabled={isSending || selectedPhones.size === 0 || !message.trim()}
              onClick={handleSendSMS}
              className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              {isSending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending to {selectedPhones.size} Contacts...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send SMS Now
                </>
              )}
            </button>
          </div>

          {/* Sending Status Log */}
          {sendLogs.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Send Progress</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {sendLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 text-xs">
                    <span className="text-gray-500 font-medium">{log.phone}</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-green-500" />
                      <span className="text-green-600 font-bold uppercase">Sent</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
