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
Input: ${JSON.stringify(college)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          place: { type: Type.STRING },
          averagePackage: { type: Type.NUMBER },
          highestPackage: { type: Type.NUMBER },
          fees: { type: Type.NUMBER },
        },
        required: ["name", "place", "averagePackage", "highestPackage", "fees"]
      }
    }
  });

  console.log(response.text);
}
run();
