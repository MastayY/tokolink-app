// Debounced area autocomplete hook for Biteship area search
import { useState, useEffect, useRef } from "react";

export interface AreaOption {
  id: string;
  name: string;
  label: string; // formatted display label
}

export function useAreaSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AreaOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shipping/areas?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(
          (data.areas ?? []).map((a: any) => ({
            id: a.id,
            name: a.name,
            label: [
              a.name,
              a.administrative_division_level_3_name,
              a.administrative_division_level_2_name,
              a.administrative_division_level_1_name,
            ]
              .filter(Boolean)
              .join(", "),
          }))
        );
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);
  }, [query]);

  return { query, setQuery, results, isLoading };
}
