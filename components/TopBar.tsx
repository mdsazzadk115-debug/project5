
import React, { useState, useEffect } from 'react';
import { Search, Bell, Globe, RefreshCcw, Calendar, ChevronDown, LayoutGrid, Settings, X } from 'lucide-react';
import { getWPConfig, saveWPConfig, WPConfig } from '../services/wordpressService';

export const TopBar: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<WPConfig>({ url: '', consumerKey: '', consumerSecret: '' });

  // Correctly await the async getWPConfig call inside useEffect
  useEffect(() => {
    const loadConfig = async () => {
      const saved = await getWPConfig();
      if (saved) setConfig(saved);
    };
    loadConfig();
  }, []);

  const handleSave = () => {
    saveWPConfig(config);
    setShowSettings(false);
    window.location.reload(); // Refresh to trigger fetch with new keys
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
        <div 
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-600 cursor-pointer transition-colors"
        >
          <Settings size={16} />
          <span className="text-sm font-medium">WP Connect</span>
        </div>

        <div className="flex items-center gap-2 text-gray-500 hover:text-orange-600 cursor-pointer transition-colors">
          <RefreshCcw size={16} />
          <span className="text-sm font-medium">Clear Cache</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full cursor-pointer hover:bg-orange-100 transition-colors">
          <Globe size={16} />
          <span className="text-sm font-semibold">Visit Website</span>
          <span className="text-[10px] ml-1">↗</span>
        </div>

        <div className="h-8 w-[1px] bg-gray-100"></div>

        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <img 
              src="https://picsum.photos/seed/user/40/40" 
              alt="Avatar" 
              className="w-10 h-10 rounded-full ring-2 ring-white group-hover:ring-orange-100 transition-all"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800 flex items-center gap-1 leading-tight">
              Admin
              <ChevronDown size={12} className="text-gray-400" />
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Super Admin</span>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">WordPress Settings</h2>
                <p className="text-xs text-gray-500">Connect your WooCommerce store</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Site URL</label>
                <input 
                  type="text" 
                  placeholder="https://yourstore.com"
                  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={config.url}
                  onChange={(e) => setConfig({...config, url: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Consumer Key</label>
                <input 
                  type="password" 
                  placeholder="ck_xxxxxxxx..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={config.consumerKey}
                  onChange={(e) => setConfig({...config, consumerKey: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Consumer Secret</label>
                <input 
                  type="password" 
                  placeholder="cs_xxxxxxxx..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:border-orange-500"
                  value={config.consumerSecret}
                  onChange={(e) => setConfig({...config, consumerSecret: e.target.value})}
                />
              </div>
              <div className="pt-4">
                <button 
                  onClick={handleSave}
                  className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition-all active:scale-[0.98]"
                >
                  Save & Connect
                </button>
                <p className="text-[10px] text-center text-gray-400 mt-4 leading-relaxed px-4">
                  Go to <span className="font-bold">WooCommerce > Settings > Advanced > REST API</span> in your WordPress dashboard to generate keys.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
