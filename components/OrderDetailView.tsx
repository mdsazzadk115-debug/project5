import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Info, 
  MapPin, 
  Mail, 
  Phone, 
  Search,
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

  // Pathao Modal States
  const [showPathaoModal, setShowPathaoModal] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [pathaoForm, setPathaoForm] = useState({
    city_id: '',
    zone_id: '',
    area_id: '',
    store_id: ''
  });

  const isStepCompleted = (step: 'placed' | 'packaging' | 'shipping' | 'delivered') => {
    const statusMap: Record<Order['status'], string[]> = {
      'Pending': ['placed'],
      'Packaging': ['placed', 'packaging'],
      'Shipping': ['placed', 'packaging', 'shipping'],
      'Delivered': ['placed', 'packaging', 'shipping', 'delivered'],
      'Returned': ['placed', 'packaging', 'shipping'],
      'Rejected': ['placed'],
      'Cancelled': ['placed']
    };
    return statusMap[order.status]?.includes(step) || false;
  };

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
        alert("Sent to Steadfast Courier Successfully!");
      } else {
        alert("Error: " + (res?.message || "Failed to create consignment. Check API Connection."));
      }
    } catch (error: any) {
      console.error(error);
      alert("Courier Config Error: Please check your API keys in Connections settings.");
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
      if (storeList && storeList.length > 0) {
        setPathaoForm(prev => ({ ...prev, store_id: storeList[0].store_id.toString() }));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load Pathao locations. Check Pathao credentials.");
    } finally {
      setLoadingLocs(false);
    }
  };

  const handlePathaoCityChange = async (cityId: string) => {
    setPathaoForm({ ...pathaoForm, city_id: cityId, zone_id: '', area_id: '' });
    setZones([]);
    setAreas([]);
    if (!cityId) return;
    setLoadingLocs(true);
    try {
      const zoneList = await fetchPathaoZones(parseInt(cityId));
      setZones(zoneList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLocs(false);
    }
  };

  const handlePathaoZoneChange = async (zoneId: string) => {
    setPathaoForm({ ...pathaoForm, zone_id: zoneId, area_id: '' });
    setAreas([]);
    if (!zoneId) return;
    setLoadingLocs(true);
    try {
      const areaList = await fetchPathaoAreas(parseInt(zoneId));
      setAreas(areaList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLocs(false);
    }
  };

  const submitToPathao = async () => {
    if (!pathaoForm.city_id || !pathaoForm.zone_id || !pathaoForm.store_id) {
      alert("Please select Store, City and Zone.");
      return;
    }
    setIsShipping(true);
    try {
      const pathaoData = {
        store_id: parseInt(pathaoForm.store_id),
        merchant_order_id: order.id,
        recipient_name: order.customer.name,
        recipient_phone: order.customer.phone,
        recipient_address: order.address,
        recipient_city: parseInt(pathaoForm.city_id),
        recipient_zone: parseInt(pathaoForm.zone_id),
        recipient_area: pathaoForm.area_id ? parseInt(pathaoForm.area_id) : undefined,
        delivery_type: 48, // Standard
        item_type: 2, // Parcel
        item_quantity: order.products.reduce((acc, p) => acc + p.qty, 0),
        item_weight: 0.5,
        amount_to_collect: order.total,
        special_instruction: "Order from Dashboard"
      };

      const res = await createPathaoOrder(pathaoData);
      if (res && res.code === 200) {
        setShippingResult({
          tracking: res.data.consignment_id,
          id: res.data.consignment_id,
          provider: 'pathao'
        });
        setShowPathaoModal(false);
        alert("Sent to Pathao Successfully!");
      } else {
        alert("Pathao Error: " + (res?.message || "Failed to create order"));
      }
    } catch (e: any) {
      console.error(e);
      alert("Pathao Error: " + e.message);
    } finally {
      setIsShipping(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-4 w-full">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium">
                <span className="text-orange-600 font-bold">Order ID: {order.id}</span>
                <span className="text-gray-400 ml-4">Date: {order.date}</span>
              </h2>
              {shippingResult && (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-100">
                  <Truck size={12} /> {shippingResult.provider.toUpperCase()}: {shippingResult.tracking}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleSendToSteadfast}
                disabled={!!shippingResult || isShipping}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all ${
                  shippingResult?.provider === 'steadfast'
                  ? 'bg-green-100 text-green-600 cursor-default' 
                  : 'bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50'
                }`}
              >
                {isShipping && !showPathaoModal ? <Loader2 size={16} className="animate-spin" /> : shippingResult?.provider === 'steadfast' ? <CheckCircle size={16} /> : <Send size={16} />}
                {shippingResult?.provider === 'steadfast' ? 'Sent to SF' : 'Send to Steadfast'}
              </button>

              <button 
                onClick={openPathaoDispatch}
                disabled={!!shippingResult || isShipping}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all ${
                  shippingResult?.provider === 'pathao'
                  ? 'bg-blue-100 text-blue-600 cursor-default' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                }`}
              >
                {isShipping && showPathaoModal ? <Loader2 size={16} className="animate-spin" /> : shippingResult?.provider === 'pathao' ? <CheckCircle size={16} /> : <Truck size={16} />}
                {shippingResult?.provider === 'pathao' ? 'Sent to Pathao' : 'Send to Pathao'}
              </button>

              <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-colors">
                <Printer size={16} /> Invoice
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 italic">
            <Info size={14} />
            Orders in route to the customer destination.
            <div className="ml-auto flex gap-2">
              {order.status === 'Returned' && <span className="bg-red-50 text-red-500 px-3 py-1 rounded border border-red-100 font-medium uppercase text-[10px]">Returned</span>}
              {order.status === 'Delivered' && <span className="bg-blue-50 text-blue-500 px-3 py-1 rounded border border-blue-100 font-medium uppercase text-[10px]">Delivered</span>}
              {order.status === 'Rejected' && <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded border border-gray-100 font-medium uppercase text-[10px]">Rejected</span>}
              {order.status === 'Cancelled' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded border border-red-200 font-medium uppercase text-[10px]">Cancelled</span>}
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="relative pt-8 pb-4 px-4">
            <div className="absolute top-[52px] left-12 right-12 h-1 bg-gray-100"></div>
            <div 
              className="absolute top-[52px] left-12 h-1 bg-orange-500 transition-all duration-1000"
              style={{ width: 
                order.status === 'Pending' ? '0%' : 
                order.status === 'Packaging' ? '33%' : 
                order.status === 'Shipping' ? '66%' : 
                order.status === 'Delivered' ? '100%' : '0%' 
              }}
            ></div>
            
            <div className="relative flex justify-between">
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center z-10 shadow-sm ${isStepCompleted('placed') ? 'bg-orange-600 text-white' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                  <Package size={20} />
                </div>
                <div className="text-center">
                  <p className={`text-[10px] font-bold uppercase ${isStepCompleted('placed') ? 'text-orange-600' : 'text-gray-400'}`}>Order placed</p>
                  <p className="text-[10px] text-gray-400">{order.statusHistory.placed}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center z-10 shadow-sm ${isStepCompleted('packaging') ? 'bg-orange-600 text-white' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                  <Package size={20} />
                </div>
                <div className="text-center">
                  <p className={`text-[10px] font-bold uppercase ${isStepCompleted('packaging') ? 'text-orange-600' : 'text-gray-400'}`}>Packaging</p>
                  {order.statusHistory.packaging && <p className="text-[10px] text-gray-400">{order.statusHistory.packaging}</p>}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center z-10 shadow-sm ${isStepCompleted('shipping') ? 'bg-orange-600 text-white' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                  <Truck size={20} />
                </div>
                <div className="text-center">
                  <p className={`text-[10px] font-bold uppercase ${isStepCompleted('shipping') ? 'text-orange-600' : 'text-gray-400'}`}>Shipping</p>
                  {order.statusHistory.shipping && <p className="text-[10px] text-gray-400">{order.statusHistory.shipping}</p>}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 shadow-sm ${isStepCompleted('delivered') ? 'bg-orange-600 text-white' : 'bg-white border-2 border-dashed border-gray-200 text-gray-300'}`}>
                  <Heart size={20} />
                </div>
                <div className="text-center">
                  <p className={`text-[10px] font-bold uppercase ${isStepCompleted('delivered') ? 'text-orange-600' : 'text-gray-400'}`}>Delivered</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pathao Modal */}
      {showPathaoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Dispatch to Pathao</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Select Location Details</p>
              </div>
              <button onClick={() => setShowPathaoModal(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><Store size={14} /> Pickup Store</label>
                  <select 
                    value={pathaoForm.store_id} 
                    onChange={e => setPathaoForm({...pathaoForm, store_id: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="">Select Store</option>
                    {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><MapPin size={14} /> City</label>
                    <select 
                      value={pathaoForm.city_id} 
                      onChange={e => handlePathaoCityChange(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><Map size={14} /> Zone</label>
                    <select 
                      value={pathaoForm.zone_id} 
                      disabled={!pathaoForm.city_id || loadingLocs}
                      onChange={e => handlePathaoZoneChange(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none disabled:opacity-50"
                    >
                      <option value="">Select Zone</option>
                      {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Area (Optional)</label>
                  <select 
                    value={pathaoForm.area_id} 
                    disabled={!pathaoForm.zone_id || loadingLocs}
                    onChange={e => setPathaoForm({...pathaoForm, area_id: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none disabled:opacity-50"
                  >
                    <option value="">Select Area</option>
                    {areas.map(a => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
                  </select>
                </div>

                {loadingLocs && <div className="flex items-center gap-2 text-blue-500 text-[10px] font-bold animate-pulse"><Loader2 size={12} className="animate-spin" /> Syncing Pathao locations...</div>}
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowPathaoModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all">Cancel</button>
                <button 
                  onClick={submitToPathao} 
                  disabled={isShipping || loadingLocs}
                  className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isShipping ? <Loader2 size={20} className="animate-spin" /> : <Truck size={20} />}
                  Confirm Pathao Shipment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Order Items */}
        <div className="col-span-12 lg:col-span-9 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-700">Order Item</h3>
            {shippingResult && (
              <a 
                href={shippingResult.provider === 'steadfast' ? `https://steadfast.com.bd/tracking/${shippingResult.tracking}` : `https://pathao.com/courier/tracking/${shippingResult.tracking}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Track in {shippingResult.provider.toUpperCase()} <ExternalLink size={12} />
              </a>
            )}
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase text-center border-b border-gray-100">Product Name</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase text-center border-b border-l border-gray-100">Unit Price</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase text-center border-b border-l border-gray-100">QTY</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase text-center border-b border-l border-gray-100">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.products.map((p, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 flex items-center gap-4">
                    <img src={p.img} alt={p.name} className="w-12 h-12 rounded border border-gray-100 p-1 object-cover" />
                    <div className="max-w-xs">
                      <p className="text-xs font-medium text-gray-800 line-clamp-1">{p.name}</p>
                      <p className="text-[10px] font-bold text-green-500 uppercase">{p.brand}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600 border-l border-gray-100">৳{p.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600 border-l border-gray-100">{p.qty}</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-gray-800 border-l border-gray-100">৳{(p.price * p.qty).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-6 border-t border-gray-100 flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold text-gray-800">৳{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping Charge</span>
                <span className="font-bold text-gray-800">৳{order.shippingCharge}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-bold text-green-500">Saved (৳{order.discount.toLocaleString()})</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-800">Total</span>
                <span className="font-bold text-gray-800 text-lg">৳{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar Info */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-gray-500 italic">Customer Details</h4>
              <button className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded font-bold uppercase">View Profile</button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <img src={order.customer.avatar} alt={order.customer.name} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="text-sm font-bold text-gray-800">{order.customer.name}</p>
                <p className="text-[10px] text-green-500 font-bold uppercase">User</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-500">
              <p className="font-bold text-green-500">Orders : {order.customer.orderCount}</p>
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-gray-400" /> {order.customer.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-gray-400" /> {order.customer.phone}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
            <h4 className="text-sm font-bold text-orange-500 italic mb-4">Delivery Addresses</h4>
            <div className="flex gap-3 mb-4">
              <MapPin size={16} className="text-gray-300 shrink-0" />
              <p className="text-xs text-gray-500 leading-relaxed">{order.address}</p>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center gap-1 font-medium text-gray-700">
                {order.customer.name}
              </div>
              <div className="flex items-center gap-1">
                <Phone size={12} className="text-gray-300" /> {order.customer.phone}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
            <h4 className="text-sm font-bold text-orange-500 italic mb-4">Payment Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-bold text-gray-800 uppercase">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total Amount:</span>
                <span className="font-bold text-gray-800">৳{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};