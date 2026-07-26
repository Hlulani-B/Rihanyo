import { db } from "../firebase.js";

// Helper function to pause execution for rate-limiting Nominatim
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory cache to prevent redundant API calls during server runtime
const coordinateCache = new Map();

// Admin SDK: query a collection by name directly on db, no collection()/getDocs() helpers needed
async function getAddressAndId(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "Unknown Practice",
        address: data.address || null,
        // Check if pre-calculated coordinates exist on the Firestore doc
        lat: data.lat ?? data.latitude ?? null,
        lon: data.lon ?? data.lng ?? data.longitude ?? null,
      };
    });
  } catch (err) {
    console.error("Error fetching practice profiles:", err);
    return [];
  }
}

export default class Distance {
  async getCoordinates(location) {
    if (!location || typeof location !== "string") return null;

    const trimmedLocation = location.trim();

    // Return cached coordinates if already geocoded
    if (coordinateCache.has(trimmedLocation)) {
      return coordinateCache.get(trimmedLocation);
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        trimmedLocation
      )}&format=json&limit=1`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "RihanyoMedicalBot/1.0 (contact@rihanyo.com)",
        },
      });

      if (!response.ok) {
        console.error("Nominatim API error response:", response.status);
        return null;
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) return null;

      const coords = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };

      // Store in cache for future calls
      coordinateCache.set(trimmedLocation, coords);

      return coords;
    } catch (error) {
      console.error("Failed to fetch coordinates for location:", location, error);
      return null;
    }
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km

    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in km
  }

  async getNearestPractices(radius, userLocation) {
  const radiusKm = Number(radius);
    const userCoordinates = await this.getCoordinates(userLocation);

    if (!userCoordinates) {
      console.error("Could not geocode user location:", userLocation);
      return [];
    }

    const practices = await getAddressAndId("practiceProfiles");
    const result = [];

    for (const p of practices) {
      let coordinates = null;

      // 1. Direct coordinates stored in Firestore doc
      if (p.lat !== null && p.lon !== null) {
        coordinates = { lat: parseFloat(p.lat), lon: parseFloat(p.lon) };
      } 
      // 2. Geocode from address text
      else if (p.address) {
        const trimmedAddress = p.address.trim();
        const isCached = coordinateCache.has(trimmedAddress);

        // Only enforce the 1-second throttle if the address isn't cached yet
        if (!isCached) {
          await sleep(1000);
        }

        coordinates = await this.getCoordinates(trimmedAddress);
      }

      if (!coordinates) {
        console.warn("Could not determine coordinates for practice:", p.name);
        continue;
      }

      const distance = this.haversineDistance(
        userCoordinates.lat,
        userCoordinates.lon,
        coordinates.lat,
        coordinates.lon
      );

     if (!Number.isNaN(radiusKm) && distance <= radiusKm) {
        result.push({
          id: p.id,
          name: p.name,
          address: p.address,
          distanceKm: Math.round(distance * 10) / 10,
        });
      }
    }

    // Sort results by nearest distance first
    return result.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}