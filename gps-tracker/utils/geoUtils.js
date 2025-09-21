class GeoUtils {
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
  }

  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  static isPointInGeofence(point, geofence) {
    // Simple implementation for circular geofence
    const distance = this.calculateDistance(
      point.latitude, point.longitude,
      geofence.center.latitude, geofence.center.longitude
    );
    
    return distance <= geofence.radius;
  }

  static calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = this.deg2rad(lat1);
    const φ2 = this.deg2rad(lat2);
    const Δλ = this.deg2rad(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return (this.rad2deg(θ) + 360) % 360;
  }

  static rad2deg(rad) {
    return rad * (180 / Math.PI);
  }

  static formatCoordinate(coord, isLatitude) {
    const direction = isLatitude ? 
      (coord >= 0 ? 'N' : 'S') : 
      (coord >= 0 ? 'E' : 'W');
    
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutes = (absolute - degrees) * 60;
    
    return `${degrees}° ${minutes.toFixed(4)}' ${direction}`;
  }
}

module.exports = GeoUtils;