/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  StoreStatusBanner 
} from './components/StoreStatusBanner';
import { 
  CategoryFilterBar 
} from './components/CategoryFilterBar';
import { 
  ProductCard 
} from './components/ProductCard';
import { 
  RationBuyModal 
} from './components/RationBuyModal';
import { 
  CartDrawer 
} from './components/CartDrawer';
import { 
  CheckoutModal 
} from './components/CheckoutModal';
import { 
  FloatingWhatsApp 
} from './components/FloatingWhatsApp';
import { 
  AdminPanel 
} from './components/AdminPanel';
import { 
  OrderSuccessModal 
} from './components/OrderSuccessModal';
import { 
  AddToCartChoiceModal 
} from './components/AddToCartChoiceModal';
import { 
  Product, 
  Category, 
  Coupon, 
  StoreSettings, 
  CartItem, 
  OrderRecord 
} from './types';
import { 
  DEFAULT_PRODUCTS, 
  DEFAULT_CATEGORIES, 
  DEFAULT_COUPONS, 
  DEFAULT_SETTINGS 
} from './data/defaultData';
import { 
  subscribeProducts, 
  subscribeCategories, 
  subscribeCoupons, 
  subscribeSettings, 
  subscribeOrders,
  checkStoreOpenStatus,
  seedInitialDataIfNeeded
} from './services/storeService';
import { testConnection } from './lib/firebase';
import { 
  ShoppingBag, 
  ArrowRight, 
  Scale, 
  Sparkles, 
  ShieldCheck, 
  Heart,
  Truck,
  PhoneCall
} from 'lucide-react';

const LOCAL_CART_KEY = 'pet_store_customer_cart_v1';

export default function App() {
  // Remote/Local synchronized states
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [coupons, setCoupons] = useState<Coupon[]>(DEFAULT_COUPONS);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedAnimal, setSelectedAnimal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & UI States
  const [selectedProductForCustom, setSelectedProductForCustom] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addedChoiceItem, setAddedChoiceItem] = useState<CartItem | null>(null);

  // On mount: test connection, seed if empty, attach subscriptions
  useEffect(() => {
    testConnection();
    seedInitialDataIfNeeded();

    const unsubProducts = subscribeProducts(setProducts);
    const unsubCategories = subscribeCategories(setCategories);
    const unsubCoupons = subscribeCoupons(setCoupons);
    const unsubSettings = subscribeSettings(setSettings);
    const unsubOrders = subscribeOrders(setOrders);

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCoupons();
      unsubSettings();
      unsubOrders();
    };
  }, []);

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // Compute Store Open/Closed status
  const openStatus = checkStoreOpenStatus(settings);

  // Cart handlers
  const handleAddToCart = (item: CartItem) => {
    setCartItems(prev => [item, ...prev]);
    setAddedChoiceItem(item);
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQty: number) => {
    setCartItems(prev =>
      prev.map(i => {
        if (i.cartItemId === cartItemId) {
          const unitP = i.unitPrice;
          return {
            ...i,
            quantity: newQty,
            totalPrice: unitP * newQty,
          };
        }
        return i;
      })
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleOrderSuccess = () => {
    setCartItems([]);
    setAppliedCoupon(null);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setIsSuccessOpen(true);
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    // Category or Promotions filter
    if (selectedCategoryId === 'promotions') {
      if (!p.isOnSale) {
        return false;
      }
    } else if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) {
      return false;
    }
    // Animal filter (Cães, Gatos, Pássaros, Peixes, Outros)
    if (selectedAnimal !== 'all') {
      const pet = p.animalType || (
        p.name.toLowerCase().includes('gato') || p.name.toLowerCase().includes('felin') || p.name.toLowerCase().includes('whiskas') ? 'cat' :
        p.name.toLowerCase().includes('pássaro') || p.name.toLowerCase().includes('calopsita') || p.name.toLowerCase().includes('canário') || p.name.toLowerCase().includes('alpiste') || p.name.toLowerCase().includes('ave') ? 'bird' :
        p.name.toLowerCase().includes('peixe') || p.name.toLowerCase().includes('aquári') ? 'fish' :
        'dog'
      );
      if (pet !== selectedAnimal) {
        return false;
      }
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      return matchName || matchDesc;
    }
    return true;
  });

  const cartTotalSum = cartItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const promoCount = products.filter(p => p.isOnSale).length;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 pb-20 sm:pb-12">
      {/* 1. Header */}
      <Header
        settings={settings}
        openStatus={openStatus}
        cartCount={cartItems.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* 2. Store Open/Closed Status Banner */}
      <StoreStatusBanner openStatus={openStatus} />

      {/* 3. Hero Feature Cards */}
      <section className="bg-gradient-to-b from-white to-stone-100 border-b border-stone-200/80 py-4 sm:py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-xs sm:text-sm text-blue-950">
                  Ração a Granel por Kg ou Reais
                </h2>
                <p className="text-[11px] text-blue-800">
                  Compre R$ 10, R$ 20 ou quantos quilos desejar, pesado na hora!
                </p>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-xs sm:text-sm text-stone-950">
                  Entrega Rápida em Casa
                </h2>
                <p className="text-[11px] text-amber-900">
                  Frete grátis em compras acima de R$ {settings.freeDeliveryThreshold.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>

            <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-xs sm:text-sm text-sky-950">
                  Sem Login e Direto no WhatsApp
                </h2>
                <p className="text-[11px] text-sky-800">
                  Escolha seus itens e receba atendimento personalizado em segundos!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Filter & Category Bar */}
      <CategoryFilterBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedAnimal={selectedAnimal}
        onSelectAnimal={setSelectedAnimal}
        promoCount={promoCount}
      />

      {/* 5. Main Catalog Grid */}
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-extrabold text-stone-900 text-lg sm:text-xl flex items-center gap-2">
              {selectedCategoryId === 'promotions' ? (
                <span className="flex items-center gap-1.5 text-rose-700">
                  <span>🔥</span> Produtos em Promoção
                </span>
              ) : (
                <span>Catálogo de Produtos</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                selectedCategoryId === 'promotions' ? 'bg-rose-100 text-rose-700' : 'bg-stone-200 text-stone-700'
              }`}>
                {filteredProducts.length} {selectedCategoryId === 'promotions' ? 'ofertas' : 'itens'}
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {selectedCategoryId === 'promotions'
                ? 'Aproveite os melhores preços e ofertas especiais da loja!'
                : 'Clique em "Escolher Quantidade" para rações a granel ou por saco'}
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-xs max-w-md mx-auto my-8">
            <ShoppingBag className="w-12 h-12 stroke-1 text-stone-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-stone-800 text-base">Nenhum produto encontrado</h3>
            <p className="text-xs text-stone-500 mt-1">
              Tente buscar com outro termo ou selecionar outra categoria acima.
            </p>
            <button
              onClick={() => {
                setSelectedCategoryId('all');
                setSelectedAnimal('all');
                setSearchQuery('');
              }}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectForCustom={setSelectedProductForCustom}
                onAddDirectUnit={handleAddToCart}
              />
            ))}
          </div>
        )}

        {/* Section requested: Não encontrou o que está procurando? Fale com a gente, atenderemos em segundos */}
        <div className="mt-12 bg-gradient-to-r from-blue-900 via-indigo-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,white_0,transparent_100%)] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 bg-amber-400 text-stone-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                ⚡ Atendimento Rápido
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Não encontrou o que está procurando?
              </h3>
              <p className="text-blue-100 text-sm font-medium">
                Fale com a gente, atenderemos em segundos! Temos marcas especiais de rações, petiscos e medicamentos em nosso estoque físico.
              </p>
            </div>

            <a
              href={`https://wa.me/${(settings.whatsappNumber || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                'Olá! Não encontrei um produto específico no site e gostaria de saber se vocês têm disponível.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black px-6 py-4 rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 shrink-0"
            >
              <PhoneCall className="w-5 h-5 text-stone-950" />
              <span>Falar no WhatsApp</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-8 text-center text-xs text-stone-500 mt-8">
        <div className="container mx-auto px-4 space-y-2">
          <p className="font-bold text-stone-800 text-sm">
            {settings.storeName}
          </p>
          <p>{settings.address}</p>
          <p className="text-stone-400">
            Pedidos diretamente pelo WhatsApp • Horário de Atendimento: {settings.weekdayOpen} às {settings.weekdayClose}
          </p>
          <div className="pt-3">
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-stone-600 hover:text-blue-700 underline text-xs font-semibold inline-flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Painel do Lojista
            </button>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Cart Bar */}
      {cartItems.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 shadow-2xl">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-between shadow-lg shadow-blue-700/25 active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-stone-950 font-black text-xs px-2 py-0.5 rounded-full">
                {cartItems.length}
              </span>
              <span className="text-sm">Ver Carrinho</span>
            </div>
            <div className="flex items-center gap-1.5 font-black text-sm">
              <span>R$ {cartTotalSum.toFixed(2).replace('.', ',')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white font-bold text-xs py-2.5 px-4 rounded-2xl shadow-xl border border-stone-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating WhatsApp Action Button */}
      <FloatingWhatsApp settings={settings} />

      {/* Modals */}
      {selectedProductForCustom && (
        <RationBuyModal
          product={selectedProductForCustom}
          onClose={() => setSelectedProductForCustom(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onUpdateQuantity={handleUpdateCartQuantity}
        coupons={coupons}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={setAppliedCoupon}
        settings={settings}
        openStatus={openStatus}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        appliedCoupon={appliedCoupon}
        settings={settings}
        openStatus={openStatus}
        onOrderSuccess={handleOrderSuccess}
      />

      <OrderSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        openStatus={openStatus}
        settings={settings}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        categories={categories}
        coupons={coupons}
        settings={settings}
        orders={orders}
      />
      <AddToCartChoiceModal
        isOpen={!!addedChoiceItem}
        item={addedChoiceItem}
        totalCartCount={cartItems.length}
        onContinueShopping={() => setAddedChoiceItem(null)}
        onGoToCart={() => {
          setAddedChoiceItem(null);
          setIsCartOpen(true);
        }}
      />
    </div>
  );
}
