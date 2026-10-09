import "@/App.css";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/lib/i18n";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Account from "@/pages/Account";
import OrderDetail from "@/pages/OrderDetail";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminPurchases from "@/pages/admin/AdminPurchases";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminContent from "@/pages/admin/AdminContent";
import AdminAccount from "@/pages/admin/AdminAccount";
import AnnouncementBar from "@/components/AnnouncementBar";
import { ContentProvider } from "@/context/ContentContext";

const StoreLayout = () => (
  <div className="flex min-h-screen flex-col">
    <AnnouncementBar />
    <Navbar />
    <main className="flex-1"><Outlet /></main>
    <Footer />
    <CartDrawer />
  </div>
);

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
      </Route>
      <Route path="/admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="purchases" element={<AdminPurchases />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="account" element={<AdminAccount />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <LangProvider>
        <AuthProvider>
          <CartProvider>
            <ContentProvider>
              <BrowserRouter>
                <AppRouter />
                <Toaster position="top-center" richColors />
              </BrowserRouter>
            </ContentProvider>
          </CartProvider>
        </AuthProvider>
      </LangProvider>
    </div>
  );
}
