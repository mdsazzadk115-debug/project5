import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  RotateCcw,
  Settings,
  X,
  AlertCircle,
  Hash,
  ClipboardList,
  UserPlus,
  Plus,
  FileText,
  Trash2,
  User
} from 'lucide-react';
import { Customer, Order, InventoryProduct, Product } from '../types';
import { 
  generateSMSTemplate, 
  getSMSConfig, 
  saveSMSConfig, 
  SMSConfig, 
  sendActualSMS,
  getCustomTemplates,
  saveCustomTemplates,
  SMSTemplate
} from '../services/smsService';

interface BulkSMSViewProps {
  customers: Customer[];
  orders: Order[];
  products: InventoryProduct[];
}

export const BulkSMSView: React.FC<BulkSMSViewProps> = ({ customers, orders, products }) => {
  const [activeTab, setActiveTab] = useState<'database' | 'manual'>('database');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [selectedOrderCount, setSelectedOrderCount] = useState<string>('All');
  
  // Selection states
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set<string>());
  
  // Manual Import states
  const [manualInput, setManualInput] = useState('');
  const [manualParsedNumbers, setManualParsedNumbers] = useState<string[]>([]);
  
  // Template states
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });

  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<{ phone: string; status: 'sent' | 'failed' }[]>([]);
  
  // API Config State
  const [showConfig, setShowConfig] = useState(false);
  const [smsConfig, setSmsConfig] = useState<SMSConfig>({ endpoint: '', apiKey: '', senderId: '' });

  const messageAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [savedConfig, savedTemplates] = await Promise.all([
        getSMSConfig(),
        getCustomTemplates()
      ]);
      if (savedConfig) setSmsConfig(savedConfig);
      if (savedTemplates) setTemplates(savedTemplates);
    };
    loadData();
  }, []);

  // Parse manual input whenever it changes
  useEffect(() => {
    const numbers = manualInput
      .split(/[\n,]+/)
      .map(n => n.trim().replace(/[^\d+]/g, ''))
      .filter(n => n.length >= 10); 
    
    const uniqueNumbers = Array.from(new Set(numbers));
    setManualParsedNumbers(uniqueNumbers);
  }, [manualInput]);

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

  // Filtering Logic for Database Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        customer.phone.includes(searchTerm);

      if (!matchesSearch) return false;

      // Filter by Order Count
      if (selectedOrderCount !== 'All') {
        if (selectedOrderCount === '4+') {
          if (customer.orderCount < 4) return false;
        } else {
          if (customer.orderCount !== parseInt(selectedOrderCount as string)) return false;
        }
      }

      const customerOrders = orders.filter(o => o.customer.phone === customer.phone);
      
      if (selectedProduct !== 'All') {
        const hasBoughtProduct = customerOrders.some(order => 
          order.products.some(p => p.id === selectedProduct || p.name === selectedProduct)
        );
        if (!hasBoughtProduct) return false;
      } 
      else if (selectedCategory !== 'All') {
        const hasBoughtInCategory = customerOrders.some(order => 
          order.products.some((orderProd: Product) => {
            const productInfo = products.find(p => (orderProd.id && p.id === orderProd.id) || p.name === orderProd.name);
            return productInfo?.category === selectedCategory;
          })
        );
        if (!hasBoughtInCategory) return false;
      }

      return true;
    });
  }, [customers, searchTerm, selectedCategory, selectedProduct, selectedOrderCount, orders, products]);

  const toggleSelectAllDatabase = () => {
    if (selectedPhones.size === filteredCustomers.length) {
      setSelectedPhones(new Set<string>());
    } else {
      setSelectedPhones(new Set<string>(filteredCustomers.map(c => c.phone)));
    }
  };

  const toggleSelectManualAll = () => {
    if (selectedPhones.size === manualParsedNumbers.length) {
      setSelectedPhones(new Set<string>());
    } else {
      setSelectedPhones(new Set<string>(manualParsedNumbers));
    }
  };

  const toggleSelectPhone = (phone: string) => {
    const newSet = new Set<string>(selectedPhones);
    if (newSet.has(phone)) {
      newSet.delete(phone);
    } else {
      newSet.add(phone);
    }
    setSelectedPhones(newSet);
  };

  const insertNameTag = () => {
    if (messageAreaRef.current) {
      const start = messageAreaRef.current.selectionStart;
      const end = messageAreaRef.current.selectionEnd;
      const text = message;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setMessage(before + "[name]" + after);
      
      // Reset focus and cursor position after state update
      setTimeout(() => {
        if (messageAreaRef.current) {
          messageAreaRef.current.focus();
          messageAreaRef.current.selectionStart = start + 6;
          messageAreaRef.current.selectionEnd = start + 6;
        }
      }, 0);
    } else {
      setMessage(message + "[name]");
    }
  };

  const handleGenerateAI = async (purpose: string) => {
    setIsGenerating(true);
    const text = await generateSMSTemplate(purpose, "bdcommerce");
    setMessage(text);
    setIsGenerating(false);
  };

  const handleSaveConfig = () => {
    saveSMSConfig(smsConfig);
    setShowConfig(false);
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) return;
    const template: SMSTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      content: newTemplate.content
    };
    const updated = [...templates, template];
    setTemplates(updated);
    await saveCustomTemplates(updated);
    setNewTemplate({ name: '', content: '' });
    setShowTemplateModal(false);
  };

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    await saveCustomTemplates(updated);
  };

  const handleSendSMS = async () => {
    const config = await getSMSConfig();
    if (!config || !config.apiKey || !config.endpoint) {
      alert("Please configure your SMS API Settings first.");
      setShowConfig(true);
      return;
    }

    if (selectedPhones.size === 0 || !message.trim()) return;

    setIsSending(true);
    setSendLogs([]);
    
    // Explicitly cast to string array to avoid 'unknown' type issues in the loop
    const phones = Array.from(selectedPhones) as string[];
    let successCount = 0;

    for (const phone of phones) {
      // Find customer name if exists in database
      const customer = customers.find(c => c.phone === phone);
      const customerName = customer ? customer.name.split(' ')[0] : 'Customer';
      
      // Personalized message
      const personalizedMessage = message.replace(/\[name\]/g, customerName);

      const success = await sendActualSMS(config as SMSConfig, phone, personalizedMessage);
      if (success) {
        successCount++;
        setSendLogs(prev => [...prev, { phone, status: 'sent' }]);
      } else {
        setSendLogs(prev => [...prev, { phone, status: 'failed' }]);
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    setIsSending(false);
    alert(`Process completed. ${successCount} out of ${selectedPhones.size} messages sent.`);
    setSelectedPhones(new Set<string>());
    setMessage('');
    setManualInput('');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedProduct('All');
    setSelectedOrderCount('All');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bulk SMS System</h2>
          <p className="text-sm text-gray-500">Reach your customers instantly with personalized SMS.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowConfig(true)}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-orange-600 hover:border-orange-200 transition-all flex items-center gap-2 text-sm font-medium"
          >
            <Settings size={18} /> API Config
          </button>
          <div className="px-4 py-2 bg-orange-50 rounded-lg border border-orange-100 flex items-center gap-2">
            <Users size={16} className="text-orange-600" />
            <span className="text-sm font-bold text-orange-600">{selectedPhones.size} Recipient(s) Selected</span>
          </div>
        </div>
      </div>

      {!smsConfig.apiKey && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 text-amber-800 animate-pulse">
          <AlertCircle className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">SMS API Not Configured</p>
            <p className="text-xs opacity-80">You need to add your API credentials before you can send actual messages.</p>
          </div>
          <button 
            onClick={() => setShowConfig(true)}
            className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors"
          >
            Configure Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Selection */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button 
              onClick={() => { setActiveTab('database'); setSelectedPhones(new Set()); }}
              className={`flex-1 py-4 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'database' ? 'text-orange-600 bg-white border-b-2 border-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Users size={14} /> Database Customers
            </button>
            <button 
              onClick={() => { setActiveTab('manual'); setSelectedPhones(new Set()); }}
              className={`flex-1 py-4 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'manual' ? 'text-orange-600 bg-white border-b-2 border-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ClipboardList size={14} /> Manual Import
            </button>
          </div>

          {activeTab === 'database' ? (
            <>
              <div className="p-4 border-b border-gray-50 bg-white space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
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

                  <div className="relative">
                    <select 
                      value={selectedOrderCount}
                      onChange={(e) => setSelectedOrderCount(e.target.value)}
                      className="appearance-none pl-9 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white hover:border-orange-500 transition-colors focus:outline-none"
                    >
                      <option value="All">All Orders</option>
                      <option value="1">1 Order</option>
                      <option value="2">2 Orders</option>
                      <option value="3">3 Orders</option>
                      <option value="4+">4+ Orders</option>
                    </select>
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  </div>

                  <div className="relative">
                    <select 
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedProduct('All');
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

                  <button onClick={resetFilters} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                    <RotateCcw size={18} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Found {filteredCustomers.length} Customers
                  </span>
                  <button onClick={toggleSelectAllDatabase} className="text-xs font-bold text-orange-600 hover:bg-orange-50 px-3 py-1 rounded-lg transition-colors">
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
                      <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredCustomers.map((c) => (
                      <tr 
                        key={c.phone} 
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedPhones.has(c.phone) ? 'bg-orange-50/30' : ''}`}
                        onClick={() => toggleSelectPhone(c.phone)}
                      >
                        <td className="px-6 py-4">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedPhones.has(c.phone) ? 'bg-orange-500 border-orange-500' : 'border-gray-200 bg-white'}`}>
                            {selectedPhones.has(c.phone) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full border border-gray-100" />
                            <span className="text-sm font-medium text-gray-700">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{c.phone}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-bold text-gray-400">{c.orderCount} Orders</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-8 flex flex-col h-full bg-white">
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <UserPlus size={16} className="text-orange-500" /> Paste Phone Numbers
                    </h3>
                    <p className="text-xs text-gray-400">Separate numbers with commas or new lines.</p>
                  </div>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500">
                    {manualParsedNumbers.length} Valid Numbers Detected
                  </div>
                </div>
                
                <textarea 
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="01712xxxxxx,&#10;01923xxxxxx,&#10;01678xxxxxx"
                  className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500 resize-none font-mono leading-relaxed"
                />

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                  <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    <strong>Tip:</strong> You can copy a whole column of phone numbers from Excel and paste it here directly. We will automatically extract the valid numbers for you.
                  </p>
                </div>
                
                <button 
                  disabled={manualParsedNumbers.length === 0}
                  onClick={toggleSelectManualAll}
                  className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {selectedPhones.size === manualParsedNumbers.length && manualParsedNumbers.length > 0 
                    ? 'Deselect All Imported Numbers' 
                    : `Select All ${manualParsedNumbers.length} Valid Numbers`}
                </button>
              </div>
            </div>
          )}
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

            <div className="relative">
              <textarea 
                ref={messageAreaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full h-40 p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-500 resize-none pb-12"
              />
              <div className="absolute bottom-3 left-3 flex gap-2">
                <button 
                  onClick={insertNameTag}
                  className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[10px] font-bold text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <User size={10} /> [name] Name Tag
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-gray-400 leading-tight">
              <strong>Personalization:</strong> Use <span className="text-orange-600 font-bold">[name]</span> to automatically insert the customer's first name.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message Templates & AI</p>
                <button 
                  onClick={() => setShowTemplateModal(true)}
                  className="p-1 hover:bg-orange-50 text-orange-600 rounded transition-colors"
                  title="Add New Template"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* AI Quick Drafts */}
                <button 
                  disabled={isGenerating}
                  onClick={() => handleGenerateAI("Seasonal 50% Discount Sale Invitation with name greeting")}
                  className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold border border-orange-100 hover:bg-orange-100 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wand2 size={12} /> Discount Sale
                </button>
                <button 
                  disabled={isGenerating}
                  onClick={() => handleGenerateAI("New Product Collection Arrival Notification with name greeting")}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wand2 size={12} /> New Arrival
                </button>
                <button 
                  disabled={isGenerating}
                  onClick={() => handleGenerateAI("Customer Loyalty Appreciation Message with name greeting")}
                  className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold border border-purple-100 hover:bg-purple-100 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wand2 size={12} /> Loyalty Greet
                </button>

                {/* Custom Saved Templates */}
                {templates.map(tmpl => (
                  <div key={tmpl.id} className="group relative">
                    <button 
                      onClick={() => setMessage(tmpl.content)}
                      className="px-3 py-1.5 bg-white text-gray-600 rounded-lg text-[10px] font-bold border border-gray-100 hover:border-orange-500 hover:text-orange-600 flex items-center gap-2 transition-all"
                    >
                      <FileText size={12} /> {tmpl.name}
                    </button>
                    <button 
                      onClick={(e) => deleteTemplate(tmpl.id, e)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
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
                  Send SMS to {selectedPhones.size} Recipients
                </>
              )}
            </button>
          </div>

          {sendLogs.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Send Progress</h3>
                <button onClick={() => setSendLogs([])} className="text-[10px] text-gray-400 hover:text-red-500 uppercase font-bold">Clear Logs</button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {sendLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 text-xs">
                    <span className="text-gray-500 font-medium">{log.phone}</span>
                    <div className="flex items-center gap-1">
                      {log.status === 'sent' ? (
                        <>
                          <CheckCircle2 size={12} className="text-green-500" />
                          <span className="text-green-600 font-bold uppercase">Sent</span>
                        </>
                      ) : (
                        <>
                          <X size={12} className="text-red-500" />
                          <span className="text-red-600 font-bold uppercase">Failed</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SMS Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">SMS API Settings</h2>
                <p className="text-xs text-gray-500">Connect your bulk SMS gateway</p>
              </div>
              <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Gateway URL (API Endpoint)</label>
                <input 
                  type="text" 
                  placeholder="https://sms-gateway.com/api/send"
                  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={smsConfig.endpoint}
                  onChange={(e) => setSmsConfig({...smsConfig, endpoint: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">API Key</label>
                <input 
                  type="password" 
                  placeholder="Your API Key"
                  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={smsConfig.apiKey}
                  onChange={(e) => setSmsConfig({...smsConfig, apiKey: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Sender ID / Brand Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. BDCOMMERCE"
                  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={smsConfig.senderId}
                  onChange={(e) => setSmsConfig({...smsConfig, senderId: e.target.value})}
                />
              </div>
              <div className="pt-4">
                <button 
                  onClick={handleSaveConfig}
                  className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition-all active:scale-[0.98]"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Add New Template</h2>
                <p className="text-xs text-gray-500">Create a reusable SMS message</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Template Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Eid Offer, Winter Sale"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Message Content</label>
                <textarea 
                  placeholder="Type your template message here..."
                  className="w-full h-32 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500 resize-none"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                />
              </div>
              <div className="pt-2">
                <button 
                  onClick={handleAddTemplate}
                  disabled={!newTemplate.name || !newTemplate.content}
                  className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};