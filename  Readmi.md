# WeatherMap — Live Weather Explorer

An interactive weather web application that allows users to search for locations, view current weather conditions on a map, explore a five-day forecast, save favorite locations, and share weather information.

## Project Overview

WeatherMap combines an interactive map with real-time weather information to provide a simple and convenient way to explore locations around the world.

Users can search for a city, view its location on the map, check current weather details, review upcoming forecasts, and save locations for future visits.

## Features

- **Location Search:** Search for cities and locations by name.
- **Interactive Map:** Display searched locations using Leaflet and OpenStreetMap.
- **Current Weather:** View temperature, weather description, feels-like temperature, humidity, wind speed, and weather icons.
- **Five-Day Forecast:** Explore daily weather conditions and minimum and maximum temperatures.
- **Favorite Locations:** Save, revisit, and remove favorite locations using browser local storage.
- **Share Weather:** Share weather information using the native sharing interface, WhatsApp, or X, or copy the details to the clipboard.
- **Loading Indicators:** Display loading feedback while requests are being processed.
- **Error Handling:** Provide helpful messages for invalid locations, network failures, and weather API errors.
- **Responsive Design:** Includes viewport settings to support different screen sizes.

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Structures the web page and its content. |
| CSS3 | Styles the interface and layout. |
| JavaScript (ES6+) | Implements application logic and interactive features. |
| Leaflet 1.9.4 | Displays the interactive map and location markers. |
| OpenStreetMap | Provides map tiles and geographical map data. |
| Nominatim API | Searches for locations and retrieves geographical coordinates. |
| OpenWeatherMap API | Provides current weather and five-day forecast data. |
| Local Storage | Saves favorite locations in the browser. |

## Project Structure

```text
weather-map/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```

## Getting Started

### 1. Download or Clone the Project

Clone the repository:

```bash
git clone https://github.com/fofaJourge/weather-map.git
```

Navigate to the project directory:

```bash
cd weather-map
```

If the repository has a different name, replace `weather-map` with the actual repository directory.

### 2. Configure the Weather API

Create an OpenWeatherMap API key through your OpenWeatherMap account.

Configure the key in `js/app.js`:

```javascript
const OPENWEATHER_API_KEY = "YOUR_API_KEY";
```

Replace `YOUR_API_KEY` with your own key.

**Security note:** A key included in client-side JavaScript is visible to users. Do not publish a private or unrestricted API key in a public repository. For a deployed application, use a server-side proxy and appropriate API restrictions where supported.

### 3. Run the Application

Open `index.html` in a web browser, or use the Live Server extension in Visual Studio Code.

For example, with Live Server:

1. Open the project folder in VS Code.
2. Install the Live Server extension if necessary.
3. Right-click `index.html`.
4. Select **Open with Live Server**.

An internet connection is required to retrieve external map tiles, geocoding results, weather information, and external fonts.

## How to Use

1. Open the WeatherMap application.
2. Enter a city or location in the search field.
3. Click **Get Weather**.
4. View the location marker and current weather details on the map.
5. Explore the five-day forecast.
6. Save the location using **Save to Favorites**.
7. Select a saved location to search for it again.
8. Use **Share Weather** to copy or share the weather details.

## Error Handling

The application handles several common situations:

- Empty or excessively long location input.
- Locations that cannot be found.
- Invalid or inactive weather API keys.
- Weather service rate limits and unsuccessful HTTP responses.
- Network connection failures.
- Failed forecast requests.
- Clipboard access and sharing errors.
- Browser storage failures.

The application also cancels previous search requests when a new search begins, helping prevent outdated results from replacing newer ones.

## APIs and Data Sources

- **OpenStreetMap:** https://www.openstreetmap.org/
- **Nominatim:** https://nominatim.org/
- **OpenWeatherMap:** https://openweathermap.org/api
- **Leaflet:** https://leafletjs.com/

Map data and weather information are provided by their respective services and are subject to their terms of use and attribution requirements.

## Author

**Name:** Anfal Abdel Hamid Ali Ismail  
**Department:** Software Engineering  
**Academic Year:** Fourth Year

## GitHub

GitHub Profile: https://github.com/fofaJourge

## License

This project was developed as an educational software engineering project. Third-party libraries, map data, and weather services remain subject to their respective licenses and terms of use.
