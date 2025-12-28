
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

  useEffect(() => {
    if (initialProducts.length > 0) {
      setAllProducts(initialProducts);
    }
  }, [initialProducts]);

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

  const handleAddProduct = async () => {
    const config = await getWPConfig();
    if (config && config.url) {
      const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
      window.open(`${baseUrl}/wp-admin/post-new.php?post_type=product`, '_blank');
    } else {
      alert("Please configure your WordPress connection first.");
    }
  };

  return (
    <div className="flex gap-6 animate-in fade-in duration-500 pb-20">
      <div className="flex-1 space-y-4">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-800">All Products</h2>
              <span className="w-6 h-6 rounded-full border border-orange-500 text-orange-500 flex items-center justify-center text-[10px] font-bold">
                {filteredProducts.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-500 outline-none"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Products..." 
                  className="pl-4 pr-10 py-2 border border-gray-200 rounded-md text-sm w-64 outline-none"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
              <button 
                onClick={handleAddProduct}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Plus size={16} /> Add Product
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase">Product Name</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase">Price</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase">Stock</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/30">
                    <td className="px-6 py-5 flex items-center gap-4">
                      <img src={p.img} alt={p.name} className="w-12 h-12 rounded border p-1 object-cover" />
                      <div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium">৳{p.price.toLocaleString()}</td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-gray-700">{p.stock}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div 
                        onClick={() => toggleStatus(p.id)}
                        className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${p.status ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${p.status ? 'right-1' : 'left-1'}`} />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="text-orange-600 text-xs font-bold">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-80 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-800">Tags</h3>
            <button onClick={clearAllFilters} className="text-[10px] text-gray-400 underline uppercase">Clear All</button>
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
          <h3 className="text-sm font-bold text-gray-800 mb-6">Category</h3>
          <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {loadingCategories ? (
              <Loader2 className="animate-spin text-orange-500 mx-auto" />
            ) : categories.map(cat => (
              <CategoryFilterItem 
                key={cat.id} 
                label={cat.name} 
                count={cat.count} 
                checked={selectedCategories.includes(cat.name)}
                onToggle={() => toggleCategory(cat.name)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
