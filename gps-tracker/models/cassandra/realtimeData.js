// This is a virtual model for Cassandra - actual schema is defined in config
// This file serves as documentation and reference

/*
Cassandra Table Schema:
CREATE TABLE realtime_data (
  device_imei text,
  timestamp timestamp,
  latitude double,
  longitude double,
  speed double,
  heading double,
  altitude double,
  satellites int,
  hdop double,
  battery int,
  ignition boolean,
  PRIMARY KEY (device_imei, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

CREATE TABLE location_history (
  device_imei text,
  date text,
  timestamp timestamp,
  latitude double,
  longitude double,
  speed double,
  heading double,
  PRIMARY KEY ((device_imei, date), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);
*/

module.exports = {
  // This is a virtual model - actual operations are handled by services
};