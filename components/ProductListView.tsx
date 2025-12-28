
import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, Plus, Info, X, Loader2 } from 'lucide-react';
import { InventoryProduct } from '../types';
import { fetchCategoriesFromWP, WPCategory, getWPConfig } from '../services/wordpressService';

interface ProductListViewProps {
  initialProducts?: InventoryProduct[];
}

const CategoryFilterItem: React.FC<{ 
  label: string; 
  count: number; 
  checked: boolean;
  onToggle: () => void;
}> = ({ label, count, checked, onToggle }) => (
  <div 
    onClick={onToggle}
    className="flex items-center justify-between py-2 group cursor-pointer"
  >
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
        {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <span className={`text-xs ${checked ? 'text-gray-900 font-medium' : 'text-gray-500 group-hover:text-gray-700'}`}>{label}</span>
    </div>
    <span className="text-[10px] text-gray-400 font-bold">{count}</span>
  </div>
);

export const ProductListView: React.FC<ProductListViewProps> = ({ initialProducts = [] }) => {
  const [allProducts, setAllProducts] = useState<InventoryProduct[]>(initialProducts);
  const [categories, setCategories] = useState<WPCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Load Categories on Mount
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const fetchedCats = await fetchCategoriesFromWP();
        setCategories(fetchedCats);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Update state when products change
  useEffect(() => {
    if (initialProducts.length > 0) {
      setAllProducts(initialProducts);
    }
  }, [initialProducts]);

  // Dynamic filtering logic
  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category);
      const matchesPrice = p.price >= priceRange.min && p.price <= priceRange.max;
      const matchesStatus = statusFilter === 'All' || 
                           (statusFilter === 'Active' && p.status) || 
                           (statusFilter === 'Inactive' && !p.status);
      
      return matchesSearch && matchesCategory && matchesPrice && matchesStatus;
    });
  }, [allProducts, searchTerm, selectedCategories, priceRange, statusFilter]);

  // Handlers for in-table updates
  const toggleStatus = (id: string) => {
    setAllProducts(prev => prev.map(p => p.id === id ? { ...p, status: !p.status } : p));
  };

  const incrementStock = (id: string) => {
    setAllProducts(prev => prev.map(p => p.id === id ? { ...p, stock: p.stock + 1 } : p));
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setPriceRange({ min: 0, max: 1000000 });
    setStatusFilter('All');
  };

  // Correctly handle async getWPConfig in handleAddProduct
  const handleAddProduct = async () => {
    const config = await getWPConfig();
    if (config && config.url) {
      const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
      // WooCommerce specific product creation link in WP Admin
      window.open(`${baseUrl}/wp-admin/post-new.php?post_type=product`, '_blank');
    } else {
      alert("Please configure your WordPress connection first using the 'WP Connect' button in the top bar.");
    }
  };

  return (
    <div className="flex gap-6 animate-in fade-in duration-500 pb-20">
      <div className="flex-1 space-y-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-800">All Products</h2>
              <span className="w-6 h-6 rounded-full border border-orange-500 text-orange-500 flex items-center justify-center text-[10px] font-bold transition-all">
                {filteredProducts.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="appearance-none flex items-center gap-8 px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500 bg-white hover:border-orange-200 transition-colors outline-none cursor-pointer pr-10"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Products..." 
                  className="pl-4 pr-10 py-2 border border-gray-200 rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 bg-gray-50/50"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
              <button 
                onClick={handleAddProduct}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-orange-700 transition-colors"
              >
                <Plus size={16} /> Add Product
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-4 text-xs font-medium text-gray-400">Product Name</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400">Price</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400">Stock</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400">Status</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded bg-gray-50 border border-gray-100 flex items-center justify-center p-1 overflow-hidden">
                          <img src={p.img} alt={p.name} className="w-full h-full object-cover rounded" />
                        </div>
                        <div className="max-w-[300px]">
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">{p.name}</p>
                          <p className="text-[11px] font-bold text-green-500 uppercase mt-0.5">{p.brand}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Category: {p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-800">
                          ৳{p.price.toLocaleString()}
                          {p.originalPrice && (
                            <span className="text-[10px] text-gray-400 line-through ml-2">৳{p.originalPrice.toLocaleString()}</span>
                          )}
                        </p>
                        {p.discountPercent > 0 && (
                          <p className="text-[10px] font-bold text-green-500">({p.discountPercent}% OFF)</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-md">
                        <span className="text-xs font-bold text-gray-700">{p.stock}</span>
                        <Plus 
                          size={12} 
                          className="text-gray-400 cursor-pointer hover:text-orange-500 transition-colors" 
                          onClick={() => incrementStock(p.id)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div 
                          onClick={() => toggleStatus(p.id)}
                          className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${p.status ? 'bg-green-500' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${p.status ? 'right-1' : 'left-1'}`} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-800 uppercase">{p.status ? 'ON' : 'OFF'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="inline-flex items-center gap-2 px-4 py-1.5 border border-orange-200 rounded-lg text-orange-600 text-[11px] font-bold hover:bg-orange-50 transition-colors">
                        Info <ChevronDown size={14} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <X className="w-8 h-8 opacity-20" />
                        <p className="text-sm italic">No products found matching your filters</p>
                        <button 
                          onClick={clearAllFilters}
                          className="text-xs text-orange-500 underline mt-2"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-80 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-800">Tags</h3>
            <button 
              onClick={clearAllFilters}
              className="text-[10px] text-gray-400 underline uppercase font-bold tracking-wider hover:text-orange-500"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-full flex items-center gap-2">
                "{searchTerm}" <X size={10} className="cursor-pointer" onClick={() => setSearchTerm('')} />
              </span>
            )}
            {selectedCategories.map(cat => (
              <span key={cat} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full flex items-center gap-2">
                {cat} <X size={10} className="cursor-pointer" onClick={() => toggleCategory(cat)} />
              </span>
            ))}
            {!searchTerm && selectedCategories.length === 0 && (
              <p className="text-[10px] text-gray-400 italic">No active tags</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-6">Product Category</h3>
          <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {loadingCategories ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-orange-500 opacity-50" />
              </div>
            ) : categories.length > 0 ? (
              categories.map(cat => (
                <CategoryFilterItem 
                  key={cat.id} 
                  label={cat.name} 
                  count={cat.count} 
                  checked={selectedCategories.includes(cat.name)}
                  onToggle={() => toggleCategory(cat.name)}
                />
              ))
            ) : (
              <p className="text-[10px] text-gray-400 italic">No categories available</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-6">Price Range</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 p-2 bg-gray-50 border border-gray-100 rounded-lg">
              <input 
                type="number" 
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none" 
              />
            </div>
            <div className="flex-1 p-2 bg-gray-50 border border-gray-100 rounded-lg">
              <input 
                type="number" 
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none" 
              />
            </div>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1000000" 
            step="1000"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
            className="w-full mt-4 accent-orange-500 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
