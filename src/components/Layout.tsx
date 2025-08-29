import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  User, 
  Settings, 
  LogOut, 
  Shield,
  Coins,
  Crown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Add admin link for admins
  if (user?.role === 'admin') {
    navItems.splice(2, 0, { path: '/admin', icon: Shield, label: 'Admin' });
  }

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3">
              <motion.div
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-2 rounded-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Crown className="h-6 w-6 text-black" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-white">Royal Casino</h1>
                <p className="text-xs text-gray-400">Virtual Chips Only</p>
              </div>
            </Link>

            {/* User info and chip balance */}
            {user && (
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 bg-gray-700 px-4 py-2 rounded-lg">
                  <Coins className="h-5 w-5 text-yellow-400" />
                  <span className="text-white font-semibold">
                    {user.chip_balance.toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-sm">chips</span>
                </div>
                
                <div className="text-right">
                  <p className="text-white font-medium">{user.display_name}</p>
                  <p className="text-gray-400 text-sm">@{user.username}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-gray-800 border-r border-gray-700">
          <div className="p-6">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`
                        flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                        ${isActive 
                          ? 'bg-yellow-600 text-black font-semibold shadow-lg' 
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Sign out button */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200 w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Virtual chips disclaimer */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-yellow-400 text-xs font-semibold">
            🎯 Virtual chips only - No real money gambling
          </p>
        </div>
      </div>
    </div>
  );
};

export default Layout;