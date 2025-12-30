import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Task, Section } from "../../types";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import "./Home.css";

interface HomeProps {
  tasks: Task[];
  sections: Section[];
  onCompleteTask: (taskId: string) => void;
  onOpenJournal: () => void;
}

interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  };
  daily: Array<{
    dt: number;
    temp: {
      day: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  }>;
}

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  exercised: boolean;
  played_music: boolean;
  read: boolean;
}

interface AirQualityData {
  aqi: number;
  station: string;
  url: string;
  iaqi?: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    co?: number;
    so2?: number;
    o3?: number;
  };
}

interface AverageAirQuality {
  avgAqi: number;
  stations: AirQualityData[];
  pollutants: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    co?: number;
    so2?: number;
    o3?: number;
  };
}

export function Home({
  tasks,
  sections,
  onCompleteTask,
  onOpenJournal,
}: HomeProps) {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [journalContent, setJournalContent] = useState("");
  const [airQuality, setAirQuality] = useState<AverageAirQuality | null>(null);
  const [loadingAirQuality, setLoadingAirQuality] = useState(true);

  // Get "Must finish today" tasks
  const mustFinishSection = sections.find((s) =>
    s.name.toLowerCase().includes("must finish today"),
  );
  const mustFinishTasks = mustFinishSection
    ? tasks.filter((t) => t.section_id === mustFinishSection.id)
    : [];

  // Load weather from NWS API
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Get forecast data for specific point: -149.827, 61.201
        const pointResponse = await fetch(
          "https://api.weather.gov/points/61.201,-149.827",
        );

        if (pointResponse.ok) {
          const pointData = await pointResponse.json();
          const forecastUrl = pointData.properties.forecast;

          // Fetch forecast data
          const forecastResponse = await fetch(forecastUrl);
          if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json();

            // Convert NWS data to our format
            const periods = forecastData.properties.periods;
            const current = periods[0];
            const daily = periods
              .filter((_: any, i: number) => i % 2 === 0)
              .slice(0, 4);

            setWeather({
              current: {
                temp: current.temperature,
                feels_like: current.temperature,
                humidity: current.relativeHumidity?.value || 0,
                wind_speed: parseInt(current.windSpeed) || 0,
                weather: [
                  {
                    main: current.shortForecast.includes("Rain")
                      ? "Rain"
                      : current.shortForecast.includes("Snow")
                        ? "Snow"
                        : current.shortForecast.includes("Cloud")
                          ? "Clouds"
                          : "Clear",
                    description: current.shortForecast.toLowerCase(),
                    icon: "",
                  },
                ],
              },
              daily: daily.map((period: any) => ({
                dt: new Date(period.startTime).getTime() / 1000,
                temp: { day: period.temperature },
                weather: [
                  {
                    main: period.shortForecast.includes("Rain")
                      ? "Rain"
                      : period.shortForecast.includes("Snow")
                        ? "Snow"
                        : period.shortForecast.includes("Cloud")
                          ? "Clouds"
                          : "Clear",
                    description: period.shortForecast.toLowerCase(),
                    icon: "",
                  },
                ],
              })),
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchWeather();
  }, []);

  // Load air quality from multiple Anchorage stations
  useEffect(() => {
    const fetchAirQuality = async () => {
      try {
        const stations = [
          { name: "Garden", city: "anchorage/garden" },
          { name: "Laurel", city: "anchorage/laurel" },
        ];

        const API_TOKEN = import.meta.env.VITE_AQICN_API_KEY || "demo";

        const stationDataPromises = stations.map(async (station) => {
          try {
            const response = await fetch(
              `https://api.waqi.info/feed/usa/alaska/${station.city}/?token=${API_TOKEN}`,
            );
            if (response.ok) {
              const data = await response.json();
              if (data.status === "ok" && data.data) {
                // Extract pollutant values from iaqi
                const iaqi: AirQualityData["iaqi"] = {};
                if (data.data.iaqi) {
                  const pollutantKeys = [
                    "pm25",
                    "pm10",
                    "no2",
                    "co",
                    "so2",
                    "o3",
                  ] as const;
                  pollutantKeys.forEach((key) => {
                    const value = data.data.iaqi[key];
                    if (value && typeof value.v === "number") {
                      iaqi[key] = value.v;
                    }
                  });
                }

                return {
                  aqi: data.data.aqi,
                  station: station.name,
                  url: `https://aqicn.org/city/usa/alaska/${station.city}/`,
                  iaqi,
                } as AirQualityData;
              }
            }
          } catch (err) {
            console.error(`Failed to fetch ${station.name} data:`, err);
          }
          return null;
        });

        const results = await Promise.all(stationDataPromises);
        const validResults = results.filter(
          (r): r is AirQualityData => r !== null,
        );

        if (validResults.length > 0) {
          // Calculate averages
          const avgAqi = Math.round(
            validResults.reduce((sum, r) => sum + r.aqi, 0) /
              validResults.length,
          );

          // Average pollutants
          const pollutants: AverageAirQuality["pollutants"] = {};
          const pollutantKeys = [
            "pm25",
            "pm10",
            "no2",
            "co",
            "so2",
            "o3",
          ] as const;

          pollutantKeys.forEach((key) => {
            const values = validResults
              .map((r) => r.iaqi?.[key])
              .filter((v): v is number => v !== undefined && !isNaN(v));

            if (values.length > 0) {
              pollutants[key] = Math.round(
                values.reduce((sum, v) => sum + v, 0) / values.length,
              );
            }
          });

          setAirQuality({
            avgAqi,
            stations: validResults,
            pollutants,
          });
        }
      } catch (error) {
        console.error("Failed to fetch air quality:", error);
      } finally {
        setLoadingAirQuality(false);
      }
    };

    fetchAirQuality();
  }, []);

  // Load today's journal entry
  useEffect(() => {
    const loadTodayEntry = async () => {
      if (!user) return;

      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (data) {
        setTodayEntry(data);
        setJournalContent(data.content || "");
      }
    };

    loadTodayEntry();
  }, [user]);

  // Auto-save journal content
  useEffect(() => {
    if (!user || !journalContent) return;

    const timer = setTimeout(async () => {
      const today = format(new Date(), "yyyy-MM-dd");

      if (todayEntry) {
        await supabase
          .from("journal_entries")
          .update({ content: journalContent })
          .eq("id", todayEntry.id);
      } else {
        const { data } = await supabase
          .from("journal_entries")
          .insert([
            {
              date: today,
              content: journalContent,
              user_id: user.id,
            },
          ])
          .select()
          .single();

        if (data) {
          setTodayEntry(data);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [journalContent, user, todayEntry]);

  const getWeatherIcon = (weatherMain: string) => {
    switch (weatherMain.toLowerCase()) {
      case "clear":
        return <Sun size={24} />;
      case "clouds":
        return <Cloud size={24} />;
      case "rain":
      case "drizzle":
        return <CloudRain size={24} />;
      case "snow":
        return <CloudSnow size={24} />;
      default:
        return <Cloud size={24} />;
    }
  };

  const getAqiStatus = (aqi: number) => {
    if (aqi <= 50) return { label: "Good", color: "#10b981" };
    if (aqi <= 100) return { label: "Moderate", color: "#f59e0b" };
    if (aqi <= 150)
      return { label: "Unhealthy for Sensitive", color: "#ef4444" };
    if (aqi <= 200) return { label: "Unhealthy", color: "#dc2626" };
    if (aqi <= 300) return { label: "Very Unhealthy", color: "#9333ea" };
    return { label: "Hazardous", color: "#7f1d1d" };
  };

  const getPollutantName = (key: string) => {
    const names: Record<string, string> = {
      pm25: "PM2.5",
      pm10: "PM10",
      no2: "NO₂",
      co: "CO",
      so2: "SO₂",
      o3: "O₃",
    };
    return names[key] || key.toUpperCase();
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>
          Good{" "}
          {new Date().getHours() < 12
            ? "Morning"
            : new Date().getHours() < 18
              ? "Afternoon"
              : "Evening"}
        </h1>
        <p className="home-date">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="home-grid">
        {/* Must Finish Today */}
        <div className="home-card tasks-card">
          <h2 className="card-title">Must Finish Today</h2>
          {mustFinishTasks.length === 0 ? (
            <p className="empty-message">No tasks for today</p>
          ) : (
            <ul className="home-tasks-list">
              {mustFinishTasks.map((task) => (
                <li key={task.id} className="home-task-item">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onCompleteTask(task.id)}
                    className="task-checkbox"
                  />
                  <span className="task-name">{task.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Weather */}
        <div className="home-card weather-card">
          <h2 className="card-title">Weather - Anchorage</h2>
          {loadingWeather ? (
            <p className="empty-message">Loading weather...</p>
          ) : weather ? (
            <>
              <div className="current-weather">
                <div className="weather-icon-large">
                  {getWeatherIcon(weather.current.weather[0].main)}
                </div>
                <div className="weather-temp-large">
                  {Math.round(weather.current.temp)}°F
                </div>
                <div className="weather-desc">
                  {weather.current.weather[0].description}
                </div>
              </div>
              <div className="weather-details">
                <div className="weather-detail">
                  <Droplets size={16} />
                  <span>{weather.current.humidity}%</span>
                </div>
                <div className="weather-detail">
                  <Wind size={16} />
                  <span>{Math.round(weather.current.wind_speed)} mph</span>
                </div>
              </div>
              <div className="weather-forecast">
                {weather.daily.slice(1, 4).map((day, index) => (
                  <div key={index} className="forecast-day">
                    <div className="forecast-date">
                      {format(new Date(day.dt * 1000), "EEE")}
                    </div>
                    <div className="forecast-icon">
                      {getWeatherIcon(day.weather[0].main)}
                    </div>
                    <div className="forecast-temp">
                      {Math.round(day.temp.day)}°
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-message">Weather unavailable</p>
          )}
        </div>

        {/* Mini Journal */}
        <div className="home-card journal-card">
          <div className="card-header-with-action">
            <h2 className="card-title">Today's Journal</h2>
            <button className="journal-open-btn" onClick={onOpenJournal}>
              <span>Open Journal</span>
              <ChevronRight size={16} />
            </button>
          </div>
          <textarea
            className="mini-journal-input"
            value={journalContent}
            onChange={(e) => setJournalContent(e.target.value)}
            placeholder="What's on your mind today?"
            rows={6}
          />
        </div>

        {/* Air Quality */}
        <div className="home-card air-quality-card">
          <h2 className="card-title">Air Quality - Anchorage</h2>
          {loadingAirQuality ? (
            <p className="empty-message">Loading air quality...</p>
          ) : airQuality ? (
            <>
              <div className="aqi-main">
                <div className="aqi-icon">
                  <Activity size={32} />
                </div>
                <div
                  className="aqi-value"
                  style={{ color: getAqiStatus(airQuality.avgAqi).color }}
                >
                  {airQuality.avgAqi}
                </div>
                <div
                  className="aqi-status"
                  style={{ color: getAqiStatus(airQuality.avgAqi).color }}
                >
                  {getAqiStatus(airQuality.avgAqi).label}
                </div>
              </div>

              <div className="pollutants-grid">
                {Object.entries(airQuality.pollutants).map(([key, value]) => (
                  <div key={key} className="pollutant-item">
                    <span className="pollutant-name">
                      {getPollutantName(key)}
                    </span>
                    <span className="pollutant-value">{value}</span>
                  </div>
                ))}
              </div>

              <div className="air-quality-sources">
                <span className="sources-label">Sources:</span>
                {airQuality.stations.map((station, index) => (
                  <span key={station.station}>
                    <a
                      href={station.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {station.station}
                    </a>
                    {index < airQuality.stations.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-message">Air quality unavailable</p>
          )}
        </div>
      </div>
    </div>
  );
}
