import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  Monitor,
  Volume2,
  Gamepad2,
  Save
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    notifications: {
      gameInvites: true,
      gameStarted: true,
      chipUpdates: true,
      achievements: true,
    },
    gameplay: {
      autoFold: false,
      fastAnimation: false,
      soundEnabled: true,
      confirmActions: true,
    },
    privacy: {
      showOnlineStatus: true,
      allowDirectInvites: true,
      hideFromLeaderboards: false,
    },
    display: {
      theme: 'dark',
      cardStyle: 'classic',
      tableTheme: 'green',
    }
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (section: keyof typeof settings, setting: string) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [setting]: !prev[section][setting as keyof typeof prev[typeof section]]
      }
    }));
    setHasChanges(true);
  };

  const handleSelectChange = (section: keyof typeof settings, setting: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [setting]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // In a real implementation, this would save settings to the database
    toast.success('Settings saved successfully!');
    setHasChanges(false);
  };

  const SettingSection: React.FC<{ 
    title: string; 
    icon: React.ComponentType<any>; 
    children: React.ReactNode;
    delay?: number;
  }> = ({ title, icon: Icon, children, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="bg-gray-800 border border-gray-700 rounded-xl p-6"
    >
      <div className="flex items-center space-x-3 mb-6">
        <Icon className="h-6 w-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      {children}
    </motion.div>
  );

  const ToggleSetting: React.FC<{ 
    label: string; 
    description?: string; 
    checked: boolean; 
    onChange: () => void;
  }> = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-white font-medium">{label}</p>
        {description && <p className="text-gray-400 text-sm">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-yellow-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const SelectSetting: React.FC<{ 
    label: string; 
    value: string; 
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }> = ({ label, value, options, onChange }) => (
    <div className="flex items-center justify-between py-3">
      <p className="text-white font-medium">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-yellow-500 transition-colors"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Customize your gaming experience</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save Changes</span>
          </button>
        )}
      </motion.div>

      {/* Notifications */}
      <SettingSection title="Notifications" icon={Bell} delay={0.1}>
        <div className="space-y-1">
          <ToggleSetting
            label="Game Invites"
            description="Get notified when friends invite you to games"
            checked={settings.notifications.gameInvites}
            onChange={() => handleToggle('notifications', 'gameInvites')}
          />
          <ToggleSetting
            label="Game Started"
            description="Notification when your game begins"
            checked={settings.notifications.gameStarted}
            onChange={() => handleToggle('notifications', 'gameStarted')}
          />
          <ToggleSetting
            label="Chip Updates"
            description="Get notified about chip balance changes"
            checked={settings.notifications.chipUpdates}
            onChange={() => handleToggle('notifications', 'chipUpdates')}
          />
          <ToggleSetting
            label="Achievements"
            description="Celebrate when you unlock new achievements"
            checked={settings.notifications.achievements}
            onChange={() => handleToggle('notifications', 'achievements')}
          />
        </div>
      </SettingSection>

      {/* Gameplay */}
      <SettingSection title="Gameplay" icon={Gamepad2} delay={0.2}>
        <div className="space-y-1">
          <ToggleSetting
            label="Auto-fold weak hands"
            description="Automatically fold when you have poor cards"
            checked={settings.gameplay.autoFold}
            onChange={() => handleToggle('gameplay', 'autoFold')}
          />
          <ToggleSetting
            label="Fast animations"
            description="Speed up card dealing and transitions"
            checked={settings.gameplay.fastAnimation}
            onChange={() => handleToggle('gameplay', 'fastAnimation')}
          />
          <ToggleSetting
            label="Sound effects"
            description="Play sounds for game events"
            checked={settings.gameplay.soundEnabled}
            onChange={() => handleToggle('gameplay', 'soundEnabled')}
          />
          <ToggleSetting
            label="Confirm actions"
            description="Ask for confirmation before major actions"
            checked={settings.gameplay.confirmActions}
            onChange={() => handleToggle('gameplay', 'confirmActions')}
          />
        </div>
      </SettingSection>

      {/* Privacy */}
      <SettingSection title="Privacy" icon={Shield} delay={0.3}>
        <div className="space-y-1">
          <ToggleSetting
            label="Show online status"
            description="Let others see when you're online"
            checked={settings.privacy.showOnlineStatus}
            onChange={() => handleToggle('privacy', 'showOnlineStatus')}
          />
          <ToggleSetting
            label="Allow direct invites"
            description="Let others invite you to private games"
            checked={settings.privacy.allowDirectInvites}
            onChange={() => handleToggle('privacy', 'allowDirectInvites')}
          />
          <ToggleSetting
            label="Hide from leaderboards"
            description="Don't show my stats on public leaderboards"
            checked={settings.privacy.hideFromLeaderboards}
            onChange={() => handleToggle('privacy', 'hideFromLeaderboards')}
          />
        </div>
      </SettingSection>

      {/* Display */}
      <SettingSection title="Display" icon={Monitor} delay={0.4}>
        <div className="space-y-1">
          <SelectSetting
            label="Theme"
            value={settings.display.theme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'auto', label: 'Auto' }
            ]}
            onChange={(value) => handleSelectChange('display', 'theme', value)}
          />
          <SelectSetting
            label="Card Style"
            value={settings.display.cardStyle}
            options={[
              { value: 'classic', label: 'Classic' },
              { value: 'modern', label: 'Modern' },
              { value: 'minimal', label: 'Minimal' }
            ]}
            onChange={(value) => handleSelectChange('display', 'cardStyle', value)}
          />
          <SelectSetting
            label="Table Theme"
            value={settings.display.tableTheme}
            options={[
              { value: 'green', label: 'Classic Green' },
              { value: 'blue', label: 'Royal Blue' },
              { value: 'red', label: 'Burgundy' }
            ]}
            onChange={(value) => handleSelectChange('display', 'tableTheme', value)}
          />
        </div>
      </SettingSection>

      {/* Account Security */}
      <SettingSection title="Account Security" icon={Shield} delay={0.5}>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
            <div>
              <p className="text-white font-medium">Password</p>
              <p className="text-gray-400 text-sm">Last changed: Never</p>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-black rounded-lg font-semibold hover:bg-yellow-500 transition-colors">
              Change
            </button>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
            <div>
              <p className="text-white font-medium">Email</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-500 transition-colors">
              Update
            </button>
          </div>
        </div>
      </SettingSection>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-gray-800 border-2 border-red-600 rounded-xl p-6"
      >
        <h2 className="text-xl font-bold text-red-400 mb-6">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-red-900/20 rounded-lg border border-red-600/30">
            <div>
              <p className="text-white font-medium">Delete Account</p>
              <p className="text-gray-400 text-sm">Permanently delete your account and all data</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;