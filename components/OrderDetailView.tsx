import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Info, 
  MapPin, 
  Mail, 
  Phone, 
  Package,
  Truck,
  Heart,
  Send,
  Loader2,
  CheckCircle,
  ExternalLink,
  X,
  Store,
  Map
} from 'lucide-react';
import { Order } from '../types';
import { 
  createSteadfastOrder, 
  createPathaoOrder, 
  fetchPathaoCities, 
  fetchPathaoZones, 
  fetchPathaoAreas, 
  fetchPathaoStores 
} from '../services/courierService';

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order, onBack }) => {
  const [isShipping, setIsShipping] = useState(false);
  const [shippingResult, setShippingResult] = useState<{tracking: string, id: string | number, provider: string} | null>(
    order.courier_tracking_code ? {tracking: order.courier_tracking_code, id: 0, provider: order.courier_provider || 'steadfast'} : null
  );

  const [showPathaoModal, setShowPathaoModal] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [pathaoForm, setPathaoForm] = useState({ city_id: '', zone_id: '', area_id: '', store_id: '' });

  const handleSendToSteadfast = async () => {
    if (shippingResult) return;
    setIsShipping(true);
    try {
      const res = await createSteadfastOrder(order);
      if (res && res.status === 200) {
        setShippingResult({
          tracking: res.consignment.tracking_code,
          id: res.consignment.consignment_id,
          provider: 'steadfast'
        });
        alert("Consignment created successfully! Tracking Code: " + res.consignment.tracking_code);
      } else {
        alert("Steadfast Error: " + (res?.message || "Check API Connection and Keys."));
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsShipping(false);
    }
  };

  const openPathaoDispatch = async () => {
    if (shippingResult) return;
    setShowPathaoModal(true);
    setLoadingLocs(true);
    try {
      const [cityList, storeList] = await Promise.all([fetchPathaoCities(), fetchPathaoStores()]);
      setCities(cityList);
      setStores(storeList);
      if (storeList.length > 0) setPathaoForm(prev => ({ ...prev, store_id: storeList[0].store_id.toString() }));
    } catch (e) {
      alert("Pathao load error. Please check connections.");
    } finally {
      setLoadingLocs(false);
    }
  };

  const handlePathaoCityChange = async (id: string) => {
    setPathaoForm({ ...pathaoForm, city_id: id, zone_id: '', area_id: '' });
    setZones([]); setAreas([]);
    if (!id) return;
    setLoadingLocs(true);
    try { setZones(await fetchPathaoZones(parseInt(id))); } finally { setLoadingLocs(false); }
  };

  const handlePathaoZoneChange = async (id: string) => {
    setPathaoForm({ ...pathaoForm, zone_id: id, area_id: '' });
    setAreas([]);
    if (!id) return;
    setLoadingLocs(true);
    try { setAreas(await fetchPathaoAreas(parseInt(id))); } finally { setLoadingLocs(false); }
  };

  const submitToPathao = async () => {
    if (!pathaoForm.city_id || !pathaoForm.zone_id || !pathaoForm.store_id) {
      alert("Please select City, Zone and Store.");
      return;
    }
    setIsShipping(true);
    try {
      const payload = {
        store_id: parseInt(pathaoForm.store_id),
        merchant_order_id: order.id,
        recipient_name: order.customer.name,
        recipient_phone: order.customer.phone,
        recipient_address: order.address,
        recipient_city: parseInt(pathaoForm.city_id),
        recipient_zone: parseInt(pathaoForm.zone_id),
        recipient_area: pathaoForm.area_id ? parseInt(pathaoForm.area_id) : undefined,
        delivery_type: 48,
        item_type: 2,
        item_quantity: 1,
        item_weight: 0.5,
        amount_to_collect: order.total
      };
      const res = await createPathaoOrder(payload);
      if (res && res.code === 200) {
        setShippingResult({ tracking: res.data.consignment_id, id: res.data.consignment_id, provider: 'pathao' });
        setShowPathaoModal(false);
        alert("Sent to Pathao successfully!");
      } else {
        alert("Pathao Error: " + (res?.message || "Failed to create order"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsShipping(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium">
              <span className="text-orange-600 font-bold">Order ID: {order.id}</span>
              <span className="text-gray-400 ml-4">Date: {order.date}</span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleSendToSteadfast}
              disabled={!!shippingResult || isShipping}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                shippingResult?.provider === 'steadfast' ? 'bg-green-100 text-green-600' : 'bg-orange-600 text-white hover:bg-orange-700'
              } disabled:opacity-50`}
            >
              {isShipping && !showPathaoModal ? <Loader2 size={16} className="animate-spin" /> : shippingResult?.provider === 'steadfast' ? <CheckCircle size={16} /> : <Send size={16} />}
              {shippingResult?.provider === 'steadfast' ? 'Sent to SF' : 'Send to Steadfast'}
            </button>
            <button 
              onClick={openPathaoDispatch}
              disabled={!!shippingResult || isShipping}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                shippingResult?.provider === 'pathao' ? 'bg-blue-100 text-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {isShipping && showPathaoModal ? <Loader2 size={16} className="animate-spin" /> : shippingResult?.provider === 'pathao' ? <CheckCircle size={16} /> : <Truck size={16} />}
              {shippingResult?.provider === 'pathao' ? 'Sent to Pathao' : 'Send to Pathao'}
            </button>
          </div>
        </div>
      </div>

      {showPathaoModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold">Pathao Shipment</h3>
              <button onClick={() => setShowPathaoModal(false)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400">PICKUP STORE</label>
                <select value={pathaoForm.store_id} onChange={e => setPathaoForm({...pathaoForm, store_id: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl">
                  {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">CITY</label>
                  <select value={pathaoForm.city_id} onChange={e => handlePathaoCityChange(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl">
                    <option value="">Select City</option>
                    {cities.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">ZONE</label>
                  <select disabled={!pathaoForm.city_id} value={pathaoForm.zone_id} onChange={e => handlePathaoZoneChange(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-xl">
                    <option value="">Select Zone</option>
                    {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                  </select>
                </div>
              </div>
              {loadingLocs && <div className="text-[10px] text-blue-500 animate-pulse">Syncing...</div>}
              <button onClick={submitToPathao} disabled={isShipping} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2">
                {isShipping ? <Loader2 size={20} className="animate-spin" /> : "Dispatch to Pathao"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};