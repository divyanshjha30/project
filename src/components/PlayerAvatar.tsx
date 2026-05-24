import React from "react";
import { User } from "lucide-react";
import PlayerTooltip from "./PlayerTooltip";

interface PlayerAvatarProps {
  userId: string;
  avatarUrl?: string | null;
  displayName: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  userId,
  avatarUrl,
  displayName,
  size = "md",
  showTooltip = true,
  className = "",
}) => {
  const avatar = (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-gray-600 flex-shrink-0 ${className}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-bold">
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  if (!showTooltip) return avatar;

  return <PlayerTooltip userId={userId}>{avatar}</PlayerTooltip>;
};

export default PlayerAvatar;
