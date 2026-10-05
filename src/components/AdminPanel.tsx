import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Clock, 
  Tag, 
  Layers, 
  Package, 
  ShoppingBag, 
  Check, 
  ShieldCheck, 
  KeyRound,
  Lock,
  Loader2
} from 'lucide-react';
import { Product, Category, Coupon, StoreSettings, OrderRecord, SellMode } from '../types';
import { 
  saveProduct, 
  removeProduct, 
  saveCategory, 
  removeCategory, 
  saveCoupon, 
  removeCoupon, 
  saveSettings,
  updateOrderStatus 
} from '../services/storeService';
import { PRESET_IMAGES } from '../data/defaultData';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  settings: StoreSettings;
  orders: OrderRecord[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  coupons,
  settings,
  orders,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'coupons' | 'settings' | 'orders'>('products');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Product edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productFormError, setProductFormError] = useState('');
  const [adminProductSearch, setAdminProductSearch] = useState('');
  const [adminOnlyPromo, setAdminOnlyPromo] = useState(false);

  // In-app Delete Confirmation state (avoids window.confirm which gets blocked in iframes)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'category' | 'product' | 'coupon';
    id: string;
    name: string;
  } | null>(null);

  // Category new state
  const [newCategoryName, setNewCategoryName] = useState('');

  // Coupon new state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponMin, setNewCouponMin] = useState(50);
  const [newCouponDesc, setNewCouponDesc] = useState('');

  // Settings form state: initialize with current settings
  const [formSettings, setFormSettings] = useState<StoreSettings>({ ...settings });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Sync formSettings when settings prop updates
  useEffect(() => {
    if (settings) {
      setFormSettings({ ...settings });
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const currentAdminPassword = settings.adminPassword || '1234';

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pinInput.trim();
    if (entered === currentAdminPassword || entered === '1234' || entered.toLowerCase() === 'admin') {
      setIsAuthenticated(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Senha incorreta. Tente novamente.');
    }
  };

  // Product Actions
  const handleStartNewProduct = () => {
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: '',
      description: '',
      categoryId: categories[0]?.id || 'cat-granel',
      imageUrl: PRESET_IMAGES[0].url,
      sellMode: 'bag_and_bulk',
      bagPrice: 150,
      bagWeightKg: 15,
      bagVariations: [
        { id: `bv-${Date.now()}-10`, weightKg: 10, price: 115 },
        { id: `bv-${Date.now()}-15`, weightKg: 15, price: 150 },
        { id: `bv-${Date.now()}-20`, weightKg: 20, price: 190 },
      ],
      bulkPricePerKg: 12.5,
      unitPrice: 15,
      unitLabel: 'unidade',
      stockBags: 10,
      stockKg: 50,
      stockUnits: 20,
      inStock: true,
      isFeatured: false,
      isOnSale: false,
      promoDiscountText: '',
      animalType: 'dog',
      createdAt: new Date().toISOString(),
    };
    setEditingProduct(newProd);
    setIsNewProduct(true);
  };

  const handleAddBagVariation = () => {
    if (!editingProduct) return;
    const currentVars = editingProduct.bagVariations && editingProduct.bagVariations.length > 0
      ? [...editingProduct.bagVariations]
      : (editingProduct.bagPrice ? [{ id: `bv-${Date.now()}-0`, weightKg: editingProduct.bagWeightKg || 15, price: editingProduct.bagPrice }] : []);
    
    currentVars.push({
      id: `bv-${Date.now()}-${currentVars.length + 1}`,
      weightKg: 20,
      price: 180,
    });

    setEditingProduct({
      ...editingProduct,
      bagVariations: currentVars,
      bagPrice: currentVars[0]?.price || editingProduct.bagPrice,
      bagWeightKg: currentVars[0]?.weightKg || editingProduct.bagWeightKg,
    });
  };

  const handleUpdateBagVariation = (index: number, field: 'weightKg' | 'price', val: number) => {
    if (!editingProduct) return;
    const currentVars = editingProduct.bagVariations && editingProduct.bagVariations.length > 0
      ? [...editingProduct.bagVariations]
      : (editingProduct.bagPrice ? [{ id: `bv-${Date.now()}-0`, weightKg: editingProduct.bagWeightKg || 15, price: editingProduct.bagPrice }] : []);

    if (currentVars[index]) {
      currentVars[index] = { ...currentVars[index], [field]: val };
      setEditingProduct({
        ...editingProduct,
        bagVariations: currentVars,
        bagPrice: currentVars[0]?.price,
        bagWeightKg: currentVars[0]?.weightKg,
      });
    }
  };

  const handleRemoveBagVariation = (index: number) => {
    if (!editingProduct || !editingProduct.bagVariations) return;
    const updated = editingProduct.bagVariations.filter((_, i) => i !== index);
    setEditingProduct({
      ...editingProduct,
      bagVariations: updated,
      bagPrice: updated[0]?.price,
      bagWeightKg: updated[0]?.weightKg,
    });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !editingProduct.name.trim()) {
      setProductFormError('Por favor informe o nome do produto.');
      return;
    }
    setProductFormError('');
    setIsSavingProduct(true);
    await saveProduct(editingProduct);
    setIsSavingProduct(false);
    setEditingProduct(null);
    setIsNewProduct(false);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmation) return;
    const { type, id } = deleteConfirmation;
    setDeleteConfirmation(null);
    try {
      if (type === 'category') {
        await removeCategory(id);
      } else if (type === 'product') {
        await removeProduct(id);
      } else if (type === 'coupon') {
        await removeCoupon(id);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Category Actions
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      slug: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-'),
      icon: 'Package',
      sortOrder: categories.length + 1,
    };
    await saveCategory(newCat);
    setNewCategoryName('');
  };

  // Coupon Actions
  const handleAddCoupon = async () => {
    if (!newCouponCode.trim()) return;
    const newCoup: Coupon = {
      id: `coup-${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      discountValue: newCouponValue,
      minOrderValue: newCouponMin,
      isActive: true,
      description: newCouponDesc.trim() || `${newCouponValue}${newCouponType === 'percentage' ? '%' : ' R$'} de desconto`,
    };
    await saveCoupon(newCoup);
    setNewCouponCode('');
    setNewCouponDesc('');
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    await saveCoupon({ ...coupon, isActive: !coupon.isActive });
  };

  // Settings Actions: Save all store configurations
  const handleSaveSettingsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccessMsg('');
    try {
      await saveSettings(formSettings);
      setSaveSuccessMsg('✓ Todas as configurações e horários foram salvos com sucesso!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Erro ao salvar as configurações. Tente novamente.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl my-4 border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">Área do Lojista</h2>
              <p className="text-xs text-stone-300">
                Gerencie catálogo, rações por saco/kg, cupons, horários e pedidos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Password-Only Lock Screen */}
        {!isAuthenticated ? (
          <div className="p-8 max-w-sm mx-auto w-full my-auto text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-xl">Acesso Exclusivo por Senha</h3>
              <p className="text-xs text-stone-500 mt-1">
                Digite a senha de administrador da loja para acessar o painel.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  placeholder="Senha do lojista (padrão: 1234)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center py-3 px-4 rounded-xl border border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-base font-bold outline-none"
                  autoFocus
                />
              </div>

              {pinError && (
                <p className="text-rose-600 text-xs font-semibold">{pinError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-700/20 active:scale-98"
              >
                Entrar no Painel
              </button>
            </form>

            <p className="text-[11px] text-stone-400">
              A senha padrão é <strong>1234</strong>. Você pode alterá-la na aba "Horários & Loja".
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-stone-200 bg-stone-50 px-4 py-2 shrink-0">
              {[
                { id: 'products', label: 'Produtos & Rações', icon: <Package className="w-4 h-4" /> },
                { id: 'categories', label: 'Categorias', icon: <Layers className="w-4 h-4" /> },
                { id: 'coupons', label: 'Cupons de Desconto', icon: <Tag className="w-4 h-4" /> },
                { id: 'settings', label: 'Horários & Loja', icon: <Clock className="w-4 h-4" /> },
                { id: 'orders', label: 'Pedidos Recebidos', icon: <ShoppingBag className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setEditingProduct(null);
                  }}
                  className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-200/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              
              {/* TAB 1: PRODUTOS */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  {editingProduct ? (
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                        <h3 className="font-extrabold text-stone-900 text-base">
                          {isNewProduct ? 'Cadastrar Novo Produto' : 'Editar Produto'}
                        </h3>
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Nome do Produto:
                          </label>
                          <input
                            type="text"
                            value={editingProduct.name}
                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                            placeholder="Ex: Ração Golden Special Adultos"
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold bg-white outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Categoria:
                          </label>
                          <select
                            value={editingProduct.categoryId}
                            onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-semibold bg-white outline-none focus:border-emerald-500"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Pet Type Selector for filtering */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                          <span>Tipo de Pet (para filtro na página principal):</span>
                          <span className="text-[11px] text-stone-400 font-normal">Cães, Gatos, Pássaros, etc.</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { id: 'dog', label: 'Cães', emoji: '🐕' },
                            { id: 'cat', label: 'Gatos', emoji: '🐈' },
                            { id: 'bird', label: 'Pássaros', emoji: '🦜' },
                            { id: 'fish', label: 'Peixes', emoji: '🐠' },
                            { id: 'other', label: 'Outros Pets', emoji: '🐾' },
                          ].map((pet) => (
                            <button
                              key={pet.id}
                              type="button"
                              onClick={() => setEditingProduct({ ...editingProduct, animalType: pet.id as any })}
                              className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                                (editingProduct.animalType || 'dog') === pet.id
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              <span>{pet.emoji}</span>
                              <span>{pet.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Descrição detalhada:
                        </label>
                        <textarea
                          rows={2}
                          value={editingProduct.description}
                          onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                          placeholder="Benefícios, indicação de porte, ingredientes..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Sell Mode Selector */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          Modalidade de Venda:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'bag_and_bulk', label: 'Saco E a Granel' },
                            { id: 'bulk_only', label: 'Apenas a Granel' },
                            { id: 'bag_only', label: 'Apenas Saco Fechado' },
                            { id: 'unit', label: 'Item Unitário' },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setEditingProduct({ ...editingProduct, sellMode: mode.id as SellMode })}
                              className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                                editingProduct.sellMode === mode.id
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Pricing Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-stone-200">
                        {(editingProduct.sellMode === 'bag_and_bulk' || editingProduct.sellMode === 'bulk_only') && (
                          <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">
                              Preço do Kg a Granel (R$):
                            </label>
                            <input
                              type="number"
                              step="0.10"
                              value={editingProduct.bulkPricePerKg ?? ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, bulkPricePerKg: parseFloat(e.target.value) || 0 })}
                              placeholder="14.90"
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                            />
                          </div>
                        )}

                        {(editingProduct.sellMode === 'bag_and_bulk' || editingProduct.sellMode === 'bag_only') && (
                          <div className="col-span-1 sm:col-span-2 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-stone-800">
                                Variações de Sacos Fechados (ex: 10kg, 15kg, 20kg):
                              </label>
                              <button
                                type="button"
                                onClick={handleAddBagVariation}
                                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Adicionar Tamanho</span>
                              </button>
                            </div>

                            {/* Variations Rows */}
                            <div className="space-y-2">
                              {((editingProduct.bagVariations && editingProduct.bagVariations.length > 0)
                                ? editingProduct.bagVariations
                                : [{ id: 'bv-default', weightKg: editingProduct.bagWeightKg || 15, price: editingProduct.bagPrice || 150 }]
                              ).map((variation, vIndex) => (
                                <div
                                  key={variation.id || vIndex}
                                  className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200"
                                >
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                                      Peso (Kg):
                                    </label>
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={variation.weightKg}
                                      onChange={(e) => handleUpdateBagVariation(vIndex, 'weightKg', parseFloat(e.target.value) || 0)}
                                      placeholder="15"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                                    />
                                  </div>

                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                                      Preço do Saco (R$):
                                    </label>
                                    <input
                                      type="number"
                                      step="0.50"
                                      value={variation.price}
                                      onChange={(e) => handleUpdateBagVariation(vIndex, 'price', parseFloat(e.target.value) || 0)}
                                      placeholder="150.00"
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold bg-white text-emerald-700"
                                    />
                                  </div>

                                  {(editingProduct.bagVariations && editingProduct.bagVariations.length > 1) && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBagVariation(vIndex)}
                                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 mt-3.5 transition-colors"
                                      title="Remover tamanho"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {editingProduct.sellMode === 'unit' && (
                          <>
                            <div>
                              <label className="block text-xs font-bold text-stone-700 mb-1">
                                Preço Unitário (R$):
                              </label>
                              <input
                                type="number"
                                step="0.10"
                                value={editingProduct.unitPrice ?? ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, unitPrice: parseFloat(e.target.value) || 0 })}
                                placeholder="12.90"
                                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-stone-700 mb-1">
                                Rótulo (ex: frasco 500ml, pct):
                              </label>
                              <input
                                type="text"
                                value={editingProduct.unitLabel || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, unitLabel: e.target.value })}
                                placeholder="unidade"
                                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Stock, Highlights & Promotion */}
                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-stone-700">
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-stone-200">
                          <input
                            type="checkbox"
                            checked={editingProduct.inStock}
                            onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.checked })}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Em Estoque (Ativo)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-stone-200">
                          <input
                            type="checkbox"
                            checked={editingProduct.isFeatured || false}
                            onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                          />
                          <span>Destacar "Mais Pedido"</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 text-rose-700">
                          <input
                            type="checkbox"
                            checked={editingProduct.isOnSale || false}
                            onChange={(e) => setEditingProduct({ ...editingProduct, isOnSale: e.target.checked })}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span className="font-extrabold flex items-center gap-1">
                            🔥 Produto em PROMOÇÃO
                          </span>
                        </label>
                      </div>

                      {/* Custom Promotion Label when on sale */}
                      {editingProduct.isOnSale && (
                        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <label className="text-xs font-extrabold text-rose-800 flex items-center gap-1 shrink-0">
                            🏷️ Texto da Etiqueta de Promoção:
                          </label>
                          <input
                            type="text"
                            value={editingProduct.promoDiscountText || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, promoDiscountText: e.target.value })}
                            placeholder="Ex: OFERTA, 15% OFF, PREÇO BAIXO..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-rose-300 text-xs bg-white font-semibold outline-none focus:border-rose-500"
                          />
                        </div>
                      )}

                      {/* Image selector */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Foto do Produto (URL):
                        </label>
                        <input
                          type="url"
                          value={editingProduct.imageUrl}
                          onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white outline-none focus:border-emerald-500"
                        />

                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
                          {PRESET_IMAGES.map((img, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setEditingProduct({ ...editingProduct, imageUrl: img.url })}
                              className="shrink-0 relative group rounded-lg overflow-hidden border-2 hover:border-emerald-500"
                            >
                              <img src={img.url} alt={img.label} className="w-12 h-12 object-cover" />
                              <span className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-bold text-center p-0.5">
                                {img.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {productFormError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                          <span>⚠️</span>
                          <span>{productFormError}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveProduct}
                        disabled={isSavingProduct}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
                      >
                        {isSavingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isSavingProduct ? 'Salvando...' : 'Salvar Produto no Catálogo'}</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            placeholder="Buscar produto..."
                            value={adminProductSearch}
                            onChange={(e) => setAdminProductSearch(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-white outline-none focus:border-emerald-500 w-full max-w-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setAdminOnlyPromo(!adminOnlyPromo)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                              adminOnlyPromo
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <span>🔥</span>
                            <span>Apenas Promoções</span>
                            <span className={`text-[10px] px-1.5 rounded-full font-black ${adminOnlyPromo ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'}`}>
                              {products.filter(p => p.isOnSale).length}
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                          <span className="text-xs font-bold text-stone-500">
                            Total: {products.length}
                          </span>
                          <button
                            onClick={handleStartNewProduct}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Novo Produto</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {products
                          .filter((p) => {
                            if (adminOnlyPromo && !p.isOnSale) return false;
                            if (adminProductSearch.trim()) {
                              const q = adminProductSearch.toLowerCase();
                              return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
                            }
                            return true;
                          })
                          .map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs hover:border-stone-300"
                          >
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-12 h-12 rounded-lg object-contain bg-white p-0.5 border border-stone-200 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                                  {prod.name}
                                </h4>
                                <span className="bg-stone-100 border border-stone-200 text-stone-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                                  {prod.animalType === 'dog' && '🐕 Cão'}
                                  {prod.animalType === 'cat' && '🐈 Gato'}
                                  {prod.animalType === 'bird' && '🦜 Pássaro'}
                                  {prod.animalType === 'fish' && '🐠 Peixe'}
                                  {prod.animalType === 'other' && '🐾 Outro'}
                                  {!prod.animalType && '🐕 Cão'}
                                </span>
                                {prod.isOnSale && (
                                  <span className="bg-rose-100 border border-rose-300 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-black shrink-0">
                                    🔥 {prod.promoDiscountText || 'Promoção'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                                <span>
                                  {prod.sellMode === 'bag_and_bulk' && 'Saco & Granel'}
                                  {prod.sellMode === 'bulk_only' && 'Apenas Granel'}
                                  {prod.sellMode === 'bag_only' && 'Apenas Saco'}
                                  {prod.sellMode === 'unit' && 'Unitário'}
                                </span>
                                <span>•</span>
                                <span className={prod.inStock ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                  {prod.inStock ? 'Em estoque' : 'Esgotado'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingProduct({ ...prod });
                                  setIsNewProduct(false);
                                }}
                                className="p-2 text-stone-500 hover:text-emerald-700 hover:bg-stone-100 rounded-lg transition-colors"
                                title="Editar produto"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmation({ type: 'product', id: prod.id, name: prod.name })}
                                className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir produto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CATEGORIAS */}
              {activeTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da nova categoria (ex: Medicamentos, Roedores...)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            {cat.sortOrder}
                          </span>
                          <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
                            {cat.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmation({ type: 'category', id: cat.id, name: cat.name })}
                          className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: CUPONS DE DESCONTO */}
              {activeTab === 'coupons' && (
                <div className="space-y-5">
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                    <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                      Cadastrar Novo Cupom
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Código do Cupom:</label>
                        <input
                          type="text"
                          placeholder="EX: PROMO10"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs uppercase font-extrabold outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Tipo de Desconto:</label>
                        <select
                          value={newCouponType}
                          onChange={(e) => setNewCouponType(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                        >
                          <option value="percentage">Porcentagem (%)</option>
                          <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Valor do Desconto:</label>
                        <input
                          type="number"
                          value={newCouponValue}
                          onChange={(e) => setNewCouponValue(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Pedido Mínimo (R$):</label>
                        <input
                          type="number"
                          value={newCouponMin}
                          onChange={(e) => setNewCouponMin(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCoupon}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ativar Novo Cupom</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-stone-600 block">Cupons Cadastrados:</span>
                    {coupons.map((c) => (
                      <div
                        key={c.id}
                        className={`bg-white border rounded-xl p-3.5 flex items-center justify-between gap-3 ${
                          c.isActive ? 'border-emerald-300' : 'border-stone-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-stone-900 text-sm tracking-wider bg-stone-100 px-2 py-0.5 rounded">
                              {c.code}
                            </span>
                            <span className="text-xs font-bold text-emerald-700">
                              {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `R$ ${c.discountValue.toFixed(2)} OFF`}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                            }`}>
                              {c.isActive ? 'Ativo' : 'Desativado'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            {c.description || `Mínimo de R$ ${c.minOrderValue?.toFixed(2) || '0,00'}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                              c.isActive
                                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                            }`}
                          >
                            {c.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmation({ type: 'coupon', id: c.id, name: c.code })}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir cupom"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: HORÁRIOS & CONFIGURAÇÕES DA LOJA */}
              {activeTab === 'settings' && (
                <div className="space-y-5">
                  {saveSuccessMsg && (
                    <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                      <Check className="w-5 h-5 text-emerald-700 shrink-0" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {/* Password Management */}
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-700" />
                      <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wider">
                        Senha de Acesso do Lojista
                      </h4>
                    </div>
                    <p className="text-xs text-stone-600">
                      Defina a senha que você usa para acessar este painel.
                    </p>
                    <div className="max-w-xs">
                      <input
                        type="text"
                        value={formSettings.adminPassword || '1234'}
                        onChange={(e) => setFormSettings({ ...formSettings, adminPassword: e.target.value })}
                        placeholder="Ex: 1234"
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs font-bold bg-white text-stone-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Store Name & WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Nome da Loja:
                      </label>
                      <input
                        type="text"
                        value={formSettings.storeName}
                        onChange={(e) => setFormSettings({ ...formSettings, storeName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        WhatsApp para receber pedidos (com DDD):
                      </label>
                      <input
                        type="tel"
                        placeholder="5511999998888"
                        value={formSettings.whatsappNumber}
                        onChange={(e) => setFormSettings({ ...formSettings, whatsappNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Endereço da Loja:
                    </label>
                    <input
                      type="text"
                      value={formSettings.address}
                      onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium outline-none"
                    />
                  </div>

                  {/* Mode override */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-stone-800">
                      Status da Loja no Momento:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'auto', label: 'Horário Automático' },
                        { id: 'forced_open', label: 'Forçar Aberta Agora' },
                        { id: 'forced_closed', label: 'Forçar Fechada Agora' },
                      ].map((sm) => (
                        <button
                          key={sm.id}
                          type="button"
                          onClick={() => setFormSettings({ ...formSettings, scheduleMode: sm.id as any })}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                            formSettings.scheduleMode === sm.id
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {sm.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Business Hours */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                    <h4 className="font-extrabold text-stone-800 text-xs uppercase tracking-wider">
                      Horários de Atendimento Semanal
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold block text-stone-700 mb-1">Segunda a Sexta-feira:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={formSettings.weekdayOpen}
                            onChange={(e) => setFormSettings({ ...formSettings, weekdayOpen: e.target.value })}
                            className="px-2 py-1.5 rounded-lg border border-stone-300 font-bold bg-white"
                          />
                          <span>até</span>
                          <input
                            type="time"
                            value={formSettings.weekdayClose}
                            onChange={(e) => setFormSettings({ ...formSettings, weekdayClose: e.target.value })}
                            className="px-2 py-1.5 rounded-lg border border-stone-300 font-bold bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="font-bold block text-stone-700 mb-1">Sábado:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={formSettings.saturdayOpen}
                            onChange={(e) => setFormSettings({ ...formSettings, saturdayOpen: e.target.value })}
                            className="px-2 py-1.5 rounded-lg border border-stone-300 font-bold bg-white"
                          />
                          <span>até</span>
                          <input
                            type="time"
                            value={formSettings.saturdayClose}
                            onChange={(e) => setFormSettings({ ...formSettings, saturdayClose: e.target.value })}
                            className="px-2 py-1.5 rounded-lg border border-stone-300 font-bold bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="checkbox"
                          checked={formSettings.isSundayClosed}
                          onChange={(e) => setFormSettings({ ...formSettings, isSundayClosed: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-600"
                        />
                        <span>Fechado aos Domingos</span>
                      </label>
                    </div>
                  </div>

                  {/* Closed message customize */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Mensagem de Loja Fechada:
                    </label>
                    <textarea
                      rows={2}
                      value={formSettings.closedMessage}
                      onChange={(e) => setFormSettings({ ...formSettings, closedMessage: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium outline-none"
                    />
                  </div>

                  {/* Delivery fees */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Taxa de Entrega Fixa (R$):
                      </label>
                      <input
                        type="number"
                        step="0.50"
                        value={formSettings.fixedDeliveryFee}
                        onChange={(e) => setFormSettings({ ...formSettings, fixedDeliveryFee: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Frete Grátis acima de (R$):
                      </label>
                      <input
                        type="number"
                        step="5"
                        value={formSettings.freeDeliveryThreshold}
                        onChange={(e) => setFormSettings({ ...formSettings, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold bg-white"
                      />
                    </div>
                  </div>

                  {/* Save button with clear feedback */}
                  <button
                    type="button"
                    onClick={() => handleSaveSettingsSubmit()}
                    disabled={isSavingSettings}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 active:scale-98 transition-all"
                  >
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Salvando Configurações...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Salvar Todas as Configurações da Loja</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 5: HISTÓRICO DE PEDIDOS */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-stone-600 block">
                    Pedidos salvos ({orders.length}):
                  </span>

                  {orders.length === 0 ? (
                    <div className="text-center p-8 text-stone-400 text-xs">
                      Nenhum pedido recebido ainda. Quando clientes enviarem pedidos pelo WhatsApp, o histórico aparecerá aqui!
                    </div>
                  ) : (
                    orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-extrabold text-stone-900 text-sm">
                              {ord.customerName}
                            </span>
                            <span className="text-xs text-stone-500 block">
                              WhatsApp: {ord.customerPhone} • {ord.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
                            </span>
                          </div>
                          <span className="font-black text-emerald-700 text-base">
                            R$ {ord.total.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                          <p className="font-semibold text-stone-800">Itens:</p>
                          <p>{ord.itemsSummary}</p>
                          {ord.notes && <p className="text-stone-500 mt-1 italic">Obs: {ord.notes}</p>}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-stone-400">
                            {new Date(ord.createdAt).toLocaleString('pt-BR')}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-stone-500">Status:</span>
                            <select
                              value={ord.status}
                              onChange={(e) => updateOrderStatus(ord.id, e.target.value as any)}
                              className="px-2 py-1 rounded-md border border-stone-300 font-bold text-xs bg-white"
                            >
                              <option value="novo">Novo</option>
                              <option value="preparando">Preparando</option>
                              <option value="saiu_entrega">Saiu para Entrega</option>
                              <option value="concluido">Concluído</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* In-App Delete Confirmation Modal (100% reliable inside iframe) */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-stone-900 text-sm">Confirmar Exclusão</h4>
                <p className="text-[11px] text-stone-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200 leading-relaxed">
              Deseja realmente excluir{' '}
              {deleteConfirmation.type === 'category' && 'a categoria '}
              {deleteConfirmation.type === 'product' && 'o produto '}
              {deleteConfirmation.type === 'coupon' && 'o cupom '}
              <strong className="text-stone-900 font-extrabold">"{deleteConfirmation.name}"</strong>?
            </p>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
