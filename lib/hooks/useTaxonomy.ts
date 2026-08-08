import { useState, useCallback } from 'react';
import { CountryModel, YearOptionModel } from '@/types/movie';

let cachedCountries: CountryModel[] | null = null;
let countriesPromise: Promise<CountryModel[]> | null = null;

let cachedYears: YearOptionModel[] | null = null;
let yearsPromise: Promise<YearOptionModel[]> | null = null;

export function fetchCountriesOnce(): Promise<CountryModel[]> {
  if (cachedCountries) return Promise.resolve(cachedCountries);
  if (countriesPromise) return countriesPromise;

  countriesPromise = fetch('/api/taxonomy/countries')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data: CountryModel[]) => {
      cachedCountries = data;
      return data;
    })
    .catch((err) => {
      console.error('[Taxonomy] Country fetch error:', err);
      countriesPromise = null;
      return [];
    });

  return countriesPromise;
}

export function fetchYearsOnce(): Promise<YearOptionModel[]> {
  if (cachedYears) return Promise.resolve(cachedYears);
  if (yearsPromise) return yearsPromise;

  yearsPromise = fetch('/api/taxonomy/years')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data: YearOptionModel[]) => {
      cachedYears = data;
      return data;
    })
    .catch((err) => {
      console.error('[Taxonomy] Year fetch error:', err);
      yearsPromise = null;
      return [];
    });

  return yearsPromise;
}

export function useTaxonomyCountries(initialCountries?: CountryModel[]) {
  const [countries, setCountries] = useState<CountryModel[]>(() => {
    if (initialCountries && initialCountries.length > 0) return initialCountries;
    return cachedCountries || [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadCountries = useCallback(async () => {
    if (countries.length > 0) return;
    setLoading(true);
    setError(false);
    try {
      const data = await fetchCountriesOnce();
      setCountries(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [countries.length]);

  return { countries, loading, error, loadCountries };
}

export function useTaxonomyYears(initialYears?: YearOptionModel[]) {
  const [years, setYears] = useState<YearOptionModel[]>(() => {
    if (initialYears && initialYears.length > 0) return initialYears;
    return cachedYears || [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadYears = useCallback(async () => {
    if (years.length > 0) return;
    setLoading(true);
    setError(false);
    try {
      const data = await fetchYearsOnce();
      setYears(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [years.length]);

  return { years, loading, error, loadYears };
}
