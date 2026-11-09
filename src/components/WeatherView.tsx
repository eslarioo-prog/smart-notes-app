import React, { useEffect, useState } from 'react';
import { CloudSun, Droplets, LoaderCircle, MapPin, Search, Wind } from 'lucide-react';

type WeatherCodeInfo = {
  label: string;
  icon: string;
};

type ForecastDay = {
  date: string;
  label: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
};

type WeatherData = {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
  localTime: string;
  forecast: ForecastDay[];
};

const WEATHER_CODE_MAP: Record<number, WeatherCodeInfo> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mostly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  56: { label: 'Freezing drizzle', icon: '🌧️' },
  57: { label: 'Heavy freezing drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Heavy showers', icon: '🌧️' },
  82: { label: 'Violent showers', icon: '⛈️' },
  85: { label: 'Light snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Severe thunderstorm', icon: '⛈️' },
};

const formatDayLabel = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
};

const getWeatherMeta = (code: number): WeatherCodeInfo => WEATHER_CODE_MAP[code] ?? { label: 'Weather', icon: '🌤️' };

async function fetchWeatherForCity(cityName: string): Promise<WeatherData> {
  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
  );

  if (!geoResponse.ok) {
    throw new Error('Unable to find that city.');
  }

  const geoData = await geoResponse.json();
  const location = geoData.results?.[0];

  if (!location) {
    throw new Error('No matching city was found.');
  }

  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
  );

  if (!weatherResponse.ok) {
    throw new Error('Weather data could not be loaded.');
  }

  const weatherData = await weatherResponse.json();
  const current = weatherData.current;
  const details = getWeatherMeta(current.weather_code);

  const forecast = (weatherData.daily?.time ?? []).map((date: string, index: number) => {
    const code = weatherData.daily?.weather_code?.[index] ?? 0;
    const info = getWeatherMeta(code);

    return {
      date,
      label: formatDayLabel(date),
      tempMax: weatherData.daily?.temperature_2m_max?.[index] ?? 0,
      tempMin: weatherData.daily?.temperature_2m_min?.[index] ?? 0,
      condition: info.label,
      icon: info.icon,
    };
  });

  return {
    city: location.name,
    country: location.country ?? 'Unknown',
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    condition: details.label,
    icon: details.icon,
    localTime: new Date(current.time).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    forecast,
  };
}

export const WeatherView: React.FC = () => {
  const [city, setCity] = useState('Riyadh');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadWeather = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Please enter a city name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await fetchWeatherForCity(trimmed);
      setWeather(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load weather.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWeather('Riyadh');
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void loadWeather(city);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-5 shadow-lg shadow-slate-200/40 dark:shadow-black/10 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-500">Live Weather</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Weather Dashboard</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
            <Search className="ml-2 h-4 w-4 text-slate-500" />
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Search city"
              aria-label="Search city"
              className="w-full bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
            >
              Search
            </button>
          </form>
        </div>

        {loading && (
          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-10 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            <span>Loading weather data...</span>
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {!loading && weather && !error && (
          <div className="mt-8 space-y-6">
            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-[24px] bg-gradient-to-br from-sky-500 via-indigo-500 to-slate-900 p-6 text-white shadow-xl shadow-sky-500/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sky-100">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">{weather.city}, {weather.country}</span>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-sky-100">{weather.localTime}</p>
                  </div>
                  <div className="text-5xl">{weather.icon}</div>
                </div>

                <div className="mt-8 flex items-end gap-3">
                  <span className="text-6xl font-black leading-none">{Math.round(weather.temperature)}°</span>
                  <span className="pb-2 text-lg text-sky-100">C</span>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/15 pt-4">
                  <div>
                    <p className="text-sm text-sky-100">Condition</p>
                    <p className="text-lg font-semibold">{weather.condition}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-sky-100">Feels like</p>
                    <p className="text-lg font-semibold">{Math.round(weather.feelsLike)}°C</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/80">
                <div className="flex items-center gap-3">
                  <CloudSun className="h-5 w-5 text-amber-500" />
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">Weather details</p>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Droplets className="h-4 w-4 text-sky-500" />
                      <span>Humidity</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{weather.humidity}%</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Wind className="h-4 w-4 text-indigo-500" />
                      <span>Wind</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{weather.windSpeed} km/h</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/80">
              <div className="mb-4 flex items-center gap-2">
                <CloudSun className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">5-day forecast</h3>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                {weather.forecast.map((day) => (
                  <div key={day.date} className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900">
                    <div className="text-3xl">{day.icon}</div>
                    <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{day.label}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{day.condition}</p>
                    <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                      {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
