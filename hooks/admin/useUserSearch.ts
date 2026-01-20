
import { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { Person } from '../../types';

export const useUserSearch = () => {
  const { people } = useAppStore();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) return [];

    // Search across all clubs known to the local state
    return people.filter(p => 
      p.name.toLowerCase().includes(trimmed) ||
      (p.phone && p.phone.includes(trimmed)) ||
      (p.id.includes(trimmed)) // Might be email-based ID in some cases
    ).reduce((acc: Person[], current) => {
      // Remove duplicates (same person in multiple clubs)
      const x = acc.find(item => item.id === current.id);
      if (!x) return acc.concat([current]);
      return acc;
    }, []);
  }, [people, query]);

  const isEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim());
  }, [query]);

  return {
    query,
    setQuery,
    results,
    isManualEmail: isEmail && results.length === 0,
    hasResults: results.length > 0
  };
};
