import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Category, Coupon, StoreSettings, OrderRecord, CartItem } from '../types';
import { DEFAULT_PRODUCTS, DEFAULT_CATEGORIES, DEFAULT_COUPONS, DEFAULT_SETTINGS } from '../data/defaultData';

const LOCAL_PRODUCTS_KEY = 'pet_store_products_v1';
const LOCAL_CATEGORIES_KEY = 'pet_store_categories_v1';
const LOCAL_COUPONS_KEY = 'pet_store_coupons_v1';
const LOCAL_SETTINGS_KEY = 'pet_store_settings_v1';
const LOCAL_ORDERS_KEY = 'pet_store_orders_v1';
const SEED_LOCK_KEY = 'pet_store_seeded_lock_v1';

let isSeedingInProgress = false;

// Seed initial data to Firestore cleanly using writeBatch to avoid multiple snapshot events
export async function seedInitialDataIfNeeded(): Promise<void> {
  if (isSeedingInProgress) return;
  
  const alreadySeededLocally = localStorage.getItem(SEED_LOCK_KEY);
  if (alreadySeededLocally === 'true') {
    return;
  }

  isSeedingInProgress = true;
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      const batch = writeBatch(db);
      for (const prod of DEFAULT_PRODUCTS) {
        batch.set(doc(db, 'products', prod.id), prod);
      }
      for (const cat of DEFAULT_CATEGORIES) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
      for (const coup of DEFAULT_COUPONS) {
        batch.set(doc(db, 'coupons', coup.id), coup);
      }
      batch.set(doc(db, 'settings', 'config'), DEFAULT_SETTINGS);
      await batch.commit();
      localStorage.setItem(SEED_LOCK_KEY, 'true');
    } else {
      localStorage.setItem(SEED_LOCK_KEY, 'true');
    }
  } catch (error) {
    console.warn('Initial seeding note (working with local data if offline):', error);
  } finally {
    isSeedingInProgress = false;
  }
}

// Active In-Memory Listeners for Instant UI updates
const productListeners = new Set<(products: Product[]) => void>();
const categoryListeners = new Set<(categories: Category[]) => void>();
const couponListeners = new Set<(coupons: Coupon[]) => void>();

function notifyProductListeners(products: Product[]) {
  productListeners.forEach((cb) => {
    try { cb(products); } catch (e) { console.error(e); }
  });
}

function notifyCategoryListeners(categories: Category[]) {
  categoryListeners.forEach((cb) => {
    try { cb(categories); } catch (e) { console.error(e); }
  });
}

function notifyCouponListeners(coupons: Coupon[]) {
  couponListeners.forEach((cb) => {
    try { cb(coupons); } catch (e) { console.error(e); }
  });
}

// Subscribe to Products with change detection to prevent re-render flickering
export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  productListeners.add(callback);
  let lastJson = '';

  const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  } else {
    lastJson = JSON.stringify(DEFAULT_PRODUCTS);
    callback(DEFAULT_PRODUCTS);
  }

  let firestoreUnsub = () => {};
  try {
    firestoreUnsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const prods: Product[] = [];
        snapshot.forEach((d) => {
          prods.push(d.data() as Product);
        });
        const newJson = JSON.stringify(prods);
        if (newJson !== lastJson) {
          lastJson = newJson;
          localStorage.setItem(LOCAL_PRODUCTS_KEY, newJson);
          callback(prods);
        }
      }
    }, (error) => {
      console.warn('Products listener note:', error.message);
    });
  } catch {}

  return () => {
    productListeners.delete(callback);
    firestoreUnsub();
  };
}

export async function saveProduct(product: Product): Promise<boolean> {
  const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);
  let list: Product[] = cached ? JSON.parse(cached) : [...DEFAULT_PRODUCTS];
  const idx = list.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    list[idx] = product;
  } else {
    list.push(product);
  }
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(list));
  notifyProductListeners(list);

  try {
    await setDoc(doc(db, 'products', product.id), product);
    return true;
  } catch (err) {
    console.warn('Product saved locally, Firestore error:', err);
    return true;
  }
}

export async function removeProduct(productId: string): Promise<boolean> {
  const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);
  let list: Product[] = cached ? JSON.parse(cached) : [...DEFAULT_PRODUCTS];
  const updated = list.filter(p => p.id !== productId);
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
  notifyProductListeners(updated);

  try {
    await deleteDoc(doc(db, 'products', productId));
    return true;
  } catch (err) {
    console.warn('Product deleted locally, Firestore error:', err);
    return true;
  }
}

// Categories
export function subscribeCategories(callback: (categories: Category[]) => void): () => void {
  categoryListeners.add(callback);
  let lastJson = '';

  const cached = localStorage.getItem(LOCAL_CATEGORIES_KEY);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  } else {
    lastJson = JSON.stringify(DEFAULT_CATEGORIES);
    callback(DEFAULT_CATEGORIES);
  }

  let firestoreUnsub = () => {};
  try {
    firestoreUnsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      if (!snapshot.empty) {
        const cats: Category[] = [];
        snapshot.forEach((d) => {
          cats.push(d.data() as Category);
        });
        cats.sort((a, b) => a.sortOrder - b.sortOrder);
        const newJson = JSON.stringify(cats);
        if (newJson !== lastJson) {
          lastJson = newJson;
          localStorage.setItem(LOCAL_CATEGORIES_KEY, newJson);
          callback(cats);
        }
      }
    }, (err) => console.warn('Categories listener note:', err.message));
  } catch {}

  return () => {
    categoryListeners.delete(callback);
    firestoreUnsub();
  };
}

export async function saveCategory(category: Category): Promise<boolean> {
  const cached = localStorage.getItem(LOCAL_CATEGORIES_KEY);
  let list: Category[] = cached ? JSON.parse(cached) : [...DEFAULT_CATEGORIES];
  const idx = list.findIndex(c => c.id === category.id);
  if (idx >= 0) list[idx] = category;
  else list.push(category);
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(list));
  notifyCategoryListeners(list);

  try {
    await setDoc(doc(db, 'categories', category.id), category);
    return true;
  } catch (err) {
    console.warn('Category saved locally:', err);
    return true;
  }
}

export async function removeCategory(categoryId: string): Promise<boolean> {
  const cached = localStorage.getItem(LOCAL_CATEGORIES_KEY);
  let list: Category[] = cached ? JSON.parse(cached) : [...DEFAULT_CATEGORIES];
  const updated = list.filter(c => c.id !== categoryId);
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(updated));
  notifyCategoryListeners(updated);

  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    return true;
  } catch (err) {
    console.warn('Category deleted locally:', err);
    return true;
  }
}

// Coupons
export function subscribeCoupons(callback: (coupons: Coupon[]) => void): () => void {
  couponListeners.add(callback);
  let lastJson = '';

  const cached = localStorage.getItem(LOCAL_COUPONS_KEY);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  } else {
    lastJson = JSON.stringify(DEFAULT_COUPONS);
    callback(DEFAULT_COUPONS);
  }

  let firestoreUnsub = () => {};
  try {
    firestoreUnsub = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      if (!snapshot.empty) {
        const list: Coupon[] = [];
        snapshot.forEach(d => list.push(d.data() as Coupon));
        const newJson = JSON.stringify(list);
        if (newJson !== lastJson) {
          lastJson = newJson;
          localStorage.setItem(LOCAL_COUPONS_KEY, newJson);
          callback(list);
        }
      }
    }, (err) => console.warn('Coupons listener note:', err.message));
  } catch {}

  return () => {
    couponListeners.delete(callback);
    firestoreUnsub();
  };
}

export async function saveCoupon(coupon: Coupon): Promise<boolean> {
  const cached = localStorage.getItem(LOCAL_COUPONS_KEY);
  let list: Coupon[] = cached ? JSON.parse(cached) : [...DEFAULT_COUPONS];
  const idx = list.findIndex(c => c.id === coupon.id);
  if (idx >= 0) list[idx] = coupon;
  else list.push(coupon);
  localStorage.setItem(LOCAL_COUPONS_KEY, JSON.stringify(list));
  notifyCouponListeners(list);

  try {
    await setDoc(doc(db, 'coupons', coupon.id), coupon);
    return true;
  } catch (err) {
    console.warn('Coupon saved locally:', err);
    return true;
  }
}

export async function removeCoupon(couponId: string): Promise<boolean> {
  const cached = localStorage.getItem(LOCAL_COUPONS_KEY);
  let list: Coupon[] = cached ? JSON.parse(cached) : [...DEFAULT_COUPONS];
  const updated = list.filter(c => c.id !== couponId);
  localStorage.setItem(LOCAL_COUPONS_KEY, JSON.stringify(updated));
  notifyCouponListeners(updated);

  try {
    await deleteDoc(doc(db, 'coupons', couponId));
    return true;
  } catch (err) {
    console.warn('Coupon deleted locally:', err);
    return true;
  }
}

// Settings
export function subscribeSettings(callback: (settings: StoreSettings) => void): () => void {
  let lastJson = '';

  const cached = localStorage.getItem(LOCAL_SETTINGS_KEY);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  } else {
    lastJson = JSON.stringify(DEFAULT_SETTINGS);
    callback(DEFAULT_SETTINGS);
  }

  try {
    const unsub = onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        const newJson = JSON.stringify(data);
        if (newJson !== lastJson) {
          lastJson = newJson;
          localStorage.setItem(LOCAL_SETTINGS_KEY, newJson);
          callback(data);
        }
      }
    }, (err) => console.warn('Settings listener note:', err.message));
    return unsub;
  } catch {
    return () => {};
  }
}

export async function saveSettings(settings: StoreSettings): Promise<boolean> {
  try {
    // 1. Always save in localStorage instantly
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));

    // 2. Persist to Firestore
    await setDoc(doc(db, 'settings', 'config'), settings, { merge: true });
    return true;
  } catch (err) {
    console.warn('Settings saved locally, Firestore update note:', err);
    return true;
  }
}

// Orders
export async function createOrder(order: OrderRecord): Promise<void> {
  const cached = localStorage.getItem(LOCAL_ORDERS_KEY);
  const list: OrderRecord[] = cached ? JSON.parse(cached) : [];
  list.unshift(order);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list));

  try {
    await setDoc(doc(db, 'orders', order.id), order);
  } catch (err) {
    console.warn('Order saved locally, firestore write note:', err);
  }
}

export function subscribeOrders(callback: (orders: OrderRecord[]) => void): () => void {
  let lastJson = '';

  const cached = localStorage.getItem(LOCAL_ORDERS_KEY);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  }

  try {
    const unsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orders: OrderRecord[] = [];
      snapshot.forEach(d => orders.push(d.data() as OrderRecord));
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const newJson = JSON.stringify(orders);
      if (newJson !== lastJson) {
        lastJson = newJson;
        localStorage.setItem(LOCAL_ORDERS_KEY, newJson);
        callback(orders);
      }
    }, (err) => console.warn('Orders listener note:', err.message));
    return unsub;
  } catch {
    return () => {};
  }
}

export async function updateOrderStatus(orderId: string, status: OrderRecord['status']): Promise<void> {
  const cached = localStorage.getItem(LOCAL_ORDERS_KEY);
  if (cached) {
    const list: OrderRecord[] = JSON.parse(cached);
    const item = list.find(o => o.id === orderId);
    if (item) item.status = status;
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list));
  }
  try {
    await updateDoc(doc(db, 'orders', orderId), { status });
  } catch (err) {
    console.warn('Update order status locally:', err);
  }
}

// Store Open / Closed Schedule Calculation
export interface StoreOpenStatus {
  isOpen: boolean;
  message: string;
  nextScheduleText: string;
  badgeText: string;
}

export function checkStoreOpenStatus(settings: StoreSettings): StoreOpenStatus {
  if (settings.scheduleMode === 'forced_open') {
    return {
      isOpen: true,
      message: 'Loja Aberta! Faça seu pedido agora.',
      nextScheduleText: 'Atendimento imediato.',
      badgeText: 'ABERTO AGORA',
    };
  }

  if (settings.scheduleMode === 'forced_closed') {
    return {
      isOpen: false,
      message: settings.closedMessage || 'Loja fechada no momento, mas fique à vontade para escolher seus produtos! Entregaremos no primeiro horário de atendimento.',
      nextScheduleText: 'Consulte nosso horário de funcionamento.',
      badgeText: 'LOJA FECHADA',
    };
  }

  // Automatic calculation based on local time
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1-5 = Weekday, 6 = Saturday
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeVal = currentHours * 60 + currentMinutes;

  const parseTime = (timeStr: string) => {
    const [h, m] = (timeStr || '08:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  let openTimeVal = 0;
  let closeTimeVal = 0;
  let isClosedToday = false;
  let scheduleDesc = '';

  if (dayOfWeek === 0) { // Sunday
    if (settings.isSundayClosed) {
      isClosedToday = true;
      scheduleDesc = 'Fechado aos Domingos';
    } else {
      openTimeVal = parseTime(settings.sundayOpen || '08:00');
      closeTimeVal = parseTime(settings.sundayClose || '12:00');
      scheduleDesc = `Domingo das ${settings.sundayOpen} às ${settings.sundayClose}`;
    }
  } else if (dayOfWeek === 6) { // Saturday
    openTimeVal = parseTime(settings.saturdayOpen || '08:00');
    closeTimeVal = parseTime(settings.saturdayClose || '14:00');
    scheduleDesc = `Sábado das ${settings.saturdayOpen} às ${settings.saturdayClose}`;
  } else { // Monday - Friday
    openTimeVal = parseTime(settings.weekdayOpen || '08:00');
    closeTimeVal = parseTime(settings.weekdayClose || '18:30');
    scheduleDesc = `Segunda a Sexta das ${settings.weekdayOpen} às ${settings.weekdayClose}`;
  }

  if (isClosedToday) {
    return {
      isOpen: false,
      message: settings.closedMessage,
      nextScheduleText: `Reabrimos segunda-feira às ${settings.weekdayOpen || '08:00'}`,
      badgeText: 'LOJA FECHADA HOJE',
    };
  }

  const isOpen = currentTimeVal >= openTimeVal && currentTimeVal < closeTimeVal;

  if (isOpen) {
    return {
      isOpen: true,
      message: `Aberto até as ${dayOfWeek === 6 ? settings.saturdayClose : dayOfWeek === 0 ? settings.sundayClose : settings.weekdayClose}!`,
      nextScheduleText: scheduleDesc,
      badgeText: 'ABERTO AGORA',
    };
  }

  let nextInfo = '';
  if (currentTimeVal < openTimeVal) {
    const nextH = Math.floor(openTimeVal / 60).toString().padStart(2, '0');
    const nextM = (openTimeVal % 60).toString().padStart(2, '0');
    nextInfo = `Abrimos hoje às ${nextH}:${nextM}`;
  } else {
    if (dayOfWeek === 5) {
      nextInfo = `Abrimos amanhã (Sábado) às ${settings.saturdayOpen || '08:00'}`;
    } else if (dayOfWeek === 6) {
      if (settings.isSundayClosed) {
        nextInfo = `Abrimos Segunda-feira às ${settings.weekdayOpen || '08:00'}`;
      } else {
        nextInfo = `Abrimos amanhã (Domingo) às ${settings.sundayOpen || '08:00'}`;
      }
    } else {
      nextInfo = `Abrimos amanhã às ${settings.weekdayOpen || '08:00'}`;
    }
  }

  return {
    isOpen: false,
    message: settings.closedMessage,
    nextScheduleText: nextInfo,
    badgeText: 'LOJA FECHADA',
  };
}

// Generate formatted WhatsApp URL
export function generateWhatsAppOrderUrl({
  settings,
  order,
  items,
  isClosed,
}: {
  settings: StoreSettings;
  order: Omit<OrderRecord, 'id' | 'createdAt' | 'status' | 'itemsSummary'>;
  items: CartItem[];
  isClosed: boolean;
}): string {
  const cleanPhone = (settings.whatsappNumber || '').replace(/\D/g, '');
  
  let msg = `🐾 *NOVO PEDIDO - ${(settings.storeName || 'LOJA').toUpperCase()}* 🐾\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (order.isExistingCustomer) {
    msg += `👤 *Cliente:* Já sou cliente cadastrado na loja ✅\n`;
    if (order.customerName && order.customerName !== 'Cliente Cadastrado') {
      msg += `👤 *Nome:* ${order.customerName}\n`;
    }
    msg += `📍 *Modalidade:* ${order.deliveryType === 'delivery' ? '🛵 Entregar no meu endereço já cadastrado' : '🏬 Retirar no Balcão'}\n`;
  } else {
    msg += `👤 *Cliente:* ${order.customerName}\n`;
    msg += `📱 *Telefone:* ${order.customerPhone}\n`;
    msg += `📍 *Modalidade:* ${order.deliveryType === 'delivery' ? '🛵 Entrega em Domicílio' : '🏬 Retirar no Balcão'}\n`;
    if (order.deliveryType === 'delivery') {
      msg += `🏠 *Endereço:* ${order.address}\n`;
    }
  }
  
  msg += `💳 *Forma de Pagamento:* ${order.paymentMethod}\n`;
  if (order.changeFor) {
    msg += `💵 *Troco para:* ${order.changeFor}\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🛒 *ITENS DO PEDIDO:*\n\n`;

  items.forEach((item, index) => {
    msg += `${index + 1}️⃣ *${item.productName}*\n`;
    msg += `   ▫️ ${item.label}\n`;
    if (item.details) {
      msg += `   ▫️ _${item.details}_\n`;
    }
    msg += `   ▫️ Subtotal: R$ ${item.totalPrice.toFixed(2).replace('.', ',')}\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💵 *Subtotal:* R$ ${order.subtotal.toFixed(2).replace('.', ',')}\n`;
  
  if (order.discount > 0) {
    msg += `🏷️ *Cupom Desconto (${order.couponCode || 'APLICADO'}):* -R$ ${order.discount.toFixed(2).replace('.', ',')}\n`;
  }

  if (order.deliveryType === 'delivery') {
    if (order.deliveryFee === 0) {
      msg += `🛵 *Taxa de Entrega:* GRÁTIS 🎉\n`;
    } else {
      msg += `🛵 *Taxa de Entrega:* R$ ${order.deliveryFee.toFixed(2).replace('.', ',')}\n`;
    }
  }

  msg += `💰 *TOTAL A PAGAR: R$ ${order.total.toFixed(2).replace('.', ',')}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

  if (order.notes && order.notes.trim()) {
    msg += `📝 *Observações:* ${order.notes.trim()}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  }

  const dateStr = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  msg += `🕒 Pedido gerado em ${dateStr}\n`;

  if (isClosed) {
    msg += `\n⚠️ *Aviso do Cliente:* Sei que a loja está fechada no momento, mas deixo meu pedido registrado para ser entregue/atendido no primeiro horário! Obrigado! 🙏🐾\n`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}
