(function () {
  const weatherCard = document.getElementById('weather-card');
  const weatherLocation = document.getElementById('weather-location');
  const weatherEmoji = document.getElementById('weather-emoji');
  const weatherTemperature = document.getElementById('weather-temperature');
  const weatherCondition = document.getElementById('weather-condition');
  const weatherMeta = document.getElementById('weather-meta');
  const weatherStatus = document.getElementById('weather-status');

  function describeWeather(code) {
    if (code === 0) return { emoji: '☀️', label: 'Clear sky' };
    if (code === 1) return { emoji: '🌤️', label: 'Mostly sunny' };
    if (code === 2) return { emoji: '⛅', label: 'Partly cloudy' };
    if (code === 3) return { emoji: '☁️', label: 'Overcast' };
    if (code === 45 || code === 48) return { emoji: '🌫️', label: 'Foggy' };
    if ([51, 53, 55, 56, 57].includes(code)) return { emoji: '🌦️', label: 'Drizzle' };
    if ([61, 63, 65, 80, 81, 82].includes(code)) return { emoji: '🌧️', label: 'Rain' };
    if ([66, 67].includes(code)) return { emoji: '🧊', label: 'Freezing rain' };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { emoji: '❄️', label: 'Snow' };
    if ([95, 96, 99].includes(code)) return { emoji: '⛈️', label: 'Thunderstorm' };
    return { emoji: '🌤️', label: 'Current conditions' };
  }

  function setWeatherState(state) {
    if (!weatherCard) return;
    weatherLocation.textContent = state.location;
    weatherEmoji.textContent = state.emoji;
    weatherTemperature.textContent = state.temperature;
    weatherCondition.textContent = state.condition;
    weatherMeta.textContent = state.meta;
    weatherStatus.textContent = state.status || '';
    weatherCard.classList.toggle('is-loading', Boolean(state.loading));
  }

  async function loadWeather() {
    if (!weatherCard) return;

    try {
      const locationDetails = await getWeatherCoordinates();
      const latitude = locationDetails.latitude;
      const longitude = locationDetails.longitude;

      const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
      weatherUrl.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current_weather: 'true',
        temperature_unit: 'fahrenheit',
        timezone: 'auto'
      }).toString();

      const [data, location] = await Promise.all([
        fetchJson(weatherUrl, 'Weather request failed.'),
        locationDetails.label ? Promise.resolve(locationDetails.label) : loadLocationName(latitude, longitude)
      ]);

      const current = data.current_weather;
      if (!current || typeof current.temperature !== 'number' || typeof current.weathercode !== 'number') {
        throw new Error('Weather data is unavailable right now.');
      }

      const summary = describeWeather(current.weathercode);
      setWeatherState({
        location: location,
        emoji: summary.emoji,
        temperature: `${Math.round(current.temperature)}°F`,
        condition: summary.label,
        meta: 'Powered by Open-Meteo using your browser location.',
        status: '',
        loading: false
      });
    } catch (error) {
      await loadIpWeather();
    }
  }

  async function getWeatherCoordinates() {
    const position = await getCurrentPosition();
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      label: ''
    };
  }

  async function loadLocationName(latitude, longitude) {
    const reverseUrl = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
    reverseUrl.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      language: 'en',
      format: 'json'
    }).toString();

    try {
      const data = await fetchJson(reverseUrl, 'Reverse geocoding failed.');
      const firstResult = data.results && data.results[0];
      if (!firstResult) return 'Your area';
      const locationParts = [firstResult.name, firstResult.admin1].filter(Boolean);
      return locationParts.join(', ') || 'Your area';
    } catch (error) {
      return 'Your area';
    }
  }

  async function fetchJson(url, errorMessage) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async function loadIpWeather() {
    const data = await fetchJson('https://wttr.in/?format=j1', 'IP weather lookup failed.');
    const current = data.current_condition && data.current_condition[0];
    const nearestArea = data.nearest_area && data.nearest_area[0];
    const location = nearestArea && nearestArea.areaName && nearestArea.areaName[0] ? nearestArea.areaName[0].value : 'Your area';
    const condition = current && current.weatherDesc && current.weatherDesc[0] ? current.weatherDesc[0].value : 'Current conditions';
    const summary = describeWeatherText(condition);

    if (!current || typeof current.temp_F === 'undefined') {
      throw new Error('IP weather lookup failed.');
    }

    setWeatherState({
      location: location,
      emoji: summary.emoji,
      temperature: `${Math.round(Number(current.temp_F))}°F`,
      condition: condition,
      meta: '',
      status: '',
      loading: false
    });
  }

  function describeWeatherText(condition) {
    const text = String(condition || '').toLowerCase();
    if (text.includes('sun') || text.includes('clear')) return { emoji: '☀️' };
    if (text.includes('cloud')) return { emoji: '☁️' };
    if (text.includes('rain') || text.includes('drizzle')) return { emoji: '🌧️' };
    if (text.includes('snow') || text.includes('sleet') || text.includes('ice')) return { emoji: '❄️' };
    if (text.includes('storm') || text.includes('thunder')) return { emoji: '⛈️' };
    if (text.includes('fog') || text.includes('mist')) return { emoji: '🌫️' };
    return { emoji: '🌤️' };
  }

  function getCurrentPosition() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported in this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, function (err) {
        if (err.code === err.PERMISSION_DENIED) {
          reject(Object.assign(err, { isDenied: true }));
        } else {
          reject(err);
        }
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      });
    });
  }

  if (weatherCard) {
    loadWeather().catch(function (err) {
      if (err && err.isDenied) {
        setWeatherState({
          location: 'Location off',
          emoji: '📍',
          temperature: '',
          condition: 'Enable location to see your weather.',
          meta: '',
          status: '',
          loading: false
        });
      } else {
        setWeatherState({
          location: 'Your area',
          emoji: '📍',
          temperature: '--°F',
          condition: 'Weather unavailable right now.',
          meta: '',
          status: '',
          loading: false
        });
      }
    });
  }

  const canvas = document.getElementById('dandelion-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function drawDandelion(cx, cy, r, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.15);
    ctx.bezierCurveTo(cx - 3, cy + r * 0.8, cx - 6, cy + r * 1.4, cx - 10, cy + r * 2.2);
    ctx.strokeStyle = 'rgba(70, 130, 95, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    const spokes = 16;
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2 - Math.PI * 0.5;
      const ex = cx + Math.cos(angle) * r;
      const ey = cy + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = 'rgba(100, 165, 135, 0.35)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(195, 235, 220, 0.58)';
      ctx.fill();

      for (let f = 0; f < 6; f++) {
        const fa = angle + (f / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(fa) * 4.5, ey + Math.sin(fa) * 4.5);
        ctx.lineTo(ex + Math.cos(fa) * 10, ey + Math.sin(fa) * 10);
        ctx.strokeStyle = 'rgba(160, 215, 195, 0.28)';
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }
    }

    const g = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, 7);
    g.addColorStop(0, 'rgba(248, 230, 150, 0.9)');
    g.addColorStop(1, 'rgba(210, 178, 95, 0.6)');
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.restore();
  }

  function drawSeed(x, y, rot, alpha, size) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(size, size);

    const L = 26;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -L);
    ctx.strokeStyle = 'rgba(90, 155, 120, 0.5)';
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -L - 5, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(195, 235, 220, 0.44)';
    ctx.fill();

    for (let f = 0; f < 7; f++) {
      const fa = (f / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(fa) * 6, -L - 5 + Math.sin(fa) * 6);
      ctx.lineTo(Math.cos(fa) * 13, -L - 5 + Math.sin(fa) * 13);
      ctx.strokeStyle = 'rgba(165, 215, 198, 0.28)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  const dandelions = [
    { period: 26.7, phaseOff: 0.00, yFrac: 0.38, bobAmp: 22, bobFreq: 0.22, radFrac: 0.062, alpha: 0.52 },
    { period: 21.3, phaseOff: 0.38, yFrac: 0.22, bobAmp: 12, bobFreq: 0.30, radFrac: 0.038, alpha: 0.42 },
    { period: 30.0, phaseOff: 0.70, yFrac: 0.62, bobAmp: 16, bobFreq: 0.17, radFrac: 0.050, alpha: 0.46 },
  ];

  const seeds = Array.from({ length: 11 }, (_, i) => ({
    x: (i / 11),
    y: 0.1 + Math.random() * 0.8,
    vx: 0.000143 + Math.random() * 0.000173,
    vy: (Math.random() - 0.5) * 0.000075,
    rot: Math.random() * Math.PI * 2,
    rv: (Math.random() - 0.5) * 0.0042,
    alpha: 0.18 + Math.random() * 0.22,
    size: 0.6 + Math.random() * 0.55,
  }));

  function frame(ms) {
    const t = ms * 0.001;
    ctx.clearRect(0, 0, W, H);

    for (const d of dandelions) {
      const phase = ((t / d.period) + d.phaseOff) % 1;
      const mx = W * (1.12 - phase * 1.28);
      const my = H * d.yFrac + Math.sin(t * d.bobFreq) * d.bobAmp;
      const fadeA = phase < 0.08 ? phase / 0.08 : phase > 0.92 ? (1 - phase) / 0.08 : 1;
      drawDandelion(mx, my, Math.min(W, H) * d.radFrac, fadeA * d.alpha);
    }

    for (const s of seeds) {
      s.x += s.vx;
      s.y += s.vy;
      s.rot += s.rv;
      if (s.x > 1.1) { s.x = -0.06; s.y = 0.1 + Math.random() * 0.8; }
      drawSeed(s.x * W, s.y * H, s.rot, s.alpha, s.size);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}());
