import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { CartProvider } from "./hooks/useCart";
import { FavoritesProvider } from "./hooks/useFavorites";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import CustomerLayout from "./components/layout/CustomerLayout";
import FarmerLayout from "./components/layout/FarmerLayout";
import AuthLayout from "./components/layout/AuthLayout";

import Home from "./pages/public/Home";
import Marketplace from "./pages/public/Marketplace";
import ProductDetail from "./pages/public/ProductDetail";
import FarmDiscovery from "./pages/public/FarmDiscovery";
import FarmDetail from "./pages/public/FarmDetail";
import FarmerProfilePublic from "./pages/public/FarmerProfile";

import Cart from "./pages/customer/Cart";
import Checkout from "./pages/customer/Checkout";
import Orders from "./pages/customer/Orders";
import OrderTracking from "./pages/customer/OrderTracking";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import Favorites from "./pages/customer/Favorites";
import CustomerProfile from "./pages/customer/CustomerProfile";

import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import FarmerProducts from "./pages/farmer/FarmerProducts";
import AddProduct from "./pages/farmer/AddProduct";
import FarmerInventory from "./pages/farmer/FarmerInventory";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import FarmerAnalytics from "./pages/farmer/FarmerAnalytics";
import FarmerAIInsights from "./pages/farmer/FarmerAIInsights";
import FarmerProfile from "./pages/farmer/FarmerProfile";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import { ForgotPassword, ResetPassword } from "./pages/auth/PasswordFlows";

import NotFound from "./pages/public/NotFound";

import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ToastProvider } from "./components/ui/Toast";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <ToastProvider>
              <BrowserRouter>
            <Routes>
              {/* Public & Guest accessible customer layout routes */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/farms" element={<FarmDiscovery />} />
                <Route path="/farms/:id" element={<FarmDetail />} />
                <Route path="/farmers/:id" element={<FarmerProfilePublic />} />
                <Route path="/cart" element={<Cart />} />

                {/* Protected Customer Routes */}
                <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orders/:id" element={<OrderTracking />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/customer/dashboard" element={<CustomerDashboard />} />
                  <Route path="/customer/orders" element={<Orders />} />
                  <Route path="/customer/profile" element={<CustomerProfile />} />
                </Route>
              </Route>

              {/* Protected Farmer Routes */}
              <Route element={<ProtectedRoute allowedRoles={["farmer"]} />}>
                <Route element={<FarmerLayout />}>
                  <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
                  <Route path="/farmer/products" element={<FarmerProducts />} />
                  <Route path="/farmer/products/new" element={<AddProduct />} />
                  <Route path="/farmer/products/:id/edit" element={<AddProduct />} />
                  <Route path="/farmer/inventory" element={<FarmerInventory />} />
                  <Route path="/farmer/orders" element={<FarmerOrders />} />
                  <Route path="/farmer/analytics" element={<FarmerAnalytics />} />
                  <Route path="/farmer/ai-insights" element={<FarmerAIInsights />} />
                  <Route path="/farmer/profile" element={<FarmerProfile />} />
                </Route>
              </Route>

              <Route element={<AuthLayout />}>
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </FavoritesProvider>
    </CartProvider>
  </AuthProvider>
</ErrorBoundary>
  );
}
