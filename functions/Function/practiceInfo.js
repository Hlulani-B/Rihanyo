import Distance from "./distance.js";
import { db } from "../firebase.js"; // adjust path to your firebase init
import { AI } from "./ai.js";

export default class Practice {
  constructor() {
    this.distance = new Distance();
  }


  // Fetches all availability documents for a given doctor/practice ID.
// Availability docs are stored per day (e.g. "dummy10_mon", "dummy10_tue")
// under the "availability" collection, with the practice/doctor id as a
// prefix or field. Adjust the query below to match your actual doc shape
// if the id isn't stored as a field named "id".
async getAvailabilityForDoctor(doctorId) {
  if (!doctorId) return [];
  try {
    const snapshot = await db
      .collection("availability")
      .where("id", "==", doctorId)
      .get();

    return snapshot.docs.map((docSnap) => docSnap.data());
  } catch (err) {
    console.error("Error fetching availability for doctorId:", doctorId, err);
    return [];
  }
}

  // Fetches all Firestore fields concurrently for an array of document IDs
  // (Admin SDK: doc.get() directly on db.collection(...).doc(id), and
  // docSnap.exists is a PROPERTY here, not a function like in the client SDK.)
  async getDocsByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    try {
      const fetchPromises = ids.map(async (id) => {
        const docSnap = await db.collection("practiceProfiles").doc(id).get();
        return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } : null;
      });

      const docs = await Promise.all(fetchPromises);
      return docs.filter((docData) => docData !== null);
    } catch (err) {
      console.error("Error fetching practice documents by IDs:", err);
      return [];
    }
  }

  // Fetches ALL practices from Firestore to answer general queries
  async getAllPractices() {
    try {
      const querySnapshot = await db.collection("practiceProfiles").get();
      const practices = [];
      querySnapshot.forEach((docSnap) => {
        practices.push({ id: docSnap.id, ...docSnap.data() });
      });
      return practices;
    } catch (err) {
      console.error("Error fetching all practice documents:", err);
      return [];
    }
  }

  // Searches every practice's doctors for a name match and returns the
  // practice id (used as doctorId) + the matched doctor's name.
  // Handles either a `doctors` array (of strings or {name} objects) or a
  // single `doctorName` field on the practice document.
 async findDoctorByName(doctorName) {
  if (!doctorName || typeof doctorName !== "string") return null;

  try {
    const practices = await this.getAllPractices();
    const needle = doctorName.trim().toLowerCase();

    for (const practice of practices) {
      // Each practice document IS a single doctor — the doctor's name
      // lives directly on `name`, not a `doctors` array or `doctorName` field.
      if (practice.name && practice.name.toLowerCase().includes(needle)) {
        return { practiceId: practice.id, doctorName: practice.name };
      }
    }

    console.warn(`[Practice.findDoctorByName] No match found in Firebase for "${doctorName}"`);
    return null;
  } catch (err) {
    console.error("Error in Practice.findDoctorByName:", err);
    return null;
  }
}
// Generates a summary for specific practices.
  // Accepts EITHER:
  //   - an array of plain ID strings, OR
  //   - an array of practice objects (e.g. from Distance.getNearestPractices,
  //     shaped like { id, name, address, distanceKm })
  // and normalizes to IDs before fetching full docs from Firestore.
  async getEssay(practicesOrIds) {
    try {
      if (!Array.isArray(practicesOrIds) || practicesOrIds.length === 0) {
        return "No matching practices were found.";
      }

      const ids = practicesOrIds
        .map((item) => (typeof item === "string" ? item : item?.id))
        .filter(Boolean);

      if (ids.length === 0) {
        console.warn("[Practice.getEssay] Could not extract any valid IDs from input:", practicesOrIds);
        return "No matching practices were found.";
      }

      const practices = await this.getDocsByIds(ids);
      if (!practices || practices.length === 0) {
        return "No matching practices were found.";
      }

      // Preserve distanceKm from the original nearest-practices result
      // (getDocsByIds only pulls Firestore fields, not computed distance).
      const distanceById = new Map(
        practicesOrIds
          .filter((item) => typeof item === "object" && item?.id)
          .map((item) => [item.id, item.distanceKm])
      );

      const enriched = practices.map((p) =>
        distanceById.has(p.id) ? { ...p, distanceKm: distanceById.get(p.id) } : p
      );

      return await this.summarizePractices(enriched);
    } catch (err) {
      console.error("Error in Practice.getEssay:", err);
      return "An error occurred while gathering practice details.";
    }
  }

  // Summarizes ALL practices/doctors for general user questions.
  // If a location is provided, each practice is annotated with its distance
  // from that location (km) and results are sorted nearest-first, using the
  // same geocode + haversine logic as Distance.getNearestPractices.
  async getAvailableDoctorsSummary(location = null) {
    try {
      const practices = await this.getAllPractices();
      if (!practices || practices.length === 0) {
        return "There are currently no listed practices or doctors available.";
      }

      let enrichedPractices = practices;

      if (location) {
        const userCoords = await this.distance.getCoordinates(location);

        if (userCoords) {
          enrichedPractices = await Promise.all(
            practices.map(async (p) => {
              let coords = null;

              const lat = p.lat ?? p.latitude ?? null;
              const lon = p.lon ?? p.lng ?? p.longitude ?? null;

              if (lat !== null && lon !== null) {
                coords = { lat: parseFloat(lat), lon: parseFloat(lon) };
              } else if (p.address) {
                coords = await this.distance.getCoordinates(p.address);
              }

              if (!coords) {
                return { ...p, distanceKm: null };
              }

              const distanceKm = this.distance.haversineDistance(
                userCoords.lat,
                userCoords.lon,
                coords.lat,
                coords.lon
              );

              return { ...p, distanceKm: Math.round(distanceKm * 10) / 10 };
            })
          );

          enrichedPractices.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        } else {
          console.warn(`[Practice.getAvailableDoctorsSummary] Could not geocode location="${location}" — returning practices without distance.`);
        }
      }

      return await this.summarizePractices(enrichedPractices);
    } catch (err) {
      console.error("Error in Practice.getAvailableDoctorsSummary:", err);
      return "An error occurred while gathering practice details.";
    }
  }

  // Shared Helper: Formats practice data via Groq
  async summarizePractices(practices) {
    const practiceDataString = JSON.stringify(practices, null, 2);
  const prompt = `You are a helpful medical practice assistant.

TASK:
Write a clear, natural, and detailed narrative essay describing the following medical practices for a patient looking to book an appointment. 

RULES:
- Highlight key details such as practice name, location/address, available doctors, distance (in km), and services offered.
- Write in full, warm, conversational sentences—NOT a list or a JSON dump.
- Rely STRICTLY on the data provided. Do NOT invent any facts or details not present in the input.

INPUT DATA:
${practiceDataString}

OUTPUT FORMAT (JSON only):
{
  "practice": "<Your full readable narrative essay here as a single cohesive string, formatted with sentences and clear paragraphs if needed. End with asking the patient which doctor or practice they would like to book with.>"
}`;

    const result = await AI(prompt);

    if (!result) {
      return "Unable to generate summary at this time.";
    }

    // AI() may return a JSON string or an already-parsed object — handle both,
    // and pull out just the essay text instead of the wrapper object.
    let parsed = result;
    if (typeof result === "string") {
      try {
        parsed = JSON.parse(result);
      } catch (err) {
        console.error("Error parsing AI response as JSON in summarizePractices:", err, "raw:", result);
        return "Unable to generate summary at this time.";
      }
    }

    return parsed.practice || "Unable to generate summary at this time.";
  }
}