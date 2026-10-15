import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import ClientLayout from './components/ClientLayout.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Sales from './pages/Sales.jsx';
import Category from './pages/Category.jsx';
import Cart from './pages/Cart.jsx';
import Account from './pages/Account.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetails from './pages/OrderDetails.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import MyAccountLayout from './components/MyAccountLayout.jsx';
import RequireClient from './components/RequireClient.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminRoute from './admin/AdminRoute.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import AdminShell from './admin/AdminShell.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import AdminProducts from './admin/AdminProducts.jsx';
import AdminOrders from './admin/AdminOrders.jsx';
import AdminOrderDetails from './admin/AdminOrderDetails.jsx';
import AdminCustomers from './admin/AdminCustomers.jsx';
import AdminReviews from './admin/AdminReviews.jsx';
import AdminStatistics from './admin/AdminStatistics.jsx';

function LegacyOrderDetailsRedirect() {
    const { id } = useParams();
    return <Navigate to={`/account/orders/${id}`} replace />;
}

function App() {
    return (
        <Routes>
            <Route element={<ClientLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/category/:id" element={<Category />} />
                <Route path="/cart" element={<Cart />} />

                <Route path="/account" element={<MyAccountLayout />}>
                    <Route index element={<Account />} />
                    <Route element={<RequireClient />}>
                        <Route path="orders" element={<Orders />} />
                        <Route path="orders/:id" element={<OrderDetails />} />
                        <Route path="profile" element={<ProfileSettings />} />
                    </Route>
                </Route>

                <Route element={<RequireClient />}>
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-success/:id" element={<OrderSuccess />} />
                    <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
                    <Route path="/orders/:id" element={<LegacyOrderDetailsRedirect />} />
                </Route>

                <Route path="*" element={<main className="placeholder-page"><h1>Page Not Found</h1></main>} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
                <Route path="login" element={<AdminLogin />} />
                <Route element={<AdminRoute />}>
                    <Route element={<AdminShell />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="orders/:id" element={<AdminOrderDetails />} />
                        <Route path="customers" element={<AdminCustomers />} />
                        <Route path="reviews" element={<AdminReviews />} />
                        <Route path="statistics" element={<AdminStatistics />} />
                    </Route>
                </Route>
            </Route>
        </Routes>
    );
}

export default App;
