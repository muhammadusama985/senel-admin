import React from 'react';
import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme as useMuiTheme } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentsIcon from '@mui/icons-material/Payments';
import BarChartIcon from '@mui/icons-material/BarChart';
import CampaignIcon from '@mui/icons-material/Campaign';
import DiscountIcon from '@mui/icons-material/Discount';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SettingsIcon from '@mui/icons-material/Settings';
import RateReviewIcon from '@mui/icons-material/RateReview';
import GavelIcon from '@mui/icons-material/Gavel';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

interface MenuItem {
  text: string;
  textKey?: string;
  icon: React.ReactNode;
  path: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { text: 'Dashboard', textKey: 'nav.dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Vendors', textKey: 'nav.vendors', icon: <StoreIcon />, path: '/vendors' },
  {
    text: 'Products',
    textKey: 'nav.products',
    icon: <InventoryIcon />,
    path: '/products',
    children: [
      { text: 'All Products', textKey: 'nav.productsAll', icon: null, path: '/products' },
      { text: 'Create Product', textKey: 'nav.productsCreate', icon: null, path: '/products/create' },
      { text: 'Approvals', textKey: 'nav.productsApprovals', icon: null, path: '/products/approvals' },
      { text: 'Categories', textKey: 'nav.categories', icon: null, path: '/categories' },
      { text: 'Attributes', textKey: 'nav.attributes', icon: null, path: '/attributes' },
    ],
  },
  {
    text: 'Orders',
    textKey: 'nav.orders',
    icon: <ShoppingCartIcon />,
    path: '/orders',
    children: [
      { text: 'All Orders', textKey: 'nav.ordersAll', icon: null, path: '/orders' },
      { text: 'Pickup Queue', textKey: 'nav.ordersPickupQueue', icon: null, path: '/orders/pickup-queue' },
      { text: 'Vendor Orders', textKey: 'nav.ordersVendorOrders', icon: null, path: '/orders/vendor-orders' },
      { text: 'Admin Product Orders', textKey: 'nav.ordersAdminProducts', icon: null, path: '/orders/admin-product-orders' },
      { text: 'Handover', textKey: 'nav.ordersHandover', icon: null, path: '/handover' },
      { text: 'Bank Transfers', textKey: 'nav.ordersBankTransfers', icon: null, path: '/payments/bank-transfers' },
    ],
  },
  { text: 'Shipping', textKey: 'nav.shipping', icon: <LocalShippingIcon />, path: '/shipping' },
  { text: 'Payouts', textKey: 'nav.payouts', icon: <PaymentsIcon />, path: '/payouts' },
  { text: 'Coupons', textKey: 'nav.coupons', icon: <DiscountIcon />, path: '/coupons' },
  { text: 'Notifications', textKey: 'nav.notifications', icon: <NotificationsActiveIcon />, path: '/notifications' },
  { text: 'Reviews', textKey: 'nav.reviews', icon: <RateReviewIcon />, path: '/reviews' },
  { text: 'Support Tickets', icon: <MailOutlineIcon />, path: '/support/tickets' },
  { text: 'Disputes', textKey: 'nav.disputes', icon: <GavelIcon />, path: '/disputes' },
  { text: 'Email Templates', textKey: 'nav.emailTemplates', icon: <MailOutlineIcon />, path: '/settings/email-templates' },
  {
    text: 'CMS',
    textKey: 'nav.cms',
    icon: <CampaignIcon />,
    path: '/cms/announcements',
    children: [
      { text: 'Announcements', textKey: 'nav.announcements', icon: null, path: '/cms/announcements' },
      { text: 'Blog', textKey: 'nav.blog', icon: null, path: '/cms/blog' },
      { text: 'Banners', textKey: 'nav.banners', icon: null, path: '/cms/banners' },
      { text: 'Static Pages', textKey: 'nav.staticPages', icon: null, path: '/cms/pages' },
    ],
  },
  { text: 'Analytics', textKey: 'nav.analytics', icon: <BarChartIcon />, path: '/analytics' },
  {
    text: 'Settings',
    textKey: 'nav.settings',
    icon: <SettingsIcon />,
    path: '/settings/tax',
    children: [
      { text: 'Tax', textKey: 'nav.tax', icon: null, path: '/settings/tax' },
      { text: 'Email Templates', textKey: 'nav.emailTemplates', icon: null, path: '/settings/email-templates' },
      { text: 'Password Reset', textKey: 'nav.passwordReset', icon: null, path: '/settings/password-reset' },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const { t } = useTranslation();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({
    Products: true,
    Orders: true,
    CMS: true,
    Settings: true,
  });

  const drawerWidth = 260;
  const isLight = muiTheme.palette.mode === 'light';
  const selectedGradient = 'linear-gradient(90deg, #5B2EFF 0%, #8A2BE2 40%, #FF6A00 100%)';
  const drawerBg = isLight
    ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(244,247,251,0.98) 100%)'
    : 'linear-gradient(180deg, rgba(8,3,33,0.98) 0%, rgba(15,23,42,0.98) 100%)';

  const handleMenuClick = (item: MenuItem) => {
    if (item.children) {
      setOpenMenus((prev) => ({
        ...prev,
        [item.text]: !prev[item.text],
      }));
      return;
    }

    navigate(item.path, { replace: true });
    if (isMobile) {
      onClose();
    }
  };

  const getSelectedPath = (items: MenuItem[]): string => {
    const allPaths = items.flatMap((item) => [item.path, ...(item.children ? item.children.map((child) => child.path) : [])]);
    const exactMatch = allPaths.find((path) => location.pathname === path);
    if (exactMatch) return exactMatch;

    const partialMatches = allPaths
      .filter((path) => path !== '/' && location.pathname.startsWith(`${path}/`))
      .sort((a, b) => b.length - a.length);

    return partialMatches[0] || '/';
  };

  const selectedPath = getSelectedPath(menuItems);
  const isSelected = (item: MenuItem, level: number) => {
    if (item.path === selectedPath) {
      return true;
    }

    if (level === 0 && item.children) {
      return item.path === selectedPath;
    }

    return false;
  };

  const getLabel = (item: MenuItem) => item.textKey ? t(item.textKey) : item.text;

  const renderMenuItems = (items: MenuItem[], level = 0) =>
    items.map((item) => (
      <React.Fragment key={item.path}>
        <ListItem disablePadding sx={{ pl: level * 1.5 }}>
          <ListItemButton
            selected={isSelected(item, level)}
            onClick={() => handleMenuClick(item)}
            sx={{
              borderRadius: '0 18px 18px 0',
              mr: 1.5,
              color: muiTheme.palette.text.primary,
              '&:hover': {
                backgroundColor: alpha(muiTheme.palette.primary.main, isLight ? 0.08 : 0.16),
              },
              '&.Mui-selected': {
                background: selectedGradient,
                borderLeft: `4px solid #5B2EFF`,
                color: '#fff',
                '&:hover': {
                  background: selectedGradient,
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: isSelected(item, level) ? '#fff' : muiTheme.palette.text.primary,
                opacity: level > 0 ? 0.8 : 1,
              }}
            >
              {item.icon}
            </ListItemIcon>

            <ListItemText
              primary={getLabel(item)}
              primaryTypographyProps={{
                fontSize: level > 0 ? '0.92rem' : '0.98rem',
                fontWeight: level > 0 ? 500 : 600,
                color: isSelected(item, level) ? '#fff' : muiTheme.palette.text.primary,
              }}
            />

            {item.children && (
              <Box sx={{ color: isSelected(item, level) ? '#fff' : muiTheme.palette.text.secondary }}>
                {openMenus[item.text] ? <ExpandLess /> : <ExpandMore />}
              </Box>
            )}
          </ListItemButton>
        </ListItem>

        {item.children && (
          <Collapse in={openMenus[item.text]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {renderMenuItems(item.children, level + 1)}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    ));

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', py: 2 }}>
        <List sx={{ py: 0 }}>{renderMenuItems(menuItems)}</List>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            top: 64,
            height: 'calc(100% - 64px)',
            background: drawerBg,
            color: muiTheme.palette.text.primary,
            borderRight: `1px solid ${muiTheme.palette.divider}`,
          },
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            top: 64,
            height: 'calc(100% - 64px)',
            background: drawerBg,
            color: muiTheme.palette.text.primary,
            borderRight: `1px solid ${muiTheme.palette.divider}`,
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
