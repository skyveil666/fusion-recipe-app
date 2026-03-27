import { BookOpen, Heart, Home, Settings } from 'lucide-react';

const tabs = [
  { id: 'fusion',     label: 'レシピ',    Icon: BookOpen },
  { id: 'favorites',  label: 'お気に入り', Icon: Heart },
  { id: 'home',       label: 'ホーム',    Icon: Home },
  { id: 'settings',   label: '設定',      Icon: Settings },
];

export default function BottomNav({ current, onNavigate }) {
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-cream-border flex items-center"
      style={{ zIndex: 50 }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const active = current === id || (id === 'fusion' && current === 'scanResult') || (id === 'fusion' && current === 'scan') || (id === 'fusion' && current === 'result');
        const isHome = id === 'home';
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
          >
            <Icon
              size={20}
              className={active ? 'text-brand' : 'text-gray-400'}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span
              className={`text-xs font-medium ${active ? 'text-brand' : 'text-gray-400'}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
