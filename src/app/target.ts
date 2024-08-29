export interface Plane {
  icao_address: string;
  callsign: string;
  origin_country: string;
  time_position: string;
  last_contact: string;
  longitude: number;
  latitude: number;
  altitude_baro: number;
  on_ground: boolean;
  velocity: number;
  heading: number;
  vertical_rate: number;
  sensors: string;
  geo_altitude: number;
  squawk: string;
  spi: boolean;
  position_source: number;
  collection_type: 'satellite' | 'terrestrial'; // Add this line
}


export interface Flight {
  flight_id: string;
  timestamp: string;
  icao_address: string;
  tail_number: string;
  aircraft_type_icao: string;
  aircraft_type_name: string;
  aircraft_role: string;
  airline_icao: string;
  airline_iata: string;
  airline_name: string;
  flight_number: string;
  callsign: string;
  flight_state: string;
  departure_airport_icao: string;
  departure_airport_iata: string;
  arrival_airport_icao: string;
  arrival_airport_iata: string;
  departure_utc_offset: string;
  departure_scheduled_time: string;
  arrival_scheduled_time: string;
  latitude: number;
  longitude: number;
  altitude_baro: number;
  on_ground: boolean;
  speed: number;
  heading: number;
  vertical_rate: number;
  squawk: string;
  departure_estimated_time: string;
  arrival_estimated_time: string;
  takeoff_time: string;
  off_block_time: string;
  flight_start: string;
}