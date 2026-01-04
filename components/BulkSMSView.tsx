
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
  ChevronDown,
  Settings,
  X,
  AlertCircle,
  User,
  Info,
  BookmarkPlus,
  Layout,
  History,
  AlertTriangle,
  CheckCircle,
  ClipboardList
} from 'lucide-react';
import { Customer, Order, InventoryProduct } from '../types';
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
  initialTargetPhone?: string | null;
}

interface SendLog {
  phone: string;
  status: 'pending' | 'sent' | 'failed';
  message: string;
  time: string;
}

export const BulkSMSView: React.FC<BulkSMSViewProps> = ({ customers, orders, products, initialTargetPhone }) => {
  const [activeTab, setActiveTab] = useState<'database' | 'manual'>('database');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrderCount, setSelectedOrderCount] = useState<string>('All');
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set<string>());
  const [manualInput, setManualInput] = useState('');
  const [manualParsedNumbers, setManualParsedNumbers] = useState<string[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);
  const [smsConfig, setSmsConfig] = useState<SMSConfig>({ endpoint: 'https://sms.mram.com.bd/smsapi', apiKey: '', senderId: '' });

  const messageAreaRef = useRef<HTMLTextAreaElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

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

    // If navigated from customers page with a specific phone
    if (initialTargetPhone) {
      setSelectedPhones(new Set([initialTargetPhone]));
    }
  }, [initialTargetPhone]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sendLogs]);

  const smsStats = useMemo(() => {
    if (!message) return { count: 0, segments: 1, isUnicode: false };
    const gsmRegex = /^[\u0000-\u007F]*$/;
    const isUnicode = !gsmRegex.test(message);
    const count = message.length;
    let segments = 1;
    if (isUnicode) {
      segments = count <= 70 ? 1 : Math.ceil(count / 67);
    } else {
      segments = count <= 160 ? 1 : Math.ceil(count / 153);
    }
    return { count, segments, isUnicode };
  }, [message]);

  useEffect(() => {
    const numbers = manualInput
      .split(/[\n,]+/)
      .map(n => n.trim().replace(/[^\d]/g, ''))
      .filter(n => n.length >= 10); 
    setManualParsedNumbers(Array.from(new Set(numbers)));
  }, [manualInput]);

  const filteredCustomers = useMemo(() => {
    const searchVal = String(searchTerm || '').toLowerCase();
    const phoneSearch = String(searchTerm || '');
    const orderCountFilter = String(selectedOrderCount || 'All');

    return (customers || []).filter((customer: Customer) => {
      const matchesSearch = customer.name.toLowerCase().includes(searchVal) || customer.phone.includes(phoneSearch);
      if (!matchesSearch) return false;
      
      if (orderCountFilter !== 'All') {
        if (orderCountFilter === '4+') {
          if (customer.orderCount < 4) return false;
        } else {
          const targetCount = parseInt(orderCountFilter, 10);
          if (customer.orderCount !== targetCount) return false;
        }
      }
      return true;
    });
  }, [customers, searchTerm, selectedOrderCount]);

  const toggleSelectAllDatabase = () => {
    if (selectedPhones.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(filteredCustomers.map(c => c.phone)));
    }
  };

  const toggleSelectManualAll = () => {
    if (selectedPhones.size === manualParsedNumbers.length && manualParsedNumbers.length > 0) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(manualParsedNumbers));
    }
  };

  const toggleSelectPhone = (phone: string) => {
    const newSet = new Set(selectedPhones);
    if (newSet.has(phone)) newSet.delete(phone);
    else newSet.add(phone);
    setSelectedPhones(newSet);
  };

  const handleAISuggest = async () => {
    setIsGenerating(true);
    try {
      const text = await generateSMSTemplate("Promotion and Discount", "BdCommerce");
      setMessage(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) return;
    const updated = [...templates, { ...newTemplate, id: Date.now().toString() }];
    setTemplates(updated);
    await saveCustomTemplates(updated);
    setNewTemplate({ name: '', content: '' });
    setShowTemplateModal(false);
  };

  const insertNameTag = () => {
    if (messageAreaRef.current) {
      const start = messageAreaRef.current.selectionStart;
      const end = messageAreaRef.current.selectionEnd;
      const newMessage = message.substring(0, start) + "[name]" + message.substring(end);
      setMessage(newMessage);
      setTimeout(() => {
        if (messageAreaRef.current) {
          messageAreaRef.current.focus();
          messageAreaRef.current.selectionStart = messageAreaRef.current.selectionEnd = start + 6;
        }
      }, 0);
    } else {
      setMessage(message + "[name]");
    }
  };

  const handleSendSMS = async () => {
    if (selectedPhones.size === 0 || !message.trim()) return;
    if (!window.confirm(`Are you sure you want to send SMS to ${selectedPhones.size} recipients?`)) return;

    setIsSending(true);
    setSendLogs([]);
    const phones = Array.from(selectedPhones) as string[];
    let successCount = 0;

    for (const phone of phones) {
      const customer = customers.find(c => c.phone === phone);
      const customerName = customer ? customer.name.split(' ')[0] : 'Customer';
      const personalizedMessage = message.replace(/\[name\]/g, customerName);
      
      const res = await sendActualSMS(smsConfig, phone, personalizedMessage);
      
      const logEntry: SendLog = {
        phone,
        status: res.success ? 'sent' : 'failed',
        message: res.message || 'Unknown error occurred',
        time: new Date().toLocaleTimeString()
      };
      
      setSendLogs(prev => [...prev, logEntry]);
      if (res.success) successCount++;
      await new Promise(r => setTimeout(r, 200));
    }
    
    setIsSending(false);
    alert(`Process completed. ${successCount}/${selectedPhones.size} successful.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bulk SMS System</h2>
          <p className="text-sm text-gray-500">Reach your customers instantly with personalized SMS.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowConfig(true)} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-orange-600 transition-all flex items-center gap-2 text-sm font-medium shadow-sm">
            <Settings size={18} /> API Config
          </button>
          <div className="px-4 py-2 bg-orange-50 rounded-lg border border-orange-100 flex items-center gap-2">
            <Users size={16} className="text-orange-600" />
            <span className="text-sm font-bold text-orange-600">{selectedPhones.size} Selected</span>
          </div>
        </div>
      </div>

      {!smsConfig.apiKey && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 text-amber-800 shadow-sm">
          <AlertCircle className="shrink-0" />
          <p className="text-sm font-bold flex-1">SMS API Not Configured. Update API Key and Sender ID.</p>
          <button onClick={() => setShowConfig(true)} className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-amber-700">Configure Now</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[750px]">
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button onClick={() => { setActiveTab('database'); setSelectedPhones(new Set()); }} className={`flex-1 py-4 text-xs font-bold uppercase transition-all ${activeTab === 'database' ? 'text-orange-600 bg-white border-b-2 border-orange-600' : 'text-gray-400'}`}>Database</button>
            <button onClick={() => { setActiveTab('manual'); setSelectedPhones(new Set()); }} className={`flex-1 py-4 text-xs font-bold uppercase transition-all ${activeTab === 'manual' ? 'text-orange-600 bg-white border-b-2 border-orange-600' : 'text-gray-400'}`}>Manual Input</button>
          </div>

          {activeTab === 'database' ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 bg-gray-50/30 border-b border-gray-100 grid grid-cols-2 md:grid-cols-2 gap-3">
                <div className="relative">
                  <select value={selectedOrderCount} onChange={e => setSelectedOrderCount(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none appearance-none cursor-pointer">
                    <option value="All">All Order Counts</option>
                    <option value="0">0 Orders</option>
                    <option value="1">1 Order</option>
                    <option value="2">2 Orders</option>
                    <option value="3">3 Orders</option>
                    <option value="4+">4+ Orders</option>
                  </select>
                  <ClipboardList size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <div className="relative">
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none" />
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white px-6">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{filteredCustomers.length} Total Customers</span>
                 <button onClick={toggleSelectAllDatabase} className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-1 uppercase">
                   <CheckCircle2 size={12} /> {selectedPhones.size === filteredCustomers.length && filteredCustomers.length > 0 ? 'Deselect All' : 'Select All'}
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                    <tr className="text-gray-400 font-bold uppercase text-[10px] border-b border-gray-100">
                      <th className="px-6 py-3">Select</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredCustomers.map(c => (
                      <tr key={c.phone} className="hover:bg-orange-50/30 cursor-pointer group transition-colors" onClick={() => toggleSelectPhone(c.phone)}>
                        <td className="px-6 py-3">
                          <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedPhones.has(c.phone) ? 'bg-orange-600 border-orange-600 shadow-sm' : 'border-gray-200 group-hover:border-orange-300'}`}>
                            {selectedPhones.has(c.phone) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                              {c.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-700">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-500 font-mono text-xs">{c.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-400 uppercase">Input numbers</h4>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{manualParsedNumbers.length} Valid Numbers</span>
              </div>
              <textarea value={manualInput} onChange={e => setManualInput(e.target.value)} placeholder="01712345678, 01812345678..." className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:ring-1 focus:ring-orange-500 outline-none transition-all shadow-inner" />
              <button onClick={toggleSelectManualAll} className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-900 transition-all active:scale-[0.98]">
                {selectedPhones.size === manualParsedNumbers.length && manualParsedNumbers.length > 0 ? 'Deselect All' : `Select All ${manualParsedNumbers.length} Numbers`}
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><MessageSquare size={16} className="text-orange-500" /> Composition</h3>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded text-[10px] font-bold border ${smsStats.segments > 1 ? 'bg-orange-500 text-white border-orange-600' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                  {smsStats.segments} SMS Parts
                </div>
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{smsStats.count} CHARS</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 relative">
                  <select className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none appearance-none cursor-pointer hover:bg-gray-100" onChange={(e) => {
                      const t = templates.find(temp => temp.id === e.target.value);
                      if (t) setMessage(t.content);
                    }}>
                    <option value="">Choose Saved Template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <Layout size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button onClick={() => { setNewTemplate({ name: '', content: message }); setShowTemplateModal(true); }} className="p-2.5 border border-gray-200 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all" title="Save current message as template">
                  <BookmarkPlus size={18} />
                </button>
              </div>

              <div className="relative">
                <textarea ref={messageAreaRef} value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message here..." className="w-full h-44 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none pb-14 focus:ring-1 focus:ring-orange-500 focus:bg-white transition-all shadow-inner" />
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <button onClick={insertNameTag} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-orange-600 shadow-sm flex items-center gap-1.5 hover:bg-orange-50 transition-all">
                    <User size={12} /> Add [name]
                  </button>
                  <button onClick={handleAISuggest} disabled={isGenerating} className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1.5 hover:bg-orange-700 disabled:opacity-50 transition-all">
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} AI Suggest
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex gap-2.5">
              <Info size={14} className="text-orange-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                {smsStats.isUnicode ? "Unicode detected: 70/67 chars per SMS." : "GSM detected: 160/153 chars per SMS."}
              </p>
            </div>

            <button disabled={isSending || selectedPhones.size === 0 || !message.trim()} onClick={handleSendSMS} className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-[0.98]">
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              Send SMS to {selectedPhones.size} Recipients
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[250px]">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-600 flex items-center gap-2"><History size={14} /> Send Log (Status Report)</h3>
              <button onClick={() => setSendLogs([])} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {sendLogs.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic text-center py-4">Logs will appear here.</p>
              ) : (
                sendLogs.map((log, idx) => (
                  <div key={idx} className={`p-2.5 rounded-lg border text-[10px] flex items-start gap-3 ${log.status === 'sent' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    {log.status === 'sent' ? <CheckCircle size={14} className="text-green-600 shrink-0" /> : <AlertTriangle size={14} className="text-red-600 shrink-0" />}
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold text-gray-800">{log.phone}</span>
                        <span className="text-[9px] text-gray-400">{log.time}</span>
                      </div>
                      <p className={log.status === 'sent' ? 'text-green-700' : 'text-red-700 font-medium'}>{log.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Save Template</h3>
              <X className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => setShowTemplateModal(false)} />
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Template Name</label>
                <input type="text" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="e.g. Promotion" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Content</label>
                <textarea value={newTemplate.content} onChange={e => setNewTemplate({...newTemplate, content: e.target.value})} className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm resize-none outline-none focus:border-orange-500 transition-all" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowTemplateModal(false)} className="flex-1 py-3 bg-gray-50 text-gray-600 font-bold rounded-xl">Cancel</button>
                <button onClick={handleSaveTemplate} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-md">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800">mram.com.bd Config</h2>
              </div>
              <X className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors" onClick={() => setShowConfig(false)} />
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Endpoint URL</label>
                <input type="text" placeholder="https://sms.mram.com.bd/smsapi" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500" value={smsConfig.endpoint} onChange={e => setSmsConfig({...smsConfig, endpoint: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">API Key</label>
                <input type="password" placeholder="Your API Key" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500" value={smsConfig.apiKey} onChange={e => setSmsConfig({...smsConfig, apiKey: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Sender ID</label>
                <input type="text" placeholder="Sender ID" className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-500" value={smsConfig.senderId} onChange={e => setSmsConfig({...smsConfig, senderId: e.target.value})} />
              </div>
            </div>
            <button onClick={() => { saveSMSConfig(smsConfig); setShowConfig(false); }} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition-all">Save Config</button>
          </div>
        </div>
      )}
    </div>
  );
};
