import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Sun, Moon, Menu, X, UploadCloud, Search, Bell, PlusCircle, Download, User, ShoppingCart, Package, DollarSign, ListOrdered, ChevronsUpDown, Filter, Link as LinkIcon, FileText, Folder, Book, Camera, BarChart2, Edit, Trash2, FileSignature } from 'lucide-react';

// --- MOCK DATA (Initial State) ---
const initialProducts = [];
const initialCustomers = [];
const initialOrders = [];
const initialResources = [];

// --- UTILITY FUNCTIONS ---
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

// --- UI COMPONENTS ---
const Card = ({ title, value, icon, subtext }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex-1">
        <div className="flex justify-between items-start">
            <div><p className="text-sm text-gray-500 dark:text-gray-400 uppercase">{title}</p><p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>{subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>}</div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">{icon}</div>
        </div>
    </div>
);
const ChartContainer = ({ title, children, hasData }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3><div className="h-72 w-full">{hasData ? children : (<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Brak danych do wyświetlenia</div>)}</div></div>
);
const InputField = ({ label, ...props }) => (
    <div><label htmlFor={props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label><input {...props} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
);
const SelectField = ({ label, options, ...props }) => (
    <div><label htmlFor={props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label><select {...props} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
);
const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <div className="flex justify-end gap-4">
                <button onClick={onCancel} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition">Anuluj</button>
                <button onClick={onConfirm} className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">Potwierdź</button>
            </div>
        </div>
    </div>
);

// --- HELPER FUNCTION FOR GOOGLE SHEETS ---
const saveDataToSheet = (sheetName, data) => {
    fetch('/api/save-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, data }),
    })
    .then(response => response.json())
    .then(result => console.log(`Zapisano w ${sheetName}:`, result))
    .catch(err => console.error(`Błąd zapisu do ${sheetName}:`, err));
}

// --- PAGE COMPONENTS ---

const Dashboard = ({ orders, customers, products, theme, setActivePage }) => {
    const { totalRevenue, profit, salesData, productSalesData } = useMemo(() => {
        const relevantOrders = orders.filter(o => ['Opłacone', 'Zakończone', 'Wysłane'].includes(o.fulfillmentStatus));
        const revenue = relevantOrders.reduce((sum, order) => sum + order.total, 0);
        const cost = relevantOrders.flatMap(o => o.products || []).reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + (product ? product.cost * item.quantity : 0);
        }, 0);

        const monthlySales = orders.reduce((acc, order) => {
            const month = new Date(order.date).toLocaleString('pl-PL', { month: 'short' });
            acc[month] = (acc[month] || 0) + order.total;
            return acc;
        }, {});
        const salesData = Object.entries(monthlySales).map(([name, Przychód]) => ({ name, Przychód }));
        
        const sellerSales = orders.reduce((acc, order) => {
            acc[order.seller] = (acc[order.seller] || 0) + order.total;
            return acc;
        }, { Kacper: 0, Julian: 0 });
        const sellerData = Object.entries(sellerSales).map(([name, Sprzedaż]) => ({ name, Sprzedaż }));
        
        const productTypeSales = orders.flatMap(o => o.products).reduce((acc, item) => {
            const product = products.find(p => p.id === item.productId);
            if(product) {
                acc[product.type] = (acc[product.type] || 0) + (item.price * item.quantity);
            }
            return acc;
        }, {});
        const productSalesData = Object.entries(productTypeSales).map(([name, value]) => ({name, value}));

        return { totalRevenue: revenue, profit: revenue - cost, salesData, sellerData, productSalesData };
    }, [orders, products]);

    const numberOfOrders = orders.length;
    const paidOrdersCount = orders.filter(o => o.paymentStatus === 'Opłacone').length;
    const aov = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];
    const tooltipStyle = { backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF', border: `1px solid ${theme === 'dark' ? '#4A5568' : '#E5E7EB'}`, color: theme === 'dark' ? '#E2E8F0' : '#1F2937' };
    const axisStrokeColor = theme === 'dark' ? '#A0AEC0' : '#6B7280';
    const gridStrokeColor = theme === 'dark' ? '#E5E7EB' : '#E5E7EB';
    
    const recentOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    const topCustomers = useMemo(() => {
        const customerSpending = orders.reduce((acc, order) => {
            if (['Opłacone', 'Wysłane', 'Zakończone'].includes(order.fulfillmentStatus)) {
                if (!acc[order.customerName]) {
                  acc[order.customerName] = { totalSpent: 0, orderCount: 0 };
                }
                acc[order.customerName].totalSpent += order.total;
                acc[order.customerName].orderCount += 1;
            }
            return acc;
        }, {});
        return Object.entries(customerSpending).sort(([,a], [,b]) => b.totalSpent - a.totalSpent).slice(0, 5).map(([name, data]) => ({ name, ...data }));
    }, [orders]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><Card title="Całkowity Przychód" value={`${totalRevenue.toFixed(2)} zł`} icon={<DollarSign className="text-green-500 dark:text-green-400"/>} subtext="Na podstawie opłaconych i zrealizowanych zamówień" /><Card title="Zysk" value={`${profit.toFixed(2)} zł`} icon={<DollarSign className="text-blue-500 dark:text-blue-400"/>} subtext="Przychód - koszt produktów" /><Card title="Liczba Zamówień" value={numberOfOrders} icon={<ShoppingCart className="text-yellow-500 dark:text-yellow-400"/>} subtext="Wszystkie zamówienia" /><Card title="Śr. Wartość Zamówienia" value={`${aov.toFixed(2)} zł`} icon={<ListOrdered className="text-purple-500 dark:text-purple-400"/>} subtext="Na podstawie opłaconych zamówień" /></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><ChartContainer title="Przychód w czasie" hasData={orders.length > 0}><ResponsiveContainer><LineChart data={salesData}><CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} /><XAxis dataKey="name" stroke={axisStrokeColor} /><YAxis stroke={axisStrokeColor} /><Tooltip contentStyle={tooltipStyle}/><Legend /><Line type="monotone" dataKey="Przychód" stroke="#48BB78" strokeWidth={2} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></ChartContainer></div><div><ChartContainer title="Sprzedaż wg Typu Produktu" hasData={productSalesData.length > 0}><ResponsiveContainer><PieChart><Pie data={productSalesData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{productSalesData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle}/><Legend /></PieChart></ResponsiveContainer></ChartContainer></div></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ostatnie Zamówienia</h3>{recentOrders.length > 0 ? (<ul className="space-y-4">{recentOrders.map(order => (<li key={order.id} className="flex justify-between items-center text-sm"><div><p className="font-bold text-gray-800 dark:text-gray-200 hover:underline cursor-pointer" onClick={() => setActivePage('Zamówienia')}>{order.id}</p><p className="text-gray-500 dark:text-gray-400">{order.customerName}</p></div><div className="text-right"><p className="font-bold text-gray-800 dark:text-gray-200">{order.total.toFixed(2)} zł</p><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColorClasses(order.fulfillmentStatus)}`}>{order.fulfillmentStatus}</span></div></li>))}</ul>) : (<p className="text-gray-500 dark:text-gray-400">Brak ostatnich zamówień.</p>)}</div><div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Klienci</h3>{topCustomers.length > 0 ? (<ul className="space-y-4">{topCustomers.map(customer => (<li key={customer.name} className="flex justify-between items-center text-sm"><div><p className="font-bold text-gray-800 dark:text-gray-200 hover:underline cursor-pointer" onClick={() => setActivePage('Klienci')}>{customer.name}</p><p className="text-gray-500 dark:text-gray-400">{customer.orderCount} opłaconych zamówień</p></div><p className="font-bold text-green-600 dark:text-green-400">{customer.totalSpent.toFixed(2)} zł</p></li>))}</ul>) : (<p className="text-center py-4 text-gray-500 dark:text-gray-400">Brak opłaconych zamówień, by wyłonić top klientów.</p>)}</div></div><div><ChartContainer title="Sprzedaż wg Sprzedawcy" hasData={orders.length > 0}><ResponsiveContainer><BarChart data={sellerData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} /><XAxis type="number" stroke={axisStrokeColor} /><YAxis type="category" dataKey="name" stroke={axisStrokeColor} width={60}/><Tooltip cursor={{fill: 'rgba(150, 150, 150, 0.1)'}} contentStyle={tooltipStyle}/><Bar dataKey="Sprzedaż" fill="#3182CE" barSize={30}/></BarChart></ResponsiveContainer></ChartContainer></div></div>
        </div>
    );
};

const OrderForm = ({ order, onSave, onClose, products }) => {
    const [customerName, setCustomerName] = useState(order?.customerName || '');
    const [seller, setSeller] = useState(order?.seller || 'Kacper');
    const [orderItems, setOrderItems] = useState(order?.products || []);
    const [selectedProductId, setSelectedProductId] = useState('');

    const total = useMemo(() => {
        return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [orderItems]);
    
    const addProductToOrder = () => {
        if (!selectedProductId || orderItems.some(item => item.productId === selectedProductId)) return;
        const product = products.find(p => p.id == selectedProductId);
        if (product) {
            setOrderItems([...orderItems, { productId: product.id, quantity: 1, name: product.name, price: product.price }]);
            setSelectedProductId('');
        }
    };
    
    const updateItem = (productId, field, value) => {
        setOrderItems(orderItems.map(item => {
            if (item.productId === productId) {
                const newRawValue = value;
                let newValue;
                if (field === 'quantity') {
                    newValue = Math.max(1, parseInt(newRawValue, 10) || 1);
                } else {
                    newValue = parseFloat(newRawValue) || 0;
                }
                return { ...item, [field]: newValue };
            }
            return item;
        }));
    };

    const removeProductFromOrder = (productId) => {
        setOrderItems(orderItems.filter(item => item.productId !== productId));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ customerName, seller, products: orderItems });
        onClose();
    };

    const isSaveDisabled = !customerName || orderItems.length === 0;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-3xl my-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{order ? 'Edytuj Zamówienie' : 'Dodaj Nowe Zamówienie'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nazwa Klienta" name="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                        <SelectField label="Sprzedawca" name="seller" value={seller} onChange={(e) => setSeller(e.target.value)} options={['Kacper', 'Julian']} />
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Produkty w zamówieniu</h3>
                        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                            {orderItems.length > 0 ? (
                                orderItems.map(item => (
                                    <div key={item.productId} className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                        <span className="font-medium text-gray-800 dark:text-gray-200 col-span-4">{item.name}</span>
                                        <div className="col-span-2">
                                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.productId, 'quantity', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-600 rounded-md p-1 text-center" />
                                        </div>
                                        <div className="col-span-2">
                                            <input type="number" step="0.01" value={item.price} onChange={e => updateItem(item.productId, 'price', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-600 rounded-md p-1 text-center" />
                                        </div>
                                        <div className="col-span-3 text-right font-semibold text-gray-700 dark:text-gray-200">
                                            {(item.quantity * item.price).toFixed(2)} zł
                                        </div>
                                        <button type="button" onClick={() => removeProductFromOrder(item.productId)} className="text-red-500 hover:text-red-700 p-1 col-span-1 flex justify-end"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                ))
                            ) : ( <p className="text-gray-500 dark:text-gray-400 text-sm">Dodaj produkty do zamówienia poniżej.</p> )}
                        </div>
                        <div className="flex items-center gap-2">
                            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="flex-grow w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">-- Wybierz produkt --</option>
                                {products.filter(p => !orderItems.some(oi => oi.productId === p.id)).map(p => <option key={p.id} value={p.id}>{p.name} ({p.weight})</option>)}
                            </select>
                            <button type="button" onClick={addProductToOrder} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shrink-0">Dodaj</button>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Suma: {total.toFixed(2)} zł</span>
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition">Anuluj</button>
                            <button type="submit" disabled={isSaveDisabled} className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed">Zapisz Zamówienie</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Orders = ({ orders, setOrders, products, setCustomers }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [orderToDelete, setOrderToDelete] = useState(null);

    const handleSelectOrder = (orderId) => {
        setSelectedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
    };
    
    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedOrders(orders.map(o => o.id));
        else setSelectedOrders([]);
    };
    
    const openForm = (order = null) => { setSelectedOrder(order); setIsFormOpen(true); };
    const closeForm = () => { setSelectedOrder(null); setIsFormOpen(false); };
    
    const handleSaveOrder = (orderData) => {
        // Handle Customer
        setCustomers(prevCustomers => {
            const customerExists = prevCustomers.some(c => c.name.toLowerCase() === orderData.customerName.toLowerCase());
            if (!customerExists) {
                const newCustomer = { id: `CUST-${Date.now()}`, name: orderData.customerName, email: '' };
                const sheetData = [newCustomer.id, newCustomer.name, newCustomer.email, 0, 0];
                saveDataToSheet('Klienci', sheetData);
                return [...prevCustomers, newCustomer];
            }
            return prevCustomers;
        });

        // Handle Order
        const total = orderData.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
        let finalOrder;
        if (selectedOrder) {
            // NOTE: Editing an order does not update the sheet in this version.
            finalOrder = { ...selectedOrder, ...orderData, total };
            setOrders(orders.map(o => o.id === selectedOrder.id ? finalOrder : o));
        } else {
            finalOrder = { 
                id: `ZAM-${String(orders.length + 1).padStart(4, '0')}`, 
                date: new Date().toISOString().split('T')[0], 
                paymentStatus: 'Oczekuje na płatność', 
                fulfillmentStatus: 'Nowe', 
                ...orderData, 
                total 
            };
            const sheetData = [
                finalOrder.id,
                finalOrder.customerName,
                finalOrder.seller,
                finalOrder.date,
                finalOrder.total,
                finalOrder.paymentStatus,
                finalOrder.fulfillmentStatus,
                JSON.stringify(finalOrder.products)
            ];
            saveDataToSheet('Zamówienia', sheetData);
            setOrders(prev => [finalOrder, ...prev]);
        }
    };
    
    const handleGenerateLabels = () => {
        alert(`Generowanie etykiet dla zamówień: ${selectedOrders.join(', ')}`);
        setSelectedOrders([]);
    };
    
    const handleDeleteOrder = (orderId) => {
        // NOTE: Deleting an order does not update the sheet in this version.
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setOrderToDelete(null);
    };

    const handleStatusChange = (orderId, newStatus) => {
        // NOTE: Changing status does not update the sheet in this version.
        setOrders(orders.map(o => o.id === orderId ? { ...o, fulfillmentStatus: newStatus } : o));
    }
    
    return (<div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4"><h2 className="text-xl font-semibold text-gray-900 dark:text-white">Zarządzanie Zamówieniami</h2><div className="flex items-center gap-2 flex-wrap"><button className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm" onClick={() => openForm()}><PlusCircle className="mr-2 h-4 w-4"/> Dodaj Zamówienie</button></div></div>
    {selectedOrders.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Zaznacz zamówienia, aby aktywować akcje masowe.</p>}
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                <tr>
                    <th scope="col" className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={selectedOrders.length === orders.length && orders.length > 0} className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 bg-gray-50 dark:bg-gray-700" /></th>
                    {['ID', 'Klient', 'Sprzedawca', 'Data', 'Suma', 'Status', ''].map(h => <th key={h} scope="col" className="px-6 py-3">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {orders.length > 0 ? orders.map((order) => (
                    <tr key={order.id} className={`border-b border-gray-200 dark:border-gray-700 transition-colors ${selectedOrders.includes(order.id) ? 'bg-blue-50 dark:bg-blue-900/50' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <td className="w-4 p-4"><input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleSelectOrder(order.id)} className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 bg-gray-50 dark:bg-gray-700" /></td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.id}</td>
                        <td className="px-6 py-4">{order.customerName}</td>
                        <td className="px-6 py-4">{order.seller}</td>
                        <td className="px-6 py-4">{new Date(order.date).toLocaleDateString('pl-PL')}</td>
                        <td className="px-6 py-4">{order.total.toFixed(2)} zł</td>
                        <td className="px-6 py-4"><select value={order.fulfillmentStatus} onChange={(e) => handleStatusChange(order.id, e.target.value)} onClick={(e) => e.stopPropagation()} className={`p-1 rounded text-xs border-0 focus:ring-0 ${getStatusColorClasses(order.fulfillmentStatus)}`} style={{backgroundColor: 'transparent', border: '1px solid currentColor', appearance: 'none'}}>{FULFILLMENT_STATUSES.map(s => <option key={s} value={s} className="bg-gray-800 text-white">{s}</option>)}</select></td>
                        <td className="px-6 py-4 text-right"><button onClick={() => setOrderToDelete(order.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4"/></button></td>
                    </tr>
                )) : (<tr><td colSpan="8" className="text-center py-10 text-gray-500 dark:text-gray-400">Brak zamówień.</td></tr>)}
            </tbody>
        </table>
    </div>
    {selectedOrders.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-700 shadow-2xl rounded-lg px-6 py-4 flex items-center gap-6 animate-fade-in-up z-40">
            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200"><ShoppingCart className="h-6 w-6 text-blue-500"/> <span className="font-bold text-lg">{selectedOrders.length}</span> zaznaczono</div>
            <button onClick={handleGenerateLabels} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"><FileSignature className="mr-2 h-5 w-5"/> Wygeneruj etykiety</button>
        </div>
    )}
    {isFormOpen && <OrderForm order={selectedOrder} onSave={handleSaveOrder} onClose={closeForm} products={products} />}
    {orderToDelete && <ConfirmationModal title="Potwierdź usunięcie" message="Czy na pewno chcesz trwale usunąć to zamówienie?" onConfirm={() => handleDeleteOrder(orderToDelete)} onCancel={() => setOrderToDelete(null)} />}
    </div>);
};

const Customers = ({ customers, orders }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const customerData = useMemo(() => {
        return customers
            .map(c => {
                const customerOrders = orders.filter(o => o.customerName.toLowerCase() === c.name.toLowerCase());
                const totalSpent = customerOrders.reduce((sum, o) => sum + o.total, 0);
                return { ...c, orderCount: customerOrders.length, totalSpent };
            })
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [customers, orders, searchTerm]);
    return (<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"><h2 className="text-xl font-semibold text-gray-900 dark:text-white">Baza Klientów</h2><div className="relative w-full md:w-1/3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5"/><input type="text" placeholder="Szukaj klienta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-10 pr-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/></div></div>{customerData.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{customerData.map(customer => (<div key={customer.id} className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-lg"><h3 className="text-lg font-bold text-gray-900 dark:text-white">{customer.name}</h3><div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-between"><div><p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Wydano Łącznie</p><p className="text-lg font-semibold text-green-600 dark:text-green-400">{customer.totalSpent.toFixed(2)} zł</p></div><div><p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Zamówienia</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{customer.orderCount}</p></div></div></div>))}</div>) : (<p className="text-center py-10 text-gray-500 dark:text-gray-400">Brak klientów. Dodaj zamówienie, aby utworzyć klienta.</p>)}</div>);
};

const ProductForm = ({ product, onSave, onClose }) => {
    const [formData, setFormData] = useState({ name: product?.name || '', price: product?.price || '', cost: product?.cost || '', stock: product?.stock || '', type: product?.type || 'Miód', weight: product?.weight || '' });
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave({ ...formData, price: parseFloat(formData.price) || 0, cost: parseFloat(formData.cost) || 0, stock: parseInt(formData.stock, 10) || 0, }); };
    return (<div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md"><h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{product ? 'Edytuj Produkt' : 'Dodaj Nowy Produkt'}</h2><form onSubmit={handleSubmit} className="space-y-4"><InputField label="Nazwa Produktu" name="name" value={formData.name} onChange={handleChange} required /><SelectField label="Typ Produktu" name="type" value={formData.type} onChange={handleChange} options={PRODUCT_TYPES} /><InputField label="Waga (np. 1kg, 250g)" name="weight" value={formData.weight} onChange={handleChange} placeholder="np. 1kg, 250g" /><InputField label="Cena (zł)" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required /><InputField label="Koszt (zł)" name="cost" type="number" step="0.01" value={formData.cost} onChange={handleChange} required /><InputField label="Ilość w Magazynie" name="stock" type="number" value={formData.stock} onChange={handleChange} required /><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition">Anuluj</button><button type="submit" className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition">Zapisz</button></div></form></div></div>);
};

const Products = ({ products, setProducts }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const openForm = (product = null) => { setSelectedProduct(product); setIsFormOpen(true); };
    const closeForm = () => { setSelectedProduct(null); setIsFormOpen(false); };
    const handleSaveProduct = (productData) => { 
        let finalProduct;
        if (selectedProduct) { 
            // NOTE: Editing an product does not update the sheet in this version.
            finalProduct = { ...selectedProduct, ...productData };
            setProducts(products.map(p => p.id === selectedProduct.id ? finalProduct : p)); 
        } else { 
            finalProduct = { id: `PROD-${Date.now()}`, ...productData };
            const sheetData = [
                finalProduct.id,
                finalProduct.name,
                finalProduct.type,
                finalProduct.weight,
                finalProduct.price,
                finalProduct.cost,
                finalProduct.stock
            ];
            saveDataToSheet('Produkty', sheetData);
            setProducts([finalProduct, ...products]); 
        } 
        closeForm(); 
    };
    return (<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold text-gray-900 dark:text-white">Baza Produktów</h2><button onClick={() => openForm()} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"><PlusCircle className="mr-2 h-4 w-4"/> Dodaj Produkt</button></div><div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-600 dark:text-gray-300"><thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50"><tr><th scope="col" className="px-6 py-3">Nazwa</th><th scope="col" className="px-6 py-3">Waga</th><th scope="col" className="px-6 py-3">Cena</th><th scope="col" className="px-6 py-3">Koszt</th><th scope="col" className="px-6 py-3">Stan</th><th scope="col" className="px-6 py-3"><span className="sr-only">Edit</span></th></tr></thead><tbody>{products.length > 0 ? products.map(p => (<tr key={p.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td><td className="px-6 py-4">{p.weight}</td><td className="px-6 py-4">{p.price.toFixed(2)} zł</td><td className="px-6 py-4">{p.cost.toFixed(2)} zł</td><td className={`px-6 py-4 font-bold ${p.stock <= 10 ? 'text-red-500' : 'text-green-500'}`}>{p.stock}</td><td className="px-6 py-4 text-right"><button onClick={() => openForm(p)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edytuj</button></td></tr>)) : (<tr><td colSpan="6" className="text-center py-10 text-gray-500 dark:text-gray-400">Brak produktów.</td></tr>)}</tbody></table></div>{isFormOpen && <ProductForm product={selectedProduct} onSave={handleSaveProduct} onClose={closeForm} />}</div>);
};

const ALL_ICONS = { LinkIcon, FileText, Folder, Book, Camera, BarChart2 };
const IconPicker = ({ selectedIcon, onSelect }) => (<div className="grid grid-cols-6 gap-2">{Object.entries(ALL_ICONS).map(([name, IconComponent]) => (<button type="button" key={name} onClick={() => onSelect(name)} className={`p-3 rounded-lg flex items-center justify-center transition ${selectedIcon === name ? 'bg-blue-500 text-white ring-2 ring-blue-300' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}><IconComponent className="h-6 w-6" /></button>))}</div>);

const ResourceForm = ({ resource, onSave, onClose, availableCategories }) => {
    const [formData, setFormData] = useState({ name: resource?.name || '', category: resource?.category || availableCategories[0] || 'Ogólne', type: resource?.type || 'Link', url: resource?.url || '', icon: resource?.icon || 'LinkIcon' });
    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return (<div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md"><h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{resource ? 'Edytuj Element' : 'Dodaj Nowy Element'}</h2><form onSubmit={handleSubmit} className="space-y-4"><InputField label="Nazwa" name="name" value={formData.name} onChange={handleChange} required /><SelectField label="Kategoria" name="category" value={formData.category} onChange={handleChange} options={availableCategories} />{formData.type === 'Link' && <InputField label="URL" name="url" type="url" value={formData.url} onChange={handleChange} required />}<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ikona</label><IconPicker selectedIcon={formData.icon} onSelect={(icon) => setFormData(p => ({...p, icon}))} /><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition">Anuluj</button><button type="submit" className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition">Zapisz</button></div></form></div></div>);
};

const Pasieka = ({ resources, setResources }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const dropZoneRef = useRef(null);
    
    const openForm = (r = null) => { setSelectedResource(r); setIsFormOpen(true); };
    const closeForm = () => { setSelectedResource(null); setIsFormOpen(false); };
    const handleSave = (data) => { if (selectedResource) { setResources(resources.map(r => r.id === selectedResource.id ? { ...r, ...data } : r)); } else { setResources([...resources, { id: Date.now(), ...data }]); } closeForm(); };
    const handleDelete = (id) => setResources(resources.filter(r => r.id !== id));
    
    const groupedResources = useMemo(() => {
        const initialGroups = { 'Dokumenty': [], 'Linki': [], 'Zdjęcia': [] };
        return resources.reduce((acc, resource) => {
            const category = resource.category || 'Inne';
            if (!acc[category]) acc[category] = [];
            acc[category].push(resource);
            return acc;
        }, initialGroups);
    }, [resources]);

    const availableCategories = Object.keys(groupedResources);

    const handleAddCategory = () => {
        if (newCategory && !availableCategories.includes(newCategory)) {
           setResources([...resources, {id: Date.now(), name: `Nowy pusty element w ${newCategory}`, category: newCategory, type: 'Folder', icon: 'Folder' }]);
           setNewCategory('');
        }
    };

    const handleDragEvents = (e, isEntering) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(isEntering);
    };

    const handleDrop = (e) => {
        handleDragEvents(e, false);
        const files = [...e.dataTransfer.files];
        if (files.length > 0) {
            const newFiles = files.map(file => ({
                id: `FILE-${Date.now()}-${Math.random()}`,
                name: file.name,
                type: 'Plik',
                category: 'Dokumenty', // Default category for drops
                icon: file.type.startsWith('image/') ? 'Camera' : 'FileText',
            }));
            setResources(prev => [...prev, ...newFiles]);
        }
    };

    const renderIcon = (iconName) => { const Icon = ALL_ICONS[iconName] || FileText; return <Icon className="h-10 w-10 text-gray-700 dark:text-gray-300" />; };

    return (<div className="space-y-6" onDragEnter={(e) => handleDragEvents(e, true)}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Zasoby "Pasieka Kusaja"</h2>
          <div className="flex items-center gap-2">
            <InputField placeholder="Nazwa nowej kategorii..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <button onClick={handleAddCategory} className="py-2 px-4 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg transition shrink-0">Dodaj</button>
            <button onClick={() => openForm()} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 shrink-0"><PlusCircle className="mr-2 h-4 w-4" /> Dodaj Link</button>
          </div>
        </div>
       
        {Object.entries(groupedResources).map(([category, items]) => (
            (category && items.length > 0) && <div key={category} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">{category}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 text-center">
                    {items.map(r => (<div key={r.id} className="relative group"><div onClick={() => r.type === 'Link' && r.url && window.open(r.url, '_blank')} className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition aspect-square justify-center">{renderIcon(r.icon)}<span className="mt-2 text-xs font-medium text-gray-800 dark:text-gray-200 break-words w-full text-center">{r.name}</span></div><div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"><button onClick={() => openForm(r)} className="p-1 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600"><Edit className="h-3 w-3" /></button><button onClick={() => handleDelete(r.id)} className="p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600"><Trash2 className="h-3 w-3" /></button></div></div>))}
                </div>
            </div>
        ))}
        {resources.length === 0 && <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><Folder className="h-16 w-16 mx-auto mb-4" /><h3 className="text-lg font-semibold">Brak zasobów</h3><p>Upuść pliki tutaj lub kliknij "Dodaj Link", aby zacząć.</p></div>}
        
        {isFormOpen && <ResourceForm resource={selectedResource} onSave={handleSave} onClose={closeForm} availableCategories={availableCategories} />}
        {isDraggingOver && (
            <div className="fixed inset-0 bg-blue-500/20 z-50 flex items-center justify-center pointer-events-none" onDragLeave={(e) => handleDragEvents(e, false)}>
                <div ref={dropZoneRef} onDrop={handleDrop} className="border-4 border-dashed border-white rounded-2xl p-20 text-center text-white">
                    <UploadCloud className="h-24 w-24 mx-auto" />
                    <h2 className="text-3xl font-bold mt-4">Upuść pliki, aby je dodać</h2>
                </div>
            </div>
        )}
    </div>);
};

const NotificationPanel = ({ orders, products, setActivePage, onClose }) => {
    const newOrders = orders.filter(o => o.fulfillmentStatus === 'Nowe');
    const lowStockProducts = products.filter(p => p.stock <= 10);
    const panelRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [onClose]);

    return (
        <div ref={panelRef} className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Powiadomienia</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {newOrders.length === 0 && lowStockProducts.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Brak nowych powiadomień.</p>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {newOrders.map(order => (
                            <li key={order.id} onClick={() => { setActivePage('Zamówienia'); onClose(); }} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">Nowe zamówienie: {order.id}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{order.customerName} - {order.total.toFixed(2)} zł</p>
                            </li>
                        ))}
                        {lowStockProducts.map(product => (
                            <li key={product.id} onClick={() => { setActivePage('Produkty'); onClose(); }} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                <p className="font-semibold text-sm text-red-600 dark:text-red-400">Niski stan magazynowy</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{product.name} - zostało {product.stock} szt.</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}


// --- MAIN APP COMPONENT ---
export default function App() {
    const [activePage, setActivePage] = useState('Panel Główny');
    const [theme, setTheme] = useState('light'); // Domyślny motyw ustawiony na jasny
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isNotificationsOpen, setNotificationsOpen] = useState(false);
    
    // State for all data
    const [orders, setOrders] = useState(initialOrders);
    const [products, setProducts] = useState(initialProducts);
    const [customers, setCustomers] = useState(initialCustomers);
    const [resources, setResources] = useState(initialResources);

    useEffect(() => { document.documentElement.className = theme; }, [theme]);
    
    const notificationCount = products.filter(p => p.stock <= 10).length + orders.filter(o => o.fulfillmentStatus === 'Nowe').length;
    
    const renderPage = () => {
        switch (activePage) {
            case 'Panel Główny': return <Dashboard orders={orders} customers={customers} products={products} theme={theme} setActivePage={setActivePage} />;
            case 'Zamówienia': return <Orders orders={orders} setOrders={setOrders} products={products} setCustomers={setCustomers} />;
            case 'Klienci': return <Customers customers={customers} orders={orders} />;
            case 'Produkty': return <Products products={products} setProducts={setProducts} />;
            case 'Pasieka Kusaja': return <Pasieka resources={resources} setResources={setResources} />;
            default: return <Dashboard orders={orders} customers={customers} products={products} theme={theme} setActivePage={setActivePage} />;
        }
    };
    const NavItem = ({ label, icon, isActive, onClick }) => (<li><a href="#" onClick={onClick} className={`flex items-center p-3 rounded-lg text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-200 dark:bg-gray-700 font-bold text-gray-900 dark:text-white' : ''}`}>{icon} <span className="ml-3">{label}</span></a></li>);
    const menuItems = [ { label: 'Panel Główny', icon: <BarChart2 className="w-5 h-5"/> }, { label: 'Zamówienia', icon: <ShoppingCart className="w-5 h-5"/> }, { label: 'Klienci', icon: <User className="w-5 h-5"/> }, { label: 'Produkty', icon: <Package className="w-5 h-5"/> }, { label: 'Pasieka Kusaja', icon: <Folder className="w-5 h-5"/> }, ];
    const sidebarContent = (<div className="flex flex-col h-full"><div className="text-gray-900 dark:text-white text-2xl font-bold p-3 mb-5 text-center">Panel Sprzedaży</div><nav className="flex-1"><ul>{menuItems.map(item => <NavItem key={item.label} {...item} isActive={activePage === item.label} onClick={() => {setActivePage(item.label); setSidebarOpen(false);}} />)}</ul></nav></div>);
    
    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans flex transition-colors duration-300">
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
            <aside className={`w-64 bg-white dark:bg-gray-800 flex-shrink-0 p-4 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex flex-col fixed md:relative h-full md:h-auto z-30 transition-transform duration-300 ease-in-out shadow-lg`}>{sidebarContent}</aside>
            <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center"><button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden mr-4 text-gray-600 dark:text-gray-300"><Menu className="h-6 w-6" /></button><h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{activePage}</h1></div>
                    <div className="flex items-center space-x-4 sm:space-x-6">
                        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">{theme === 'dark' ? <Sun className="h-6 w-6"/> : <Moon className="h-6 w-6"/>}</button>
                        <div className="relative">
                            <button onClick={() => setNotificationsOpen(o => !o)} className="relative text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
                                <Bell className="h-6 w-6"/>
                                {notificationCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-white dark:border-gray-900">{notificationCount}</span>}
                            </button>
                            {isNotificationsOpen && <NotificationPanel orders={orders} products={products} setActivePage={setActivePage} onClose={() => setNotificationsOpen(false)} />}
                        </div>
                        <div className="flex items-center"><div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-white">KK</div><div className="ml-3 hidden sm:block"><p className="font-semibold text-gray-900 dark:text-white">Kacper Kusaj</p><p className="text-sm text-gray-500 dark:text-gray-400">Admin</p></div></div>
                    </div>
                </header>
                {renderPage()}
            </main>
        </div>
    );
}