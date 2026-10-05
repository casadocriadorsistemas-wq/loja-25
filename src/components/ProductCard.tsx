import React from 'react';
import { 
  Plus, 
  Scale, 
  Package, 
  Check, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Product, CartItem } from '../types';

interface ProductCardProps {
  product: Product;
  onSelectForCustom: (product: Product) => void;
  onAddDirectUnit: (item: CartItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectForCustom,
  onAddDirectUnit,
}) => {
  const isRation = product.sellMode === 'bag_and_bulk' || product.sellMode === 'bag_only' || product.sellMode === 'bulk_only';

  const handleAction = () => {
    if (isRation) {
      onSelectForCustom(product);
    } else {
      // Direct unit item
      const unitPrice = product.unitPrice || 0;
      const item: CartItem = {
        cartItemId: `${product.id}-unit-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        type: 'unit',
        label: `1x ${product.unitLabel || 'unidade'}`,
        details: product.unitLabel ? `Embalagem: ${product.unitLabel}` : 'Item unitário',
        unitPrice: unitPrice,
        quantity: 1,
        totalPrice: unitPrice,
      };
      onAddDirectUnit(item);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden group ${
      product.isOnSale
        ? 'border-rose-300 hover:border-rose-500 shadow-rose-100/70 shadow-sm hover:shadow-lg'
        : 'border-stone-200/90 hover:border-blue-500/50 shadow-xs hover:shadow-lg'
    }`}>
      {/* Product Image & Badges */}
      <div className="relative aspect-4/3 sm:aspect-square overflow-hidden bg-white flex items-center justify-center p-2.5 sm:p-3 border-b border-stone-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Badges overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          {product.isOnSale && (
            <span className="bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded-md shadow-md shadow-rose-600/30 flex items-center gap-1 animate-pulse">
              🔥 {product.promoDiscountText || 'PROMOÇÃO'}
            </span>
          )}
          {product.isFeatured && (
            <span className="bg-amber-400 text-stone-900 font-black text-[10px] uppercase px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Mais Pedido
            </span>
          )}
          {product.sellMode === 'bag_and_bulk' && (
            <span className="bg-blue-600 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-xs">
              Saco ou a Granel
            </span>
          )}
          {product.sellMode === 'bulk_only' && (
            <span className="bg-sky-600 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md shadow-xs">
              A Granel (Kg ou R$)
            </span>
          )}
        </div>

        {/* Animal Pet Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="bg-white/90 backdrop-blur-xs text-stone-700 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shadow-xs border border-stone-200/80 flex items-center gap-1">
            {product.animalType === 'cat' ? '🐈 Gatos' :
             product.animalType === 'bird' ? '🦜 Pássaros' :
             product.animalType === 'fish' ? '🐠 Peixes' :
             product.animalType === 'other' ? '🐾 Pets' :
             '🐕 Cães'}
          </span>
        </div>

        {!product.inStock && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Esgotado no Momento
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
            {product.name}
          </h3>
          <p className="text-stone-500 text-xs mt-1.5 line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Pricing & Sell Mode Display */}
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          {/* Bag & Bulk options breakdown */}
          {product.sellMode === 'bag_and_bulk' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-blue-600" /> A granel:
                </span>
                <span className="font-extrabold text-blue-700">
                  R$ {product.bulkPricePerKg?.toFixed(2).replace('.', ',')} / kg
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-stone-400" />
                  {product.bagVariations && product.bagVariations.length > 1
                    ? `Sacos (${product.bagVariations.map(v => `${v.weightKg}k`).join('/')}):`
                    : `Saco (${product.bagVariations?.[0]?.weightKg || product.bagWeightKg || 15}kg):`}
                </span>
                <span className="font-bold text-stone-900">
                  {product.bagVariations && product.bagVariations.length > 1
                    ? `a partir de R$ ${Math.min(...product.bagVariations.map(v => v.price)).toFixed(2).replace('.', ',')}`
                    : `R$ ${(product.bagVariations?.[0]?.price || product.bagPrice || 0).toFixed(2).replace('.', ',')}`}
                </span>
              </div>
            </div>
          )}

          {product.sellMode === 'bulk_only' && (
            <div>
              <span className="text-[11px] text-stone-500 block">Preço a granel:</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-blue-700">
                  R$ {product.bulkPricePerKg?.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs font-semibold text-stone-500">/ kg</span>
              </div>
              <span className="text-[10px] text-blue-700 font-semibold block">
                Compre por peso ou por valor em R$ (Ex: R$ 20,00)
              </span>
            </div>
          )}

          {product.sellMode === 'bag_only' && (
            <div>
              <span className="text-[11px] text-stone-500 block">
                {product.bagVariations && product.bagVariations.length > 1
                  ? `Sacos Disponíveis: ${product.bagVariations.map(v => `${v.weightKg}kg`).join(', ')}`
                  : `Saco Fechado (${product.bagVariations?.[0]?.weightKg || product.bagWeightKg || 15}kg):`}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-stone-900">
                  {product.bagVariations && product.bagVariations.length > 1
                    ? `A partir de R$ ${Math.min(...product.bagVariations.map(v => v.price)).toFixed(2).replace('.', ',')}`
                    : `R$ ${(product.bagVariations?.[0]?.price || product.bagPrice || 0).toFixed(2).replace('.', ',')}`}
                </span>
              </div>
            </div>
          )}

          {product.sellMode === 'unit' && (
            <div>
              <span className="text-[11px] text-stone-500 block">
                {product.unitLabel ? `Preço por ${product.unitLabel}:` : 'Preço:'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-stone-900">
                  R$ {product.unitPrice?.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleAction}
            disabled={!product.inStock}
            className={`w-full mt-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs ${
              !product.inStock
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : isRation
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-700/20 active:scale-98'
                : 'bg-stone-900 hover:bg-stone-800 text-white active:scale-98'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>
              {isRation ? 'Escolher Quantidade' : 'Adicionar ao Carrinho'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
