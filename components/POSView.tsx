
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  UserPlus, 
  X, 
  Check,
  ChevronDown,
  Loader2,
  CheckCircle,
  Truck,
  Send,
  ExternalLink
} from 'lucide-react';
import { InventoryProduct, Customer, Product, Order } from '../types';

interface POSViewProps {
  products: InventoryProduct[];
  customers: Customer[];
  categories: { id: number, name: string }[];
  onPlaceOrder: (order: Omit<Order, 'id' | 'timestamp' | 'date' | 'statusHistory'>) => Promise<Order | null>;
  onSendToCourier: (order: Order, courier: 'Steadfast' | 'Pathao') => Promise<any>;
}

interface CartItem extends Product {
  originalStock: number;
}

export const POSView: React.FC<POSViewProps> = ({ products, customers, categories, onPlaceOrder, onSendToCourier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Hand Cash' | 'Card Pay'>('Hand Cash');
  
  // Placement states
  const [isPlacing, setIsPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isSendingCourier, setIsSendingCourier] = useState(false);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: InventoryProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        brand: product.brand || 'N/A',
        price: product.price,
        qty: 1,
        img: product.img,
        originalStock: product.stock
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const finalTotal = subtotal - extraDiscount;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (!selectedCustomer) return alert("Please select a customer!");

    setIsPlacing(true);
    try {
      const order = await onPlaceOrder({
        customer: selectedCustomer,
        address: "Point of Sale Entry",
        products: cart.map(({ originalStock, ...rest }) => rest),
        paymentMethod,
        subtotal,
        shippingCharge: 0,
        discount: extraDiscount,
        total: finalTotal,
        status: 'Delivered'
      });
      
      if (order) {
        setPlacedOrder(order);
        setCart([]);
        setExtraDiscount(0);
        setSelectedCustomer(null);
      }
    } catch (e) {
      alert("Failed to place order.");
    } finally {
      setIsPlacing(false);
    }
  };

  const handleSendCourier = async (courier: 'Steadfast' | 'Pathao') => {
    if (!placedOrder) return;
    setIsSendingCourier(true);
    try {
      await onSendToCourier(placedOrder, courier);
      setPlacedOrder(null); // Close modal on success
      alert(`Order sent to ${courier} successfully!`);
    } catch (e) {
      alert("Courier submission failed.");
    } finally {
      setIsSendingCourier(false);
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500 overflow-hidden relative">
      {/* Product Section */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Top Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">All Products</h2>
            <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-bold border border-orange-100">
              {filteredProducts.length}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 max-w-[400px]">
            <button 
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === 'All' ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
              All Products
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.name ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-orange-500 w-48 lg:w-64 transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Loader2 size={48} className="animate-spin text-orange-600 mb-4" />
              <p className="text-sm font-bold">Synchronizing with WordPress...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-2xl border border-gray-100 p-3 hover:shadow-xl transition-all group cursor-pointer relative flex flex-col active:scale-95"
                >
                  {product.discountPercent > 0 && (
                    <div className="absolute top-3 left-3 z-10 bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-sm">
                      -{product.discountPercent}% OFF
                    </div>
                  )}
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3 border border-gray-100 relative">
                    <img 
                      src={product.img} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                       <Plus className="text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all drop-shadow-md" size={32} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[13px] font-bold text-gray-800 line-clamp-1 mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between text-[10px] mb-2 font-bold uppercase tracking-tight">
                      <span className="text-gray-400">{product.brand || 'No Brand'}</span>
                      <span className={product.stock > 0 ? 'text-green-500' : 'text-red-500'}>
                        In Stock: {product.stock}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-orange-600">৳{product.price.toLocaleString()}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[11px] text-gray-400 line-through">৳{product.originalPrice.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
              <Search size={48} className="mb-4" />
              <p className="text-sm font-bold">No products found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bill Details Section */}
      <div className="w-[400px] bg-white border border-gray-100 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-500">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-gray-800 text-lg">Bill Details</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Instant POS Terminal</p>
          </div>
          <button 
            onClick={() => setCart([])} 
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Clear Cart"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* Customer Selector */}
        <div className="p-6 pb-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Recipient Customer</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <select 
                className="w-full appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-orange-500 cursor-pointer font-bold text-gray-700 transition-all"
                value={selectedCustomer?.email || ''}
                onChange={(e) => setSelectedCustomer(customers.find(c => c.email === e.target.value) || null)}
              >
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.email} value={c.email}>{c.name} ({c.phone})</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
            <button className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-orange-100 hover:bg-orange-700 active:scale-95 transition-all">
              <UserPlus size={20} />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {cart.length > 0 ? cart.map(item => (
            <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 group hover:border-orange-200 transition-all shadow-sm">
              <img src={item.img} alt={item.name} className="w-14 h-14 rounded-xl object-cover border border-gray-50 shadow-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-800 line-clamp-1">{item.name}</p>
                <p className="text-xs text-orange-600 font-black mt-0.5">৳{item.price.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-xl p-1.5 border border-gray-100">
                <button onClick={() => updateQty(item.id, 1)} className="text-gray-400 hover:text-orange-600 transition-colors">
                  <Plus size={14} />
                </button>
                <span className="text-xs font-black text-gray-800">{item.qty}</span>
                <button onClick={() => updateQty(item.id, -1)} className="text-gray-400 hover:text-orange-600 transition-colors">
                  <Minus size={14} />
                </button>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors px-1">
                <X size={18} />
              </button>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-6 opacity-40 scale-90">
              <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200">
                <ShoppingCart size={40} />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest italic">Your billing cart is empty</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-6 bg-gray-50/80 border-t border-gray-100 space-y-5">
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Extra Discount</span>
            <div className="relative w-24">
              <input 
                type="number" 
                value={extraDiscount}
                onChange={(e) => setExtraDiscount(parseFloat(e.target.value) || 0)}
                className="w-full pl-6 pr-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-black text-right outline-none focus:border-orange-500"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">৳</span>
            </div>
          </div>

          <div className="space-y-3 px-1">
            <div className="flex justify-between text-xs font-bold text-gray-500">
              <span>Subtotal</span>
              <span>৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-green-500">
              <span>Discount</span>
              <span>- ৳{extraDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-4">
              <span className="font-black text-gray-800 uppercase text-xs tracking-wider">Net Total</span>
              <span className="text-2xl font-black text-orange-600">৳{finalTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Payment Channel</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setPaymentMethod('Hand Cash')}
                className={`py-3 px-4 rounded-2xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2 border shadow-sm ${paymentMethod === 'Hand Cash' ? 'bg-orange-600 text-white border-orange-600 shadow-orange-100' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {paymentMethod === 'Hand Cash' && <Check size={14} />} Hand Cash
              </button>
              <button 
                onClick={() => setPaymentMethod('Card Pay')}
                className={`py-3 px-4 rounded-2xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2 border shadow-sm ${paymentMethod === 'Card Pay' ? 'bg-orange-600 text-white border-orange-600 shadow-orange-100' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {paymentMethod === 'Card Pay' && <Check size={14} />} Card Pay
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button 
              onClick={() => setCart([])}
              className="py-4 bg-gray-100 text-gray-500 font-black rounded-2xl text-xs hover:bg-gray-200 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={handlePlaceOrder}
              disabled={isPlacing || cart.length === 0}
              className="py-4 bg-orange-600 text-white font-black rounded-2xl text-xs shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPlacing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Order Placed
            </button>
          </div>
        </div>
      </div>

      {/* Post-Order Action Modal */}
      {placedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-8 text-center bg-emerald-50 relative">
               <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-200 animate-bounce">
                  <Check size={40} strokeWidth={3} />
               </div>
               <h3 className="text-2xl font-black text-gray-800 mb-1">Order Placed Successfully!</h3>
               <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Order ID: {placedOrder.id}</p>
               <button onClick={() => setPlacedOrder(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                  <X size={24} />
               </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                    <Truck className="text-orange-500" size={24} />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Instant Fulfillment</p>
                    <p className="text-sm font-bold text-gray-700">Send this order to courier directly from here.</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleSendCourier('Steadfast')}
                  disabled={isSendingCourier}
                  className="flex flex-col items-center gap-4 p-6 bg-white border-2 border-orange-100 rounded-3xl hover:bg-orange-50 hover:border-orange-500 transition-all group shadow-sm"
                >
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Send size={24} />
                  </div>
                  <span className="font-black text-gray-800 text-sm">Steadfast</span>
                </button>
                <button 
                  onClick={() => handleSendCourier('Pathao')}
                  disabled={isSendingCourier}
                  className="flex flex-col items-center gap-4 p-6 bg-white border-2 border-red-100 rounded-3xl hover:bg-red-50 hover:border-red-500 transition-all group shadow-sm"
                >
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Truck size={24} />
                  </div>
                  <span className="font-black text-gray-800 text-sm">Pathao</span>
                </button>
              </div>

              <button 
                onClick={() => setPlacedOrder(null)}
                className="w-full py-4 bg-gray-800 text-white font-black rounded-2xl text-sm shadow-xl hover:bg-black transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                Close & Go to Dashboard
              </button>
            </div>

            {isSendingCourier && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[210]">
                 <Loader2 size={48} className="animate-spin text-orange-600 mb-4" />
                 <p className="text-sm font-black text-gray-800 uppercase tracking-widest">Processing Courier Request...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
