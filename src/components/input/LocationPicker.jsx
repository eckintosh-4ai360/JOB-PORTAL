import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Search, Map, X, Check, Loader2, ExternalLink } from "lucide-react";

export const LocationPicker = ({
  label = "Location",
  required = false,
  value = "",
  latitude = null,
  longitude = null,
  onChange,
  error = "",
  placeholder = "Search or select business location...",
}) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );

  const containerRef = useRef(null);

  // Sync internal state when parent value changes externally
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (latitude && longitude) {
      setSelectedCoords({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  // Handle outside click to close suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced address search using Nominatim (OpenStreetMap) / Google Places fallback
  useEffect(() => {
    if (!query || query.trim().length < 3 || !showDropdown) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );
        const data = await response.json();
        setSuggestions(data || []);
      } catch (err) {
        console.error("Location lookup error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, showDropdown]);

  // Select a suggestion
  const handleSelectSuggestion = (item) => {
    const formatted = item.display_name;
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setQuery(formatted);
    setSelectedCoords({ lat, lng });
    setShowDropdown(false);

    if (onChange) {
      onChange({
        location: formatted,
        latitude: lat,
        longitude: lng,
      });
    }
  };

  // Detect current location via browser Geolocation API
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setSelectedCoords({ lat, lng });

        try {
          // Reverse geocode to get human readable address
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          const addressName = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setQuery(addressName);
          if (onChange) {
            onChange({
              location: addressName,
              latitude: lat,
              longitude: lng,
            });
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setQuery(fallback);
          if (onChange) {
            onChange({ location: fallback, latitude: lat, longitude: lng });
          }
        } finally {
          setIsGeolocating(false);
        }
      },
      (err) => {
        console.error("Geolocation failed:", err);
        alert("Could not detect your current location. Please type it in manually.");
        setIsGeolocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Direct text change
  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    setShowDropdown(true);
    if (onChange) {
      onChange({
        location: text,
        latitude: selectedCoords?.lat || null,
        longitude: selectedCoords?.lng || null,
      });
    }
  };

  const googleMapsSearchUrl = query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : selectedCoords
    ? `https://www.google.com/maps/search/?api=1&query=${selectedCoords.lat},${selectedCoords.lng}`
    : "https://maps.google.com";

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
            <Map className="h-3 w-3" /> Powered by Google Locator
          </span>
        </div>
      )}

      {/* Main input container */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
          <MapPin className="h-4 w-4 text-indigo-500" />
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-24 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${
            error ? "border-red-400 focus:border-red-400" : ""
          }`}
        />

        {/* Action buttons inside input */}
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          {/* Detect location button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isGeolocating}
            title="Use current GPS location"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition active:scale-95 disabled:opacity-50"
          >
            {isGeolocating ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </button>

          {/* Open Google Map modal button */}
          <button
            type="button"
            onClick={() => setShowMapModal(true)}
            title="Open Interactive Google Map"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition active:scale-95"
          >
            <Map className="h-4 w-4" />
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl animate-in fade-in duration-150">
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs transition hover:bg-indigo-50/60"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span className="line-clamp-2 text-gray-700 font-medium">
                  {item.display_name}
                </span>
              </button>
            ))}
          </div>
        )}

        {isSearching && showDropdown && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-gray-100 bg-white p-3 shadow-xl flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Finding locations...</span>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Selected location coordinates badge */}
      {selectedCoords && (
        <div className="flex items-center justify-between text-[11px] text-gray-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
          <span className="flex items-center gap-1.5 font-medium">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Coords: {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
          </span>
          <a
            href={googleMapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
          >
            Google Maps <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Interactive Google Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <Map className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold">Google Location Preview</h3>
                  <p className="text-xs text-slate-300">
                    Exact location for candidate navigation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Map View */}
            <div className="relative h-80 w-full bg-slate-100">
              <iframe
                title="Google Maps Location"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={
                  selectedCoords
                    ? `https://maps.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}&z=15&output=embed`
                    : query
                    ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
                    : "https://maps.google.com/maps?q=Accra,Ghana&z=12&output=embed"
                }
              />
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-600 font-medium text-center sm:text-left">
                <p className="font-bold text-gray-900 line-clamp-1">{query || "No location selected"}</p>
                <p className="text-gray-400 mt-0.5">
                  Candidates will be able to navigate to this location on Google Maps.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <a
                  href={googleMapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Open in Google Maps <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white transition shadow-md shadow-indigo-100"
                >
                  Confirm Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
