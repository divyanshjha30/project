import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  DollarSign, 
  Shield, 
  Activity,
  Search,
  Plus,
  Minus,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, ChipTransaction, AdminAudit } from '../types';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'audit'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<ChipTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAudit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'transactions', label: 'Chip Transactions', icon: DollarSign },
    { id: 'audit', label: 'Audit Logs', icon: Activity },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          await fetchUsers();
          break;
        case 'transactions':
          await fetchTransactions();
          break;
        case 'audit':
          await fetchAuditLogs();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    setUsers(data || []);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('chip_transactions')
      .select(`
        *,
        users!chip_transactions_user_id_fkey(username, display_name),
        performed_by_user:users!chip_transactions_performed_by_fkey(username, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    setTransactions(data || []);
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('admin_audit')
      .select(`
        *,
        admin_user:users!admin_audit_admin_id_fkey(username, display_name),
        target_user:users!admin_audit_target_user_id_fkey(username, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return;
    }

    setAuditLogs(data || []);
  };

  const handleAdjustChips = async () => {
    if (!selectedUser || adjustAmount === 0 || !adjustReason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Call edge function to adjust chips
      const { error } = await supabase.functions.invoke('adjust-chips', {
        body: {
          user_id: selectedUser.id,
          amount: adjustAmount,
          reason: adjustReason
        }
      });

      if (error) {
        console.error('Error adjusting chips:', error);
        toast.error('Failed to adjust chips');
        return;
      }

      toast.success(`Successfully ${adjustAmount > 0 ? 'added' : 'removed'} ${Math.abs(adjustAmount)} chips`);
      setShowAdjustModal(false);
      setSelectedUser(null);
      setAdjustAmount(0);
      setAdjustReason('');
      fetchUsers();
    } catch (error) {
      console.error('Error adjusting chips:', error);
      toast.error('Failed to adjust chips');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Shield className="h-8 w-8 text-purple-400" />
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-gray-400">Manage users, chips, and monitor activity</p>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-400' },
          { label: 'Active Games', value: '12', icon: Activity, color: 'text-green-400' },
          { label: 'Total Chips', value: users.reduce((sum, u) => sum + u.chip_balance, 0).toLocaleString(), icon: DollarSign, color: 'text-yellow-400' },
          { label: 'Admin Actions', value: auditLogs.length, icon: Shield, color: 'text-purple-400' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Icon className={`h-6 w-6 ${stat.color}`} />
                <span className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-gray-800 border border-gray-700 rounded-xl"
      >
        {/* Tab Headers */}
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 transition-colors"
                />
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">User</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Chips</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Games</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                              <span className="text-black font-bold text-sm">
                                {user.display_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{user.display_name}</p>
                              <p className="text-gray-400 text-sm">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin' ? 'bg-purple-600 text-white' :
                            user.role === 'mod' ? 'bg-blue-600 text-white' :
                            'bg-green-600 text-white'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-yellow-400 font-semibold">
                            {user.chip_balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="text-white">{user.total_games} total</div>
                            <div className="text-green-400">{user.games_won}W</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowAdjustModal(true);
                              }}
                              className="p-2 bg-yellow-600 text-black rounded-lg hover:bg-yellow-500 transition-colors"
                              title="Adjust chips"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                            <button
                              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Recent Chip Transactions</h3>
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">
                          {(transaction as any).users?.display_name || 'Unknown User'}
                        </p>
                        <p className="text-gray-400 text-sm">{transaction.reason}</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                        </span>
                        <p className="text-gray-400 text-xs">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Admin Action Logs</h3>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{log.action}</p>
                        <p className="text-gray-400 text-sm">
                          Admin: {(log as any).admin_user?.display_name || 'Unknown'}
                          {(log as any).target_user && ` → Target: ${(log as any).target_user.display_name}`}
                        </p>
                        {log.notes && (
                          <p className="text-gray-300 text-sm mt-1">{log.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {log.amount && (
                          <span className={`font-bold ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}
                          </span>
                        )}
                        <p className="text-gray-400 text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Chip Adjustment Modal */}
      {showAdjustModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              Adjust Chips for {selectedUser.display_name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (use negative to remove chips)
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Enter reason for adjustment"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleAdjustChips}
                  disabled={adjustAmount === 0 || !adjustReason.trim()}
                  className="flex-1 py-3 bg-yellow-600 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
                >
                  Apply Changes
                </button>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;