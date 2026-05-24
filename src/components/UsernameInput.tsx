import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Loader2, AtSign } from "lucide-react";
import { supabase } from "../lib/supabase";

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  currentUsername?: string; // skip availability check for user's own username
  className?: string;
  placeholder?: string;
}

const UsernameInput: React.FC<UsernameInputProps> = ({
  value,
  onChange,
  currentUsername,
  className = "",
  placeholder = "username",
}) => {
  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const generateSuggestions = (base: string): string[] => {
    const cleaned = base.replace(/[^a-z0-9_]/g, "").slice(0, 14);
    if (!cleaned) return [];
    const suffixes = [
      Math.floor(Math.random() * 99) + 1,
      Math.floor(Math.random() * 999) + 100,
      `_${Math.floor(Math.random() * 9) + 1}`,
      `${Math.floor(Math.random() * 9)}x`,
      `_pro`,
    ];
    return suffixes.map((s) => `${cleaned}${s}`).slice(0, 4);
  };

  const checkAvailability = useCallback(
    async (username: string) => {
      if (!username || username.length < 3) {
        setStatus(username.length > 0 ? "invalid" : "idle");
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (!/^[a-z0-9_]+$/.test(username)) {
        setStatus("invalid");
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // If same as current username, no need to check
      if (currentUsername && username === currentUsername) {
        setStatus("available");
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setStatus("checking");
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id")
          .eq("username", username)
          .maybeSingle();

        if (error) {
          setStatus("idle");
          return;
        }

        if (data) {
          setStatus("taken");
          const newSuggestions = generateSuggestions(username);
          setSuggestions(newSuggestions);
          setShowSuggestions(true);
        } else {
          setStatus("available");
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setStatus("idle");
      }
    },
    [currentUsername],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailability(value);
    }, 500); // debounce 500ms

    return () => clearTimeout(timer);
  }, [value, checkAvailability]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    onChange(sanitized);
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const borderColor =
    status === "available"
      ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
      : status === "taken"
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
        : status === "invalid"
          ? "border-orange-500 focus:border-orange-500 focus:ring-orange-500/20"
          : "border-gray-600 focus:border-yellow-500 focus:ring-yellow-500/20";

  return (
    <div className="relative">
      <div className="relative">
        <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={20}
          className={`w-full pl-10 pr-10 py-3 bg-gray-700 ${borderColor} border rounded-lg text-white placeholder-gray-400 focus:ring-2 transition-all duration-200 ${className}`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {status === "checking" && (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          )}
          {status === "available" && (
            <CheckCircle className="h-5 w-5 text-green-400" />
          )}
          {status === "taken" && <XCircle className="h-5 w-5 text-red-400" />}
          {status === "invalid" && (
            <XCircle className="h-5 w-5 text-orange-400" />
          )}
        </div>
      </div>

      {/* Status message */}
      {status === "available" && value.length >= 3 && (
        <p className="text-green-400 text-xs mt-1.5 flex items-center">
          <CheckCircle className="h-3 w-3 mr-1" /> Username is available
        </p>
      )}
      {status === "taken" && (
        <p className="text-red-400 text-xs mt-1.5 flex items-center">
          <XCircle className="h-3 w-3 mr-1" /> Username is already taken
        </p>
      )}
      {status === "invalid" && value.length > 0 && (
        <p className="text-orange-400 text-xs mt-1.5">
          {value.length < 3
            ? "Username must be at least 3 characters"
            : "Only lowercase letters, numbers, and underscores"}
        </p>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-2 bg-gray-700 border border-gray-600 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-2">Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="px-2.5 py-1 text-xs bg-gray-600 hover:bg-yellow-600 text-gray-200 hover:text-white rounded-md transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsernameInput;
