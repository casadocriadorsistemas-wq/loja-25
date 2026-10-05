import React, { useState } from 'react';
import { 
  X, 
  Send, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Truck, 
  Store, 
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { CartItem, Coupon, StoreSettings, OrderRecord } from '../types';
import { StoreOpenStatus, generateWhatsAppOrderUrl, createOrder } from '../services/storeService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  appliedCoupon: Coupon | null;
  settings: StoreSettings;
  openStatus: StoreOpenStatus;
  onOrderSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  appliedCoupon,
  settings,
  openStatus,
  onOrderSuccess,
}) => {
  const [isExistingCustomer, setIsExistingCustomer] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [streetAddress, setStreetAddress] = useState('');
  const [numberAddress, setNumberAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Computations
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);

  let discount = 0;
  if (appliedCoupon && appliedCoupon.isActive) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discount = appliedCoupon.discountValue;
    }
    discount = Math.min(subtotal, discount);
  }

  let deliveryFee = settings.fixedDeliveryFee;
  if (deliveryType === 'pickup') {
    deliveryFee = 0;
  } else if (settings.deliveryFeeType === 'free_above' && subtotal >= settings.freeDeliveryThreshold) {
    deliveryFee = 0;
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let fullAddress = 'Retirada no balcão da loja';

    if (!isExistingCustomer) {
      if (!customerName.trim()) {
        setErrorMessage('Por favor, informe seu nome completo.');
        return;
      }

      if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 8) {
        setErrorMessage('Por favor, informe um telefone de contato válido.');
        return;
      }

      if (deliveryType === 'delivery') {
        if (!streetAddress.trim() || !numberAddress.trim() || !neighborhood.trim()) {
          setErrorMessage('Por favor, preencha a rua, número e bairro para entrega.');
          return;
        }
        fullAddress = `${streetAddress.trim()}, Nº ${numberAddress.trim()} - Bairro: ${neighborhood.trim()}${
          reference.trim() ? ` (Ref: ${reference.trim()})` : ''
        }`;
      }
    } else {
      fullAddress = deliveryType === 'delivery' 
        ? 'Entregar no meu endereço já cadastrado na loja' 
        : 'Retirada no balcão da loja';
    }

    setIsSubmitting(true);

    try {
      const orderId = `PED-${Date.now().toString().slice(-6)}`;
      const itemsSummary = items
        .map(i => `${i.productName} (${i.label}) - R$ ${i.totalPrice.toFixed(2)}`)
        .join('; ');

      const orderData: OrderRecord = {
        id: orderId,
        customerName: customerName.trim() || (isExistingCustomer ? 'Cliente Cadastrado' : 'Cliente'),
        customerPhone: customerPhone.trim() || (isExistingCustomer ? 'Já cadastrado' : ''),
        isExistingCustomer,
        deliveryType,
        address: fullAddress,
        paymentMethod,
        changeFor: paymentMethod === 'Dinheiro' && changeFor ? changeFor : undefined,
        notes: notes.trim(),
        subtotal,
        discount,
        deliveryFee,
        total,
        couponCode: appliedCoupon?.code,
        itemsSummary,
        status: 'novo',
        createdAt: new Date().toISOString(),
      };

      // Save order in Firestore / Database
      await createOrder(orderData);

      // Generate WhatsApp link
      const whatsappUrl = generateWhatsAppOrderUrl({
        settings,
        order: orderData,
        items,
        isClosed: !openStatus.isOpen,
      });

      // Redirect directly to WhatsApp
      window.location.href = whatsappUrl;

      onOrderSuccess();
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage('Houve um erro ao processar o pedido. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl my-6 border border-stone-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="font-extrabold text-stone-900 text-lg">Finalizar Pedido</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Sem cadastro ou senhas. Envie direto para o WhatsApp da loja!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Closed store reassurance banner inside checkout */}
        {!openStatus.isOpen && (
          <div className="bg-amber-500 text-stone-950 p-3.5 text-xs font-semibold flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-stone-950 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block uppercase tracking-wider text-[11px]">
                Loja Fechada no Momento
              </span>
              <span>
                Fique à vontade de enviar seu pedido! Deixaremos separado e entregaremos no primeiro horário de atendimento.
              </span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Existing Customer Checkbox - Default TRUE */}
          <div className="bg-blue-50/90 border-2 border-blue-300 rounded-2xl p-3.5 flex items-start gap-3 transition-all hover:bg-blue-50">
            <input
              type="checkbox"
              id="existingCustomerCheck"
              checked={isExistingCustomer}
              onChange={(e) => setIsExistingCustomer(e.target.checked)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer accent-blue-600"
            />
            <label htmlFor="existingCustomerCheck" className="cursor-pointer text-xs flex-1">
              <span className="font-extrabold text-stone-900 block text-sm">
                Já sou cliente cadastrado
              </span>
              <span className="text-blue-800 font-medium block mt-0.5">
                {isExistingCustomer
                  ? '✓ Não precisa preencher dados nem endereço. Enviaremos para seu endereço cadastrado na loja!'
                  : 'Desmarcado: Por favor preencha seus dados de contato e entrega abaixo.'}
              </span>
            </label>
          </div>

          {/* Section 1: Customer Info (Only shown if NOT existing customer) */}
          {!isExistingCustomer && (
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 animate-in fade-in">
              <h3 className="text-xs font-extrabold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" /> Seus Dados de Contato
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Seu Nome: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!isExistingCustomer}
                    placeholder="Ex: João da Silva"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    WhatsApp / Telefone: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required={!isExistingCustomer}
                    placeholder="(11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Delivery Mode */}
          <div className="pt-2 border-t border-stone-100">
            <h3 className="text-xs font-extrabold text-stone-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> Como deseja receber?
            </h3>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  deliveryType === 'delivery'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Truck className="w-5 h-5 text-blue-600" />
                <span>Receber em Casa (Delivery)</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  deliveryType === 'pickup'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Store className="w-5 h-5 text-blue-600" />
                <span>Retirar no Balcão</span>
              </button>
            </div>

            {/* Address fields ONLY if Delivery AND NOT existing customer */}
            {deliveryType === 'delivery' && !isExistingCustomer && (
              <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5 animate-in fade-in">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Rua / Avenida: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Número: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={numberAddress}
                      onChange={(e) => setNumberAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Bairro: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Jardim Pet"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Ponto de Referência / Apto:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Próximo à padaria"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Payment Method */}
          <div className="pt-2 border-t border-stone-100">
            <h3 className="text-xs font-extrabold text-stone-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Forma de Pagamento
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Pix', label: 'Pix', icon: <QrCode className="w-4 h-4" /> },
                { id: 'Cartão (Débito/Crédito)', label: 'Cartão na Entrega', icon: <CreditCard className="w-4 h-4" /> },
                { id: 'Dinheiro', label: 'Dinheiro', icon: <Banknote className="w-4 h-4" /> },
              ].map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`py-2 px-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === pm.id
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className={paymentMethod === pm.id ? 'text-blue-700' : 'text-stone-500'}>
                    {pm.icon}
                  </span>
                  <span className="text-center">{pm.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'Dinheiro' && (
              <div className="mt-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  Precisa de troco? Para quanto?
                </label>
                <input
                  type="text"
                  placeholder="Ex: Troco para R$ 100,00 ou Não preciso"
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:border-blue-500 text-xs bg-white text-stone-900 outline-none"
                />
              </div>
            )}
          </div>

          {/* Section 4: Notes */}
          <div className="pt-2 border-t border-stone-100">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Observações adicionais (opcional):
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Se possível, embalar a ração em 2 sacos separados de 1kg..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-blue-500 text-xs text-stone-900 outline-none resize-none"
            />
          </div>

          {/* Order Summary Box */}
          <div className="bg-stone-100/80 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1.5">
            <div className="flex justify-between text-stone-600">
              <span>{items.length} itens no pedido:</span>
              <span className="font-semibold text-stone-900">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-blue-700 font-bold">
                <span>Desconto ({appliedCoupon?.code}):</span>
                <span>-R$ {discount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>Entrega:</span>
              <span className="font-semibold text-stone-900">
                {deliveryFee === 0 ? 'GRÁTIS' : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1.5 border-t border-stone-200/80">
              <span className="font-black text-stone-900 text-sm">Total do Pedido:</span>
              <span className="font-black text-blue-700 text-xl">
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm sm:text-base shadow-lg shadow-blue-700/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-98"
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? 'Gerando Pedido...' : 'Enviar Pedido pelo WhatsApp'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
