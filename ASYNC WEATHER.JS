
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search?name=';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';


const WMO_CODES = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Icy fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Moderate showers',
    82: 'Violent showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm + hail',
    99: 'Heavy thunderstorm'
};


function logEvent(msg, type = 'sync') {
    const box = document.getElementById('consoleBox');
    const p = document.createElement('p');

    const labelMap = {
        sync: ['lbl-sync', 'log-sync', 'SYNC'],
        async: ['lbl-async', 'log-async', 'ASYNC'],
        micro: ['lbl-micro', 'log-micro', 'Microtask'],
        macro: ['lbl-macro', 'log-macro', 'Macrotask'],
        data: ['lbl-async', 'log-data', 'ASYNC'],
        error: ['lbl-sync', 'log-error', 'ERROR'],
    };

    const [lblClass, textClass, labelText] = labelMap[type] || labelMap.sync;
    p.innerHTML = `<span class="label ${lblClass}">${labelText}</span>` +
        `<span class="${textClass}">${msg}</span>`;

    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
    console.log(`[${labelText}] ${msg}`);
}

function clearConsole() {
    document.getElementById('consoleBox').innerHTML = '';
}

function getHistory() {
    return JSON.parse(localStorage.getItem('weatherHistory') || '[]');
}

function saveToHistory(city) {
    let history = getHistory();
    city = city.trim();


    history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
    history.unshift(city);


    if (history.length > 8) history = history.slice(0, 8);

    localStorage.setItem('weatherHistory', JSON.stringify(history));
}

function renderHistory() {
    const container = document.getElementById('historyContainer');
    const history = getHistory();
    container.innerHTML = '';

    history.forEach(city => {
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.textContent = city;


        btn.onclick = () => {
            document.getElementById('cityInput').value = city;
            handleSearch();
        };

        container.appendChild(btn);
    });
}

function showWeather(data) {
    const output = document.getElementById('weatherOutput');
    output.innerHTML = `
    <table class="weather-table">
      <tr><td>City</td>     <td>${data.city}, ${data.country}</td></tr>
      <tr><td>Temp</td>     <td>${data.temp} °C</td></tr>
      <tr><td>Weather</td>  <td>${data.condition}</td></tr>
      <tr><td>Humidity</td> <td>${data.humidity}%</td></tr>
      <tr><td>Wind</td>     <td>${data.wind} m/s</td></tr>
    </table>`;
}

function showError(msg) {
    document.getElementById('weatherOutput').innerHTML =
        `<span class="weather-error">${msg}</span>`;
}

async function fetchWeather(city) {


    logEvent('Sync Start', 'sync');
    logEvent('Sync End', 'sync');


    logEvent('[ASYNC] Start fetching', 'async');


    Promise.resolve().then(() => logEvent('Promise.then (Microtask)', 'micro'));


    setTimeout(() => logEvent('setTimeout (Macrotask)', 'macro'), 0);

    try {

        const geoRes = await fetch(
            `${GEO_API}${encodeURIComponent(city)}&count=1&language=en&format=json`
        );

        if (!geoRes.ok) throw new Error('Network error while fetching location');

        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found');
        }

        const { name, country, latitude, longitude } = geoData.results[0];


        const url =
            `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
            `&timezone=auto`;

        const wRes = await fetch(url);
        if (!wRes.ok) throw new Error('Network error while fetching weather');

        const wData = await wRes.json();
        const curr = wData.current;

        const result = {
            city: name,
            country: country,
            temp: curr.temperature_2m,
            humidity: curr.relative_humidity_2m,
            wind: curr.wind_speed_10m,
            condition: WMO_CODES[curr.weather_code] || 'Unknown'
        };

        logEvent('[ASYNC] Data received', 'data');
        return result;

    } catch (err) {

        logEvent(`[ERROR] ${err.message}`, 'error');
        throw err;
    }
}

async function handleSearch() {
    const input = document.getElementById('cityInput');
    const city = input.value.trim();

    if (!city) {
        showError('⚠ Please enter a city name.');
        return;
    }

    clearConsole();
    showError('Loading...');

    fetchWeather(city)
        .then(data => {
            showWeather(data);
            saveToHistory(city);
            renderHistory();
        })
        .catch(err => {
            if (err.message === 'City not found') {
                showError('City not found');
            } else {
                showError('⚠ Network error. Please try again.');
            }
        });
}


document.getElementById('cityInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
});

window.onload = () => {
    renderHistory();
};
