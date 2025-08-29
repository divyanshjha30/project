import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Users, 
  Shield, 
  Zap, 
  Trophy, 
  PlayCircle,
  ArrowRight 
} from 'lucide-react';

const Landing: React.FC = () => {
  const features = [
    {
      icon: PlayCircle,
      title: 'Multiple Games',
      description: 'Play Texas Hold\'em Poker and Blackjack with friends'
    },
    {
      icon: Users,
      title: 'Real-time Multiplayer',
      description: 'Join live games with players from around the world'
    },
    {
      icon: Shield,
      title: 'Fair & Secure',
      description: 'Server-side game logic ensures fair play for everyone'
    },
    {
      icon: Zap,
      title: 'Instant Play',
      description: 'No downloads required - play directly in your browser'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="relative z-10 px-6 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-2 rounded-lg">
              <Crown className="h-8 w-8 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Royal Casino</h1>
              <p className="text-sm text-gray-400">Virtual Chips Only</p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Link
              to="/login"
              className="px-6 py-2 text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-yellow-600 text-black rounded-lg hover:bg-yellow-500 transition-colors font-semibold"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              The Ultimate
              <span className="text-gradient bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                {' '}Virtual Casino
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Experience the thrill of poker and blackjack with friends in real-time. 
              No real money involved - just pure entertainment and skill.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="group px-8 py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-bold text-lg hover:from-yellow-500 hover:to-yellow-400 transition-all duration-300 shadow-lg hover:shadow-yellow-500/25"
            >
              Start Playing Free
              <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-yellow-600 text-yellow-400 rounded-lg font-bold text-lg hover:bg-yellow-600 hover:text-black transition-all duration-300"
            >
              Sign In
            </Link>
          </motion.div>

          {/* Virtual chips disclaimer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 p-4 bg-gray-800 border border-yellow-600 rounded-lg max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <p className="text-yellow-400 font-semibold">
                100% Virtual Entertainment - No Real Money Gambling
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Royal Casino?</h2>
            <p className="text-gray-300 text-lg">
              Experience the most realistic virtual casino with friends
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-yellow-600 transition-colors duration-300"
                >
                  <div className="bg-yellow-600 p-3 rounded-lg w-fit mb-4">
                    <Icon className="h-6 w-6 text-black" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-gray-800 to-gray-700 border border-yellow-600 rounded-2xl p-12"
          >
            <Crown className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Play?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Join thousands of players in the most exciting virtual casino experience
            </p>
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-bold text-lg hover:from-yellow-500 hover:to-yellow-400 transition-all duration-300 shadow-lg"
            >
              Start Playing Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 px-6 py-8">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p className="text-sm">
            © 2025 Royal Casino. Virtual entertainment only - No real money gambling.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;