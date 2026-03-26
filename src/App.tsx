import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import VendorList from './pages/Vendors/VendorList';
import VendorDetail from './pages/Vendors/VendorDetail';
import Categories from './pages/Catalog/Categories';
import Attributes from './pages/Catalog/Attributes';
import ProductList from './pages/Products/ProductList';
import ProductCreate from './pages/Products/ProductCreate';
import ProductApprovals from './pages/Products/ProductApprovals';
import ProductDetail from './pages/Products/ProductDetail';
import ProductEdit from './pages/Products/ProductEdit';
import OrderList from './pages/Orders/OrderList';
import OrderDetail from './pages/Orders/OrderDetail';
import PickupQueue from './pages/Shipping/PickupQueue';
import VendorOrderList from './pages/Orders/VendorOrderList';
import AdminProductOrderList from './pages/Orders/AdminProductOrderList';
import ShippingDashboard from './pages/Shipping/ShippingDashboard';
import Handover from './pages/Shipping/Handover';
import PayoutList from './pages/Payouts/PayoutList';
import Coupons from './pages/Marketing/Coupons';
import Notifications from './pages/Marketing/Notifications';
import BankTransfers from './pages/Payments/BankTransfers';
import ReviewModeration from './pages/Reviews/ReviewModeration';
import Disputes from './pages/Support/Disputes';
import SupportTickets from './pages/Support/SupportTickets';
import Announcements from './pages/CMS/Announcements';
import BlogPosts from './pages/CMS/BlogPosts';
import Banners from './pages/CMS/Banners';
import StaticPages from './pages/CMS/StaticPages';
import SalesReport from './pages/Analytics/SalesReport';
import TaxSettings from './pages/Settings/TaxSettings';
import EmailTemplates from './pages/Settings/EmailTemplates';
import PasswordResetManagement from './pages/Settings/PasswordResetManagement';

const queryClient = new QueryClient();
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider>
          <CssBaseline />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

              <Route path="/vendors" element={<PrivateRoute><VendorList /></PrivateRoute>} />
              <Route path="/vendors/:id" element={<PrivateRoute><VendorDetail /></PrivateRoute>} />

              <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
              <Route path="/attributes" element={<PrivateRoute><Attributes /></PrivateRoute>} />

              <Route path="/products" element={<PrivateRoute><ProductList /></PrivateRoute>} />
              <Route path="/products/create" element={<PrivateRoute><ProductCreate /></PrivateRoute>} />
              <Route path="/products/approvals" element={<PrivateRoute><ProductApprovals /></PrivateRoute>} />
              <Route path="/products/:id" element={<PrivateRoute><ProductDetail /></PrivateRoute>} />
              <Route path="/products/edit/:id" element={<PrivateRoute><ProductEdit /></PrivateRoute>} />

              <Route path="/orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
              <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
              <Route path="/orders/pickup-queue" element={<PrivateRoute><PickupQueue /></PrivateRoute>} />
              <Route path="/orders/vendor-orders" element={<PrivateRoute><VendorOrderList /></PrivateRoute>} />
              <Route path="/orders/admin-product-orders" element={<PrivateRoute><AdminProductOrderList /></PrivateRoute>} />
              <Route path="/handover" element={<PrivateRoute><Handover /></PrivateRoute>} />
              <Route path="/payments/bank-transfers" element={<PrivateRoute><BankTransfers /></PrivateRoute>} />

              <Route path="/shipping" element={<PrivateRoute><ShippingDashboard /></PrivateRoute>} />
              <Route path="/payouts" element={<PrivateRoute><PayoutList /></PrivateRoute>} />
              <Route path="/coupons" element={<PrivateRoute><Coupons /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
              <Route path="/reviews" element={<PrivateRoute><ReviewModeration /></PrivateRoute>} />
              <Route path="/support/tickets" element={<PrivateRoute><SupportTickets /></PrivateRoute>} />
              <Route path="/disputes" element={<PrivateRoute><Disputes /></PrivateRoute>} />

              <Route path="/cms/announcements" element={<PrivateRoute><Announcements /></PrivateRoute>} />
              <Route path="/cms/blog" element={<PrivateRoute><BlogPosts /></PrivateRoute>} />
              <Route path="/cms/banners" element={<PrivateRoute><Banners /></PrivateRoute>} />
              <Route path="/cms/pages" element={<PrivateRoute><StaticPages /></PrivateRoute>} />

              <Route path="/analytics" element={<PrivateRoute><SalesReport /></PrivateRoute>} />

              <Route path="/settings/tax" element={<PrivateRoute><TaxSettings /></PrivateRoute>} />
              <Route path="/settings/email-templates" element={<PrivateRoute><EmailTemplates /></PrivateRoute>} />
              <Route path="/settings/password-reset" element={<PrivateRoute><PasswordResetManagement /></PrivateRoute>} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
}

export default App;
