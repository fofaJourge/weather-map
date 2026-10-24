
"use strict";

// ======================================================
// WeatherMap
// Map: Leaflet + OpenStreetMap tiles
// Geocoding: OpenStreetMap Nominatim
// Weather: OpenWeatherMap
// Features: Favorites, 5-day forecast, Share Weather
// ======================================================

// Add your NEW OpenWeatherMap API key here.
// Do not publish or commit your API key to GitHub.

const OPENWEATHER_API_KEY = "PASTE_YOUR_NEW_API_KEY_HERE";

const FAVORITES_STORAGE_KEY = "weathermap-favorites-v1";

// HTML elements
const form = document.getElementById("weather-form");
const locationInput = document.getElementById("location-input");
const weatherButton = document.getElementById("weather-button");
const loadingState = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const successMessage = document.getElementById("success-message");

const favoriteButton = document.getElementById("favorite-button");
const shareButton = document.getElementById("share-weather-button");
const favoritesList = document.getElementById("favorites-list");
const favoritesEmpty = document.getElementById("favorites-empty");

const forecastStatus = document.getElementById("forecast-status");
const forecastContainer = document.getElementById("forecast-container");

// Share modal elements
const shareModal = document.getElementById("share-modal");
const closeShareButton = document.getElementById("close-share");
const shareCopyButton = document.getElementById("share-copy");
const shareWhatsAppButton = document.getElementById("share-whatsapp");
const shareXButton = document.getElementById("share-x");

// Application state
let currentMarker = null;
let activeRequest = null;
let currentLocation = null;
let currentWeather = null;
let favorites = loadFavorites();

// ======================================================
// MAP INITIALIZATION
// ======================================================

const map = L.map("map").setView([15.5007, 32.5599], 6);

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">' +
            "OpenStreetMap</a> contributors"
    }
).addTo(map);

// ======================================================
// SAFE HTML HANDLING
// ======================================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// ======================================================
// STATUS MESSAGES AND LOADING
// ======================================================

function setLoading(isLoading) {
    loadingState.hidden = !isLoading;
    weatherButton.disabled = isLoading;
    locationInput.disabled = isLoading;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    successMessage.hidden = true;
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.hidden = false;
    errorMessage.hidden = true;
}

function clearMessages() {
    errorMessage.hidden = true;
    successMessage.hidden = true;
}

function clearForecast(
    message = "Search for a location to see its forecast."
) {
    forecastStatus.textContent = message;
    forecastStatus.hidden = false;
    forecastContainer.replaceChildren();
}

function resetCurrentWeather() {
    currentLocation = null;
    currentWeather = null;

    favoriteButton.disabled = true;
    shareButton.disabled = true;

    updateFavoriteButton();

    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }

    clearForecast();
}

// ======================================================
// LOCATION SEARCH: NOMINATIM
// ======================================================

async function geocodeLocation(location, signal) {
    const parameters = new URLSearchParams({
        q: location,
        format: "jsonv2",
        limit: "1",
        "accept-language": "en"
    });

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${parameters}`,
        {
            signal,
            headers: {
                Accept: "application/json"
            }
        }
    );

    if (!response.ok) {
        throw new Error(
            "The location search service is unavailable. Please try again."
        );
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
        throw new Error(
            "Location not found. Check the spelling and try another place."
        );
    }

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    const name = results[0].display_name;

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        typeof name !== "string"
    ) {
        throw new Error(
            "The location service returned invalid data. Please try again."
        );
    }

    return {
        name,
        latitude,
        longitude
    };
}

// ======================================================
// MAP MARKER AND WEATHER POPUP
// ======================================================

function showLocationOnMap(location) {
    const coordinates = [
        location.latitude,
        location.longitude
    ];

    map.setView(coordinates, 12);

    if (currentMarker) {
        map.removeLayer(currentMarker);
    }

    currentMarker = L.marker(coordinates).addTo(map);

    currentMarker.bindPopup(
        `<strong>${escapeHTML(location.name)}</strong><br>` +
        "Loading current weather..."
    ).openPopup();
}

function showWeatherPopup(location, weather) {
    if (!currentMarker) {
        return;
    }

    const description =
        weather.weather?.[0]?.description ||
        "Weather description unavailable";

    const temperature = weather.main?.temp;
    const feelsLike = weather.main?.feels_like;
    const humidity = weather.main?.humidity;
    const windSpeed = weather.wind?.speed;
    const iconCode = weather.weather?.[0]?.icon;

    const iconURL = iconCode
        ? `https://openweathermap.org/img/wn/${encodeURIComponent(iconCode)}@2x.png`
        : "";

    const temperatureText = Number.isFinite(temperature)
        ? `${Math.round(temperature)} °C`
        : "Unavailable";

    const feelsLikeText = Number.isFinite(feelsLike)
        ? `${Math.round(feelsLike)} °C`
        : "Unavailable";

    const humidityText = Number.isFinite(humidity)
        ? `${Math.round(humidity)}%`
        : "Unavailable";

    const windText = Number.isFinite(windSpeed)
        ? `${windSpeed} m/s`
        : "Unavailable";

    const iconHTML = iconURL
        ? `<img src="${iconURL}" alt="" width="50" height="50">`
        : "";

    const popupHTML = `
        <div class="weather-popup">
            <strong>${escapeHTML(location.name)}</strong>
            <div>${iconHTML}</div>
            <h3>${escapeHTML(temperatureText)}</h3>
            <p>${escapeHTML(description)}</p>
            <p>Feels like: ${escapeHTML(feelsLikeText)}</p>
            <p>Humidity: ${escapeHTML(humidityText)}</p>
            <p>Wind speed: ${escapeHTML(windText)}</p>
            <small>Source: OpenWeatherMap</small>
        </div>
    `;

    currentMarker.setPopupContent(popupHTML).openPopup();
}

// ======================================================
// OPENWEATHERMAP API
// ======================================================

function ensureApiKey() {
    if (
        !OPENWEATHER_API_KEY ||
        OPENWEATHER_API_KEY === "PASTE_YOUR_NEW_API_KEY_HERE"
    ) {
        throw new Error(
            "Weather is not configured. Add your OpenWeatherMap API key " +
            "in js/app.js."
        );
    }
}

async function fetchWeatherEndpoint(endpoint, location, signal) {
    ensureApiKey();

    const parameters = new URLSearchParams({
        lat: String(location.latitude),
        lon: String(location.longitude),
        appid: OPENWEATHER_API_KEY,
        units: "metric"
    });

    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/${endpoint}?${parameters}`,
        { signal }
    );

    if (response.status === 401) {
        throw new Error(
            "The weather API key is invalid or not active yet. Check your key."
        );
    }

    if (response.status === 429) {
        throw new Error(
            "The weather service rate limit was reached. Please try again later."
        );
    }

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));

    console.error("OpenWeatherMap API error:", response.status, details);

    throw new Error(
        `Weather API error ${response.status}: ${
            details.message || "Request failed"
        }`
    );
}

    return response.json();
}

async function getCurrentWeather(location, signal) {
    return fetchWeatherEndpoint("weather", location, signal);
}

async function getFiveDayForecast(location, signal) {
    return fetchWeatherEndpoint("forecast", location, signal);
}

function isNetworkError(error) {
    return error instanceof TypeError;
}

function friendlyErrorMessage(error, fallback) {
    if (error && error.name === "AbortError") {
        return "";
    }

    if (isNetworkError(error)) {
        return (
            "We couldn't connect to the location or weather service. " +
            "Please check your internet connection and try again."
        );
    }

    return error?.message || fallback;
}

// ======================================================
// FAVORITES: LOCAL STORAGE
// ======================================================

function loadFavorites() {
    try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);

        if (!stored) {
            return [];
        }

        const parsed = JSON.parse(stored);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(item =>
            item &&
            typeof item.name === "string" &&
            typeof item.query === "string" &&
            Number.isFinite(Number(item.latitude)) &&
            Number.isFinite(Number(item.longitude))
        ).map(item => ({
            name: item.name,
            query: item.query,
            latitude: Number(item.latitude),
            longitude: Number(item.longitude)
        }));
    } catch (error) {
        console.warn("Could not load saved favorites.", error);
        return [];
    }
}

function persistFavorites() {
    try {
        localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify(favorites)
        );

        return true;
    } catch (error) {
        showError(
            "Your browser could not save favorites. Check browser storage settings."
        );

        return false;
    }
}

function getFavoriteIndex(location) {
    if (!location) {
        return -1;
    }

    return favorites.findIndex(item =>
        item.latitude.toFixed(3) === location.latitude.toFixed(3) &&
        item.longitude.toFixed(3) === location.longitude.toFixed(3)
    );
}

function updateFavoriteButton() {
    const isSaved = getFavoriteIndex(currentLocation) !== -1;

    favoriteButton.textContent = isSaved
        ? "★ Remove from Favorites"
        : "☆ Save to Favorites";

    favoriteButton.setAttribute(
        "aria-pressed",
        String(isSaved)
    );
}

function renderFavorites() {
    favoritesList.replaceChildren();
    favoritesEmpty.hidden = favorites.length > 0;

    if (favorites.length === 0) {
        favoritesEmpty.textContent =
            "Your saved locations will appear here.";
    }

    favorites.forEach((favorite, index) => {
        const item = document.createElement("li");
        item.className = "favorite-item";

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "favorite-open";
        openButton.textContent = `☆ ${favorite.name}`;
        openButton.setAttribute(
            "aria-label",
            `Get weather for ${favorite.name}`
        );

        openButton.addEventListener("click", () => {
            locationInput.value = favorite.query;
            form.requestSubmit();
        });

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "favorite-remove";
        removeButton.textContent = "×";
        removeButton.setAttribute(
            "aria-label",
            `Remove ${favorite.name} from favorites`
        );
        removeButton.title = "Remove favorite";

        removeButton.addEventListener("click", () => {
            removeFavorite(index);
        });

        item.append(openButton, removeButton);
        favoritesList.appendChild(item);
    });

    updateFavoriteButton();
}

function toggleFavorite() {
    if (!currentLocation || !currentWeather) {
        showError("Search for a location before saving a favorite.");
        return;
    }

    const existingIndex = getFavoriteIndex(currentLocation);

    if (existingIndex !== -1) {
        const removedFavorite = favorites[existingIndex];

        favorites.splice(existingIndex, 1);

        if (!persistFavorites()) {
            favorites.splice(existingIndex, 0, removedFavorite);
            renderFavorites();
            return;
        }

        renderFavorites();
        showSuccess(`${removedFavorite.name} removed from favorites.`);
        return;
    }

    const favorite = {
        name: currentLocation.name,
        query: currentLocation.query,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
    };

    favorites.push(favorite);

    if (!persistFavorites()) {
        favorites.pop();
        renderFavorites();
        return;
    }

    renderFavorites();
    showSuccess(`${favorite.name} saved to favorites.`);
}

function removeFavorite(index) {
    if (index < 0 || index >= favorites.length) {
        return;
    }

    const removedFavorite = favorites[index];

    favorites.splice(index, 1);

    if (!persistFavorites()) {
        favorites.splice(index, 0, removedFavorite);
        renderFavorites();
        return;
    }

    renderFavorites();
    showSuccess(`${removedFavorite.name} removed from favorites.`);
}

favoriteButton.addEventListener("click", toggleFavorite);

// ======================================================
// FIVE-DAY FORECAST
// ======================================================

function formatForecastDate(dateString) {
    const date = new Date(`${dateString}T12:00:00Z`);

    return new Intl.DateTimeFormat("en", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
    }).format(date);
}

function renderForecast(data) {
    const entries = Array.isArray(data.list) ? data.list : [];

    if (entries.length === 0) {
        clearForecast("No forecast data is available for this location.");
        return;
    }

    const timezoneOffset = Number(data.city?.timezone || 0);
    const dailyGroups = new Map();

    entries.forEach(entry => {
        if (
            !Number.isFinite(entry.dt) ||
            !entry.main ||
            !Array.isArray(entry.weather)
        ) {
            return;
        }

        const localDateTime = new Date(
            (entry.dt + timezoneOffset) * 1000
        );

        const dateKey = localDateTime.toISOString().slice(0, 10);
        const localHour = localDateTime.getUTCHours();

        if (!dailyGroups.has(dateKey)) {
            dailyGroups.set(dateKey, {
                date: dateKey,
                entries: []
            });
        }

        dailyGroups.get(dateKey).entries.push({
            ...entry,
            localHour
        });
    });

    const days = Array.from(dailyGroups.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);

    if (days.length === 0) {
        clearForecast("No usable forecast data was returned.");
        return;
    }

    forecastContainer.replaceChildren();

    days.forEach(day => {
        const validEntries = day.entries.filter(entry =>
            Number.isFinite(entry.main.temp_min) &&
            Number.isFinite(entry.main.temp_max)
        );

        if (validEntries.length === 0) {
            return;
        }

        const minTemperature = Math.min(
            ...validEntries.map(entry => entry.main.temp_min)
        );

        const maxTemperature = Math.max(
            ...validEntries.map(entry => entry.main.temp_max)
        );

        const representative = [...day.entries].sort((a, b) =>
            Math.abs(a.localHour - 12) - Math.abs(b.localHour - 12)
        )[0];

        const weatherDetails = representative.weather[0] || {};
        const description =
            weatherDetails.description || "Conditions unavailable";

        const iconCode = weatherDetails.icon;

        const iconURL = iconCode
            ? `https://openweathermap.org/img/wn/${encodeURIComponent(iconCode)}@2x.png`
            : "";

        const card = document.createElement("article");
        card.className = "forecast-card";

        const dayTitle = document.createElement("p");
        dayTitle.className = "forecast-day";
        dayTitle.textContent = formatForecastDate(day.date);
        card.appendChild(dayTitle);

        if (iconURL) {
            const icon = document.createElement("img");
            icon.className = "forecast-icon";
            icon.src = iconURL;
            icon.alt = description;
            icon.width = 58;
            icon.height = 58;
            icon.loading = "lazy";
            card.appendChild(icon);
        }

        const descriptionElement = document.createElement("p");
        descriptionElement.className = "forecast-description";
        descriptionElement.textContent = description;
        card.appendChild(descriptionElement);

        const temperatures = document.createElement("div");
        temperatures.className = "forecast-temperatures";

        const high = document.createElement("span");
        high.className = "forecast-high";
        high.textContent = `${Math.round(maxTemperature)}°`;

        const low = document.createElement("span");
        low.className = "forecast-low";
        low.textContent = `${Math.round(minTemperature)}°`;

        temperatures.append(high, low);
        card.appendChild(temperatures);

        forecastContainer.appendChild(card);
    });

    if (!forecastContainer.children.length) {
        clearForecast("No usable daily forecast data is available.");
        return;
    }

    forecastStatus.textContent =
        "Daily forecasts based on OpenWeatherMap's 3-hour forecast data.";
    forecastStatus.hidden = false;
}

async function loadForecast(location, signal, requestController) {
    forecastStatus.textContent = "Loading the five-day forecast...";
    forecastStatus.hidden = false;
    forecastContainer.replaceChildren();

    try {
        const forecast = await getFiveDayForecast(location, signal);

        if (activeRequest !== requestController) {
            return;
        }

        renderForecast(forecast);
    } catch (error) {
        if (
            error.name === "AbortError" ||
            activeRequest !== requestController
        ) {
            return;
        }

        clearForecast(
            "Current weather loaded, but the forecast is unavailable: " +
            friendlyErrorMessage(error, "Please try again later.")
        );
    }
}

// ======================================================
// SHARE WEATHER
// ======================================================

function buildWeatherShareText() {
    const description =
        currentWeather.weather?.[0]?.description ||
        "Conditions unavailable";

    const temperature = currentWeather.main?.temp;
    const feelsLike = currentWeather.main?.feels_like;
    const humidity = currentWeather.main?.humidity;
    const windSpeed = currentWeather.wind?.speed;

    return [
        `WeatherMap — ${currentLocation.name}`,
        `Current conditions: ${description}`,
        `Temperature: ${
            Number.isFinite(temperature)
                ? `${Math.round(temperature)} °C`
                : "Unavailable"
        }`,
        `Feels like: ${
            Number.isFinite(feelsLike)
                ? `${Math.round(feelsLike)} °C`
                : "Unavailable"
        }`,
        `Humidity: ${
            Number.isFinite(humidity)
                ? `${Math.round(humidity)}%`
                : "Unavailable"
        }`,
        `Wind speed: ${
            Number.isFinite(windSpeed)
                ? `${windSpeed} m/s`
                : "Unavailable"
        }`,
        "Weather data: OpenWeatherMap"
    ].join("\n");
}

async function copyShareText(text) {
    if (!navigator.clipboard?.writeText) {
        throw new Error(
            "Clipboard access is unavailable. Use a secure browser context."
        );
    }

    await navigator.clipboard.writeText(text);
}

function openShareMenu() {
    if (!currentLocation || !currentWeather) {
        showError("Search for a location before sharing its weather.");
        return;
    }

    // Use the native sharing menu when supported.
    if (typeof navigator.share === "function") {
        shareWeatherNative();
        return;
    }

    // Otherwise, open the sharing options.
    shareModal.hidden = false;
}

async function shareWeatherNative() {
    const text = buildWeatherShareText();

    try {
        await navigator.share({
            title: `WeatherMap — ${currentLocation.name}`,
            text
        });

        showSuccess("Weather shared successfully.");
    } catch (error) {
        // A cancelled share is not a successful share.
        if (error.name === "AbortError") {
            return;
        }

        console.error("Native sharing failed:", error);
        shareModal.hidden = false;
    }
}

async function copyWeatherDetails() {
    try {
        await copyShareText(buildWeatherShareText());

        shareModal.hidden = true;
        showSuccess("Weather details copied to your clipboard.");
    } catch (error) {
        showError(
            "Unable to copy the weather details. Check clipboard permissions."
        );
    }
}

function shareToWhatsApp() {
    const text = encodeURIComponent(buildWeatherShareText());

    window.open(
        `https://wa.me/?text=${text}`,
        "_blank",
        "noopener,noreferrer"
    );

    shareModal.hidden = true;
}

function shareToX() {
    const url = new URL("https://twitter.com/intent/tweet");

    url.searchParams.set("text", buildWeatherShareText());

    window.open(
        url.href,
        "_blank",
        "noopener,noreferrer"
    );

    shareModal.hidden = true;
}

// Share button listeners — use the HTML IDs consistently.
shareButton.addEventListener("click", openShareMenu);

closeShareButton.addEventListener("click", () => {
    shareModal.hidden = true;
});

shareModal.addEventListener("click", event => {
    if (event.target === shareModal) {
        shareModal.hidden = true;
    }
});

shareCopyButton.addEventListener("click", copyWeatherDetails);
shareWhatsAppButton.addEventListener("click", shareToWhatsApp);
shareXButton.addEventListener("click", shareToX);

// ======================================================
// MAIN SEARCH FLOW
// ======================================================

form.addEventListener("submit", async event => {
    event.preventDefault();

    const locationName = locationInput.value.trim();

    if (!locationName) {
        showError("Please enter a city or location.");
        locationInput.focus();
        return;
    }

    if (locationName.length > 150) {
        showError("Please enter a shorter location name.");
        return;
    }

    // Cancel an earlier search if it is still running.
    if (activeRequest) {
        activeRequest.abort();
    }

    const controller = new AbortController();
    activeRequest = controller;

    clearMessages();
    resetCurrentWeather();
    setLoading(true);

    let location = null;

    try {
        location = await geocodeLocation(
            locationName,
            controller.signal
        );

        if (activeRequest !== controller) {
            return;
        }

        showLocationOnMap(location);

        const weather = await getCurrentWeather(
            location,
            controller.signal
        );

        if (activeRequest !== controller) {
            return;
        }

        currentLocation = {
            ...location,
            query: locationName
        };

        currentWeather = weather;

        showWeatherPopup(location, weather);

        favoriteButton.disabled = false;
        shareButton.disabled = false;

        updateFavoriteButton();

        showSuccess(`Current weather loaded for ${location.name}.`);

        // Enable controls without waiting for the forecast.
        setLoading(false);

        // Forecast errors should not erase the current weather.
        await loadForecast(
            location,
            controller.signal,
            controller
        );
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        if (activeRequest === controller) {
            // Keep the marker if geocoding succeeded but weather failed.
            currentLocation = null;
            currentWeather = null;

            favoriteButton.disabled = true;
            shareButton.disabled = true;

            updateFavoriteButton();
            clearForecast();

            showError(
                friendlyErrorMessage(
                    error,
                    "Something went wrong. Please try again."
                )
            );

            if (currentMarker && location) {
                currentMarker.setPopupContent(
                    `<strong>${escapeHTML(location.name)}</strong><br>` +
                    "Weather information is currently unavailable."
                ).openPopup();
            }
        }
    } finally {
        if (activeRequest === controller) {
            activeRequest = null;
            setLoading(false);
        }
    }
});

// ======================================================
// INITIAL PAGE SETUP
// ======================================================

renderFavorites();
updateFavoriteButton();
clearForecast();
