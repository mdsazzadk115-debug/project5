
import React, { useState, useEffect } from 'react';
import { Search, Bell, Globe, RefreshCcw, Calendar, ChevronDown, LayoutGrid, Settings, X, Truck } from 'lucide-react';
import { getWPConfig, saveWPConfig, WPConfig } from '../services/wordpressService';
import { getCourierConfig, saveCourierConfig, getPathaoConfig, savePathaoConfig } from '../services/courierService';
import { CourierConfig, PathaoConfig } from '../types';

export const TopBar: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'wp' | 'courier' | 'pathao'>('wp');
  const [config, setConfig] = useState<WPConfig>({ url: '', consumerKey: '', consumerSecret: '' });
  const [courierConfig, setCourierConfig] = useState<CourierConfig>({ apiKey: '', secretKey: '' });
  const [pathaoConfig, setPathaoConfig] = useState<PathaoConfig>({ clientId: '', clientSecret: '', username: '', password: '', baseUrl: 'https://api-hermes.pathao.com' });

  useEffect(() => {
    const loadConfig = async () => {
      const saved = await getWPConfig();
      if (saved) setConfig(saved);
      const savedCourier = await getCourierConfig();
      if (savedCourier) setCourierConfig(savedCourier);
      const savedPathao = await getPathaoConfig();
      if (savedPathao) setPathaoConfig(savedPathao);
    };
    loadConfig();
  }, []);

  const handleSave = () => {
    if (activeTab === 'wp') saveWPConfig(config);
    else if (activeTab === 'courier') saveCourierConfig(courierConfig);
    else if (activeTab === 'pathao') savePathaoConfig(pathaoConfig);
    
    setShowSettings(false);
    window.location.reload();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <span className="p-1 bg-gray-50 rounded text-gray-400">
            <LayoutGrid size={16} />
          </span>
          Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-6">
        <div onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-gray-500 hover:text-orange-600 cursor-pointer transition-colors">
          <Settings size={16} />
          <span className="text-sm font-medium">Connections</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 hover:text-orange-600 cursor-pointer transition-colors">
          <RefreshCcw size={16} />
          <span className="text-sm font-medium">Clear Cache</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full cursor-pointer hover:bg-orange-100 transition-colors">
          <Globe size={16} />
          <span className="text-sm font-semibold">Visit Website</span>
        </div>
        <div className="h-8 w-[1px] bg-gray-100"></div>
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <img src="https://picsum.photos/seed/user/40/40" alt="Avatar" className="w-10 h-10 rounded-full ring-2 ring-white group-hover:ring-orange-100 transition-all"/>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800 flex items-center gap-1 leading-tight">Admin <ChevronDown size={12} className="text-gray-400" /></span>
            <span className="text-[10px] text-gray-400 font-medium">Super Admin</span>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Connection Settings</h2>
                <p className="text-xs text-gray-500">Manage integrations</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex border-b border-gray-100">
              {['wp', 'courier', 'pathao'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-[10px] font-bold uppercase transition-colors ${activeTab === tab ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/10' : 'text-gray-400'}`}>
                  {tab === 'wp' ? 'WordPress' : tab === 'courier' ? 'Steadfast' : 'Pathao'}
                </button>
              ))}
            </div>

            <div className="p-8 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              {activeTab === 'wp' && (
                <>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Site URL</label><input type="text" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={config.url} onChange={(e) => setConfig({...config, url: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Consumer Key</label><input type="password"  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={config.consumerKey} onChange={(e) => setConfig({...config, consumerKey: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Consumer Secret</label><input type="password"  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={config.consumerSecret} onChange={(e) => setConfig({...config, consumerSecret: e.target.value})} /></div>
                </>
              )}
              {activeTab === 'courier' && (
                <>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">API Key</label><input type="password" placeholder="Steadfast API Key" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={courierConfig.apiKey} onChange={(e) => setCourierConfig({...courierConfig, apiKey: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Secret Key</label><input type="password" placeholder="Steadfast Secret Key" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={courierConfig.secretKey} onChange={(e) => setCourierConfig({...courierConfig, secretKey: e.target.value})} /></div>
                </>
              )}
              {activeTab === 'pathao' && (
                <div className="space-y-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Client ID</label><input type="password" placeholder="Pathao Client ID" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={pathaoConfig.clientId} onChange={(e) => setPathaoConfig({...pathaoConfig, clientId: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Client Secret</label><input type="password" placeholder="Pathao Client Secret" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={pathaoConfig.clientSecret} onChange={(e) => setPathaoConfig({...pathaoConfig, clientSecret: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Username (Email)</label><input type="email" placeholder="Email" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={pathaoConfig.username} onChange={(e) => setPathaoConfig({...pathaoConfig, username: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Password</label><input type="password" placeholder="Password" className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm" value={pathaoConfig.password} onChange={(e) => setPathaoConfig({...pathaoConfig, password: e.target.value})} /></div>
                  </div>
                </div>
              )}
              <div className="pt-4"><button onClick={handleSave} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition-all">Save & Connect</button></div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
