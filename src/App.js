import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Sun, Moon, Menu, X, PlusCircle, User, ShoppingCart, Package, DollarSign, ListOrdered, BarChart2, MessageSquare, Send, Bot, Loader2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';

// --- KONFIGURACJA FIREBASE ---
// Twoja konfiguracja z projektu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA6f81G0KL1yCWYR_3bRYZt-DtFqUMRhqM",
  authDomain: "panel-sprzedazy-db.firebaseapp.com",
  projectId: "panel-sprzedazy-db",
  storageBucket: "panel-sprzedazy-db.appspot.com",
  messagingSenderId: "429870526074",
  appId: "1:429870526074:web:11b826855e5fa893dc55c3"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// --- UTILITY FUNCTIONS & UI COMPONENTS (bez zmian) ---
const getStatusColorClasses = (status) => {
    switch (status) {
        case 'Nowe': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300';
        case 'Oczekuje na płatność': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300';
        case 'Opłacone': return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300';
        case 'W trakcie realizacji': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300';
        case 'Wysłane': return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300';
        case 'Zakończone': return 'bg-gray-200 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300';
        case 'Anulowane': return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-600/20 dark:text-gray-400';
    }
};
const FULFILLMENT_STATUSES = ['Nowe', 'Oczekuje na płatność', 'Opłacone', 'W trakcie realizacji', 'Wysłane', 'Zakończone', 'Anulowane'];
const PRODUCT_TYPES = ['Miód', 'Pyłek pszczeli', 'Pierzga', 'Propolis', 'Inne'];
const Card = ({ title, value, icon }) => (<div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md flex-1"><div className="flex justify-between items-start"><div><p className="text-sm text-gray-500 dark:text-gray-400 uppercase">{title}</p><p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p></div><div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">{icon}</div></div></div>);
const ChartContainer = ({ title, children, hasData }) => ( <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold mb-4">{title}</h3><div className="h-72 w-full">{hasData ? children : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Brak danych</div>)}</div></div>);
const InputField = ({ label, ...props }) => (<div><label htmlFor={props.name} className="block text-sm font-medium mb-1">{label}</label><input {...props} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>);
const SelectField = ({ label, options, ...props }) => (<div><label htmlFor={props.name} className="block text-sm font-medium mb-1">{label}</label><select {...props} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>);


// --- PAGE COMPONENTS (bez większych zmian, tylko poprawki wizualne) ---
const Dashboard = ({ orders, products, theme }) => {
    const chartData = useMemo(() => {
        const relevantOrders = orders.filter(o => ['Opłacone', 'Zakończone', 'Wysłane'].includes(o.fulfillmentStatus));
        const revenue = relevantOrders.reduce((sum, order) => sum + order.total, 0);
        const cost = relevantOrders.flatMap(o => o.products || []).reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + (product ? (product.cost || 0) * item.quantity : 0);
        }, 0);
        const monthlySales = orders.reduce((acc, order) => {
            const date = new Date(order.date);
            if(isNaN(date)) return acc;
            const month = date.toLocaleString('pl-PL', { month: 'short' });
            acc[month] = (acc[month] || 0) + order.total;
            return acc;
        }, {});
        const salesData = Object.entries(monthlySales).map(([name, Przychód]) => ({ name, Przychód }));
        const sellerSales = orders.reduce((acc, order) => {
            acc[order.seller] = (acc[order.seller] || 0) + order.total;
            return acc;
        }, { Kacper: 0, Julian: 0 });
        const sellerData = Object.entries(sellerSales).map(([name, Sprzedaż]) => ({ name, Sprzedaż }));
        const productTypeSales = orders.flatMap(o => o.products || []).reduce((acc, item) => {
            const product = products.find(p => p.id === item.productId);
            if(product) { acc[product.type] = (acc[product.type] || 0) + (item.price * item.quantity); }
            return acc;
        }, {});
        const productSalesData = Object.entries(productTypeSales).map(([name, value]) => ({name, value}));
        return { totalRevenue: revenue, profit: revenue - cost, salesData, sellerData, productSalesData };
    }, [orders, products]);
    
    const { totalRevenue, profit, salesData, sellerData, productSalesData } = chartData;
    const numberOfOrders = orders.length;
    const paidOrdersCount = orders.filter(o => o.fulfillmentStatus === 'Opłacone').length;
    const aov = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
    const tooltipStyle = { backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF', border: `1px solid ${theme === 'dark' ? '#4A5568' : '#E5E7EB'}` };
    const axisStrokeColor = theme === 'dark' ? '#A0AEC0' : '#6B7280';
    const gridStrokeColor = theme === 'dark' ? '#4A5568' : '#E5E7EB';
    const recentOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card title="Całkowity Przychód" value={`${totalRevenue.toFixed(2)} zł`} icon={<DollarSign className="text-green-500" />} />
                <Card title="Zysk" value={`${profit.toFixed(2)} zł`} icon={<DollarSign className="text-blue-500" />} />
                <Card title="Liczba Zamówień" value={numberOfOrders} icon={<ShoppingCart className="text-yellow-500" />} />
                <Card title="Śr. Wartość Zamówienia" value={`${aov.toFixed(2)} zł`} icon={<ListOrdered className="text-purple-500" />} />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2"><ChartContainer title="Przychód w czasie" hasData={orders.length > 0}><ResponsiveContainer><LineChart data={salesData}><CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} /><XAxis dataKey="name" stroke={axisStrokeColor} /><YAxis stroke={axisStrokeColor} /><Tooltip contentStyle={tooltipStyle}/><Legend /><Line type="monotone" dataKey="Przychód" stroke="#48BB78" strokeWidth={2} /></LineChart></ResponsiveContainer></ChartContainer></div>
                <div><ChartContainer title="Sprzedaż wg Typu Produktu" hasData={productSalesData.length > 0}><ResponsiveContainer><PieChart><Pie data={productSalesData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>{productSalesData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle}/><Legend /></PieChart></ResponsiveContainer></ChartContainer></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold mb-4">Ostatnie Zamówienia</h3>{recentOrders.length > 0 ? (<ul className="space-y-4">{recentOrders.map(order => (<li key={order.id} className="flex justify-between items-center text-sm"><div><p className="font-bold">{order.customerName}</p><p className="text-gray-500 dark:text-gray-400">{order.id}</p></div><div className="text-right"><p className="font-bold">{order.total.toFixed(2)} zł</p><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColorClasses(order.fulfillmentStatus)}`}>{order.fulfillmentStatus}</span></div></li>))}</ul>) : (<p className="text-gray-500 dark:text-gray-400">Brak zamówień.</p>)}</div>
                <div><ChartContainer title="Sprzedaż wg Sprzedawcy" hasData={orders.length > 0}><ResponsiveContainer><BarChart data={sellerData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} /><XAxis type="number" stroke={axisStrokeColor} /><YAxis type="category" dataKey="name" stroke={axisStrokeColor} width={60}/><Tooltip cursor={{fill: 'rgba(150, 150, 150, 0.1)'}} contentStyle={tooltipStyle}/><Bar dataKey="Sprzedaż" fill="#3182CE" barSize={30}/></BarChart></ResponsiveContainer></ChartContainer></div>
            </div>
        </div>
    );
};
const OrderForm = ({ onSave, onClose, products }) => {
    const [customerName, setCustomerName] = useState('');
    const [seller, setSeller] = useState('Kacper');
    const [orderItems, setOrderItems] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const total = useMemo(() => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [orderItems]);
    const addProductToOrder = () => { if (!selectedProductId || orderItems.some(item => item.productId === selectedProductId)) return; const product = products.find(p => p.id === selectedProductId); if (product) setOrderItems([...orderItems, { ...product, productId: product.id, quantity: 1 }]); setSelectedProductId(''); };
    const updateItem = (productId, field, value) => setOrderItems(orderItems.map(item => item.productId === productId ? { ...item, [field]: (field === 'quantity' ? Math.max(1, parseInt(value, 10) || 1) : parseFloat(value) || 0) } : item));
    const removeProductFromOrder = (productId) => setOrderItems(orderItems.filter(item => item.productId !== productId));
    const handleSubmit = (e) => { e.preventDefault(); onSave({ customerName, seller, products: orderItems }); onClose(); };
    return (<div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start p-4 overflow-y-auto"><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-3xl my-8"><h2 className="text-2xl font-bold mb-6">Dodaj Nowe Zamówienie</h2><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><InputField label="Nazwa Klienta" name="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /><SelectField label="Sprzedawca" name="seller" value={seller} onChange={(e) => setSeller(e.target.value)} options={['Kacper', 'Julian']} /></div><div className="border-t border-gray-200 dark:border-gray-700 pt-4"><h3 className="text-lg font-semibold mb-2">Produkty</h3><div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">{orderItems.map(item => (<div key={item.productId} className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-sm"><span className="font-medium col-span-4 sm:col-span-5">{item.name} ({item.weight})</span><div className="col-span-3 sm:col-span-2"><input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.productId, 'quantity', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-600 rounded-md p-1 text-center" /></div><div className="col-span-3"><input type="number" step="0.01" value={item.price} onChange={e => updateItem(item.productId, 'price', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-600 rounded-md p-1 text-center" /></div><button type="button" onClick={() => removeProductFromOrder(item.productId)} className="text-red-500 hover:text-red-700 p-1 col-span-2 sm:col-span-1 flex justify-end"><Trash2 className="h-4 w-4" /></button></div>))}<div className="flex items-center gap-2 mt-4"><select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="flex-grow w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3"><option value="">-- Wybierz produkt --</option>{products.filter(p => !orderItems.some(oi => oi.productId === p.id)).map(p => <option key={p.id} value={p.id}>{p.name} ({p.weight})</option>)}</select><button type="button" onClick={addProductToOrder} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shrink-0">Dodaj</button></div></div></div><div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4"><span className="text-xl font-bold">Suma: {total.toFixed(2)} zł</span><div className="flex justify-end gap-4 w-full sm:w-auto"><button type="button" onClick={onClose} className="flex-1 sm:flex-none py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition">Anuluj</button><button type="submit" disabled={!customerName || orderItems.length === 0} className="flex-1 sm:flex-none py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed">Zapisz</button></div></div></form></div></div>);
};
const Orders = ({ orders, products, customers }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const handleSaveOrder = async (orderData) => {
        const total = orderData.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const finalOrder = { date: new Date().toISOString(), paymentStatus: 'Oczekuje na płatność', fulfillmentStatus: 'Nowe', ...orderData, total };
        await addDoc(collection(db, "orders"), finalOrder);
        const customerRef = doc(db, "customers", orderData.customerName.toLowerCase());
        const customer = customers.find(c => c.id === orderData.customerName.toLowerCase());
        if (customer) { await updateDoc(customerRef, { orderCount: (customer.orderCount || 0) + 1, totalSpent: (customer.totalSpent || 0) + total }); } 
        else { await setDoc(customerRef, { name: orderData.customerName, orderCount: 1, totalSpent: total, email: '' }); }
    };
    const handleStatusChange = async (orderId, newStatus) => { await updateDoc(doc(db, "orders", orderId), { fulfillmentStatus: newStatus }); };
    return (<div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md"><div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4"><h2 className="text-xl font-semibold">Zamówienia</h2><button className="w-full sm:w-auto flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Dodaj Zamówienie</button></div><div className="overflow-x-auto"><table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50"><tr>{['Klient', 'Suma', 'Status'].map(h => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody>{orders.map(order => (<tr key={order.id} className="border-b border-gray-200 dark:border-gray-700">
            <td className="px-4 py-3 font-medium">{order.customerName}</td><td className="px-4 py-3">{order.total.toFixed(2)} zł</td><td className="px-4 py-3"><select value={order.fulfillmentStatus} onChange={(e) => handleStatusChange(order.id, e.target.value)} className={`p-1 rounded text-xs border-0 focus:ring-0 appearance-none ${getStatusColorClasses(order.fulfillmentStatus)}`} style={{backgroundColor: 'transparent', border: '1px solid currentColor'}}>{FULFILLMENT_STATUSES.map(s => <option key={s} value={s} className="bg-gray-800 text-white">{s}</option>)}</select></td>
        </tr>))}</tbody>
    </table></div>{isFormOpen && <OrderForm onSave={handleSaveOrder} onClose={()=>setIsFormOpen(false)} products={products} />}</div>);
};
const Customers = ({ customers }) => ( <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md"><h2 className="text-xl font-semibold mb-4">Klienci</h2><div className="overflow-x-auto"><table className="w-full text-sm text-left"> <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50"><tr>{['Nazwa', 'Zamówienia', 'Wydano'].map(h => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead> <tbody>{[...customers].sort((a,b) => b.totalSpent - a.totalSpent).map(c => (<tr key={c.id} className="border-b border-gray-200 dark:border-gray-700"><td className="px-4 py-3 font-medium">{c.name}</td><td className="px-4 py-3">{c.orderCount || 0}</td><td className="px-4 py-3">{(c.totalSpent || 0).toFixed(2)} zł</td></tr>))}</tbody></table></div></div>);
const ProductForm = ({ onSave, onClose }) => { const [formData, setFormData] = useState({ name: '', price: '', cost: '', stock: '', type: 'Miód', weight: '' }); const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); }; const handleSubmit = (e) => { e.preventDefault(); onSave({ ...formData, price: parseFloat(formData.price) || 0, cost: parseFloat(formData.cost) || 0, stock: parseInt(formData.stock, 10) || 0, }); onClose();}; return (<div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md"><h2 className="text-2xl font-bold mb-6">Dodaj Nowy Produkt</h2><form onSubmit={handleSubmit} className="space-y-4"><InputField label="Nazwa Produktu" name="name" value={formData.name} onChange={handleChange} required /><SelectField label="Typ Produktu" name="type" value={formData.type} onChange={handleChange} options={PRODUCT_TYPES} /><InputField label="Waga (np. 1kg, 250g)" name="weight" value={formData.weight} onChange={handleChange} /><InputField label="Cena (zł)" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required /><InputField label="Koszt (zł)" name="cost" type="number" step="0.01" value={formData.cost} onChange={handleChange} /><InputField label="Ilość w Magazynie" name="stock" type="number" value={formData.stock} onChange={handleChange} /><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg">Anuluj</button><button type="submit" className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg">Zapisz</button></div></form></div></div>); };
const Products = ({ products }) => { const [isFormOpen, setIsFormOpen] = useState(false); const handleSaveProduct = async (productData) => { await addDoc(collection(db, "products"), productData); }; return (<div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md"><div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4"><h2 className="text-xl font-semibold">Produkty</h2><button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"><PlusCircle className="mr-2 h-4 w-4"/> Dodaj Produkt</button></div><div className="overflow-x-auto"><table className="w-full text-sm text-left"> <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50"><tr>{['Nazwa', 'Waga', 'Cena', 'Stan'].map(h => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead> <tbody>{products.map(p => (<tr key={p.id} className="border-b border-gray-200 dark:border-gray-700"> <td className="px-4 py-3 font-medium">{p.name}</td><td className="px-4 py-3">{p.weight}</td><td className="px-4 py-3">{p.price.toFixed(2)} zł</td><td className={`px-4 py-3 font-bold ${p.stock <= 10 ? 'text-red-500' : 'text-green-500'}`}>{p.stock}</td></tr>))}</tbody></table></div>{isFormOpen && <ProductForm onSave={handleSaveProduct} onClose={() => setIsFormOpen(false)} />}</div>); };

// --- NOWY KOMPONENT: CHATBOT ---
const Chatbot = ({ allData, isVisible, onClose }) => {
    const [messages, setMessages] = useState([{ sender: 'ai', text: 'Cześć! Jestem Twoim asystentem. Zapytaj mnie o dane z Twojej bazy.' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: input, context: allData }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Błąd odpowiedzi od AI');
            }
            const aiMessage = { sender: 'ai', text: result.answer };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage = { sender: 'ai', text: `Przepraszam, wystąpił błąd: ${error.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 right-5 sm:right-10 w-[calc(100%-2.5rem)] sm:w-96 h-[70vh] sm:h-[60vh] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-40">
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Bot/> Asystent AI</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><X size={20}/></button>
            </header>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0"><Bot size={20} className="text-white"/></div>}
                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'ai' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-500 text-white'}`}>{msg.text}</div>
                    </div>
                ))}
                 {isLoading && <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0"><Bot size={20} className="text-white"/></div><div className="max-w-[80%] p-3 rounded-lg bg-gray-100 dark:bg-gray-700"><Loader2 className="animate-spin" /></div></div>}
                <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Zadaj pytanie..." className="w-full bg-gray-100 dark:bg-gray-600 border-none rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500" />
                    <button onClick={handleSend} className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400" disabled={isLoading}><Send/></button>
                </div>
            </footer>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
    const [activePage, setActivePage] = useState('Panel Główny');
    const [theme, setTheme] = useState('light');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isChatVisible, setChatVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) setTheme(savedTheme);
        else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    }, []);
    
    useEffect(() => {
        document.documentElement.className = theme;
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
        const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
        const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => setCustomers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))));
        setIsLoading(false);
        return () => { unsubOrders(); unsubProducts(); unsubCustomers(); };
    }, []);
    
    const renderPage = () => {
        if (isLoading) return <div className="flex justify-center items-center h-64"><p>Ładowanie danych z bazy...</p></div>;
        switch (activePage) {
            case 'Panel Główny': return <Dashboard orders={orders} products={products} theme={theme} />;
            case 'Zamówienia': return <Orders orders={orders} products={products} customers={customers} />;
            case 'Klienci': return <Customers customers={customers} />;
            case 'Produkty': return <Products products={products} />;
            default: return <Dashboard orders={orders} products={products} theme={theme} />;
        }
    };

    const NavItem = ({ label, icon, isActive, onClick }) => (<li><a href="#" onClick={onClick} className={`flex items-center p-3 rounded-lg transition-colors ${isActive ? 'bg-gray-200 dark:bg-gray-700 font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{icon} <span className="ml-3">{label}</span></a></li>);
    const menuItems = [ { label: 'Panel Główny', icon: <BarChart2 className="w-5 h-5"/> }, { label: 'Zamówienia', icon: <ShoppingCart className="w-5 h-5"/> }, { label: 'Klienci', icon: <User className="w-5 h-5"/> }, { label: 'Produkty', icon: <Package className="w-5 h-5"/> } ];

    return (
        <div className={`bg-gray-100 dark:bg-gray-900 min-h-screen font-sans flex text-gray-900 dark:text-white ${theme}`}>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
            <aside className={`w-64 bg-white dark:bg-gray-800 flex-shrink-0 p-4 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex flex-col fixed md:relative h-full z-30 transition-transform duration-300 ease-in-out shadow-lg`}>
                <div className="text-gray-900 dark:text-white text-2xl font-bold p-3 mb-5 text-center">Panel Sprzedaży</div>
                <nav className="flex-1"><ul>{menuItems.map(item => <NavItem key={item.label} {...item} isActive={activePage === item.label} onClick={() => {setActivePage(item.label); setSidebarOpen(false);}} />)}</ul></nav>
            </aside>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center"><button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden mr-4 text-gray-600 dark:text-gray-300"><Menu className="h-6 w-6" /></button><h1 className="text-2xl sm:text-3xl font-bold">{activePage}</h1></div>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">{theme === 'dark' ? <Sun className="h-6 w-6"/> : <Moon className="h-6 w-6"/>}</button>
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-white">TW</div>
                    </div>
                </header>
                {renderPage()}
            </main>
            {/* Przycisk i okno chatbota */}
            <Chatbot allData={{ orders, products, customers }} isVisible={isChatVisible} onClose={() => setChatVisible(false)} />
            <button onClick={() => setChatVisible(v => !v)} className="fixed bottom-5 right-5 sm:right-10 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-30">
                <MessageSquare size={24}/>
            </button>
        </div>
    );
}
