import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  const college = {
    name: "E009",
    course: "PES University (Ring Road Campus)",
    place: "PESU-RR"
  };

  const prompt = `Refine the following engineering college data based on real-world information in Karnataka, India. 
Fix any misspelled or misplaced names (e.g. if the college name was put in the course field, fix it).
Provide realistic average and highest placement packages (LPA), fees in INR, and a rating out of 5.
Find real high-quality image URLs for this specific college on the web (e.g., campus photos, buildings).
Input: ${JSON.stringify(college)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Corrected College Name" },
          place: { type: Type.STRING, description: "Corrected Place/City" },
          locationAddress: { type: Type.STRING },
          website: { type: Type.STRING },
          contactNumber: { type: Type.STRING },
          rating: { type: Type.NUMBER },
          details: { type: Type.STRING, description: "A paragraph of details about the college" },
          averagePackage: { type: Type.NUMBER, description: "Average LPA" },
          highestPackage: { type: Type.NUMBER, description: "Highest LPA" },
          fees: { type: Type.NUMBER, description: "Average Fees in INR" },
          images: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Array of 3-5 real image URLs of this college's campus found on the web"
          }
        },
        required: ["name", "place", "locationAddress", "rating", "details", "averagePackage", "highestPackage", "fees", "images"]
      }
    }
  });

  console.log(response.text);
}
run();
