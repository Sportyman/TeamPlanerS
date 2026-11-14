import React, { useEffect, useState } from 'react';

interface WhatsAppAvatarProps {
  name: string;
  src?: string;
  sizeClass?: string;
}

const AVATAR_TONES = [
  'bg-sky-100 text-sky-800',
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800',
  'bg-indigo-100 text-indigo-800',
  'bg-emerald-100 text-emerald-800',
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
};

const getTone = (name: string): string => {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
};

export const WhatsAppAvatar: React.FC<WhatsAppAvatarProps> = ({
  name,
  src,
  sizeClass = 'w-9 h-9 text-xs',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} ${getTone(name)} rounded-full flex items-center justify-center font-bold border border-slate-200/70 shrink-0 select-none`}
    >
      {getInitials(name)}
    </div>
  );
};
