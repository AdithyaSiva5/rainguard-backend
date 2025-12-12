import axios from "axios";

export const getCurrentWeather = async (lat, lon) => {
  const apiKey = "ad1794258cdb2c1cdd0fa776cca1bf23";
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const response = await axios.get(url);
  return response.data;
};