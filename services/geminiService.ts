import { GoogleGenAI, GenerateContentResponse, Chat, GenerateContentParameters } from "@google/genai";
import { CaseData, CharacterRole, Evidence } from '../types';
import { 
    GEMINI_MODEL_TEXT, 
    GEMINI_MODEL_IMAGE, 
    INITIAL_CASE_DURATION_MINUTES, 
    DURATION_DECREMENT_PER_LEVEL_MINUTES, 
    MIN_CASE_DURATION_MINUTES,
    CLASS_8_TOPIC_INDEX_KEY_BASE,
    CLASS_9_TOPIC_INDEX_KEY_BASE,
    CLASS_10_TOPIC_INDEX_KEY_BASE,
    getUserSpecificKey
} from '../constants';

const API_KEY = "AIzaSyCoHj3OwEbxQqcLvWeHORAzWBPvjX3_61k";

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.error("API_KEY environment variable not set. Gemini Service will not function.");
}

let prosecutorChat: Chat | null = null;
let coCounselChat: Chat | null = null;

const initializeChat = (systemInstruction: string): Chat | null => {
  if (!ai) return null;
  return ai.chats.create({
    model: GEMINI_MODEL_TEXT,
    config: { systemInstruction },
  });
};

export const generateCaseData = async (playerLevel: number, targetClass: number, username: string | null): Promise<CaseData> => {
  if (!ai) {
    throw new Error("Gemini AI not initialized (API key likely missing). Cannot generate case data.");
  }
  if (!username) {
    throw new Error("Username is required to generate case data for topic progression.");
  }

  const caseIdSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let caseDuration = INITIAL_CASE_DURATION_MINUTES - ((playerLevel -1) * DURATION_DECREMENT_PER_LEVEL_MINUTES);
  if (caseDuration < MIN_CASE_DURATION_MINUTES) {
    caseDuration = MIN_CASE_DURATION_MINUTES;
  }
  
  const class8Topics = [
    "Rational Numbers", 
    "Linear Equations in One Variable", 
    "Understanding Quadrilaterals", 
    "Data Handling (interpreting bar graphs, pie charts, probability basics)", 
    "Squares & Square Roots", 
    "Cubes & Cube Roots", 
    "Comparing Quantities (percentages, profit/loss, simple/compound interest)", 
    "Algebraic Expressions & Identities (multiplication, basic factorization)", 
    "Mensuration (area of plane figures, surface area/volume of cube, cuboid, cylinder)", 
    "Exponents & Powers", 
    "Direct & Inverse Proportions", 
    "Factorisation (common factors, regrouping, identities, division)", 
    "Introduction to Graphs (bar graphs, pie charts, line graphs, coordinate basics)"
  ];
  const class9Topics = [
    "Number Systems (real numbers, irrational numbers, laws of exponents for real numbers)", 
    "Polynomials (zeros, remainder theorem, factor theorem, algebraic identities)", 
    "Coordinate Geometry (Cartesian plane, plotting points)", 
    "Linear Equations in Two Variables (ax+by+c=0, graph of linear equation)", 
    "Euclid’s Geometry (axioms, postulates, basic theorems)", 
    "Lines and Angles (types of angles, parallel lines and transversals, angle sum property of triangles)", 
    "Triangles (congruence criteria - SSS, SAS, ASA, RHS, properties of isosceles triangles, inequalities in triangles)", 
    "Quadrilaterals (properties of parallelograms, midpoint theorem)", 
    "Circles (terms, theorems on equal chords, angle subtended by arc, cyclic quadrilaterals)", 
    "Heron’s Formula (area of triangle)", 
    "Surface Areas & Volumes (cube, cuboid, cylinder, cone, sphere, hemisphere)", 
    "Statistics (collection/presentation of data, bar graphs, histograms, frequency polygons, mean, median, mode of ungrouped data)"
  ];
  const class10Topics = [
    "Real Numbers (Euclid's division lemma, fundamental theorem of arithmetic, irrational numbers revisited, decimal expansions)", 
    "Polynomials (zeros, relationship between zeros and coefficients, division algorithm)", 
    "Pair of Linear Equations in Two Variables (graphical solution, algebraic methods - substitution, elimination, cross-multiplication, reducible equations)", 
    "Quadratic Equations (standard form, solutions by factorization and quadratic formula, nature of roots)", 
    "Arithmetic Progressions (nth term, sum of n terms)", 
    "Triangles (similarity criteria - AAA, SSS, SAS, area of similar triangles, Pythagoras theorem and its converse)", 
    "Coordinate Geometry (distance formula, section formula, area of triangle)", 
    "Introduction to Trigonometry (trigonometric ratios, identities, trigonometric ratios of complementary angles)", 
    "Applications of Trigonometry (heights and distances)", 
    "Circles (tangents, number of tangents from a point)", 
    "Areas Related to Circles (area of sector and segment)", 
    "Surface Areas & Volumes (combinations of solids, conversion of solids)", 
    "Statistics (mean, median, mode of grouped data, cumulative frequency graphs - ogives)", 
    "Probability (classical definition, simple problems)"
  ];

  let chosenClassTopics: string[];
  let specificClassFocus: string;
  let topicIndexKeyBase: string;

  if (targetClass === 8) {
    chosenClassTopics = class8Topics;
    specificClassFocus = "Class 8";
    topicIndexKeyBase = CLASS_8_TOPIC_INDEX_KEY_BASE;
  } else if (targetClass === 9) {
    chosenClassTopics = class9Topics;
    specificClassFocus = "Class 9";
    topicIndexKeyBase = CLASS_9_TOPIC_INDEX_KEY_BASE;
  } else { 
    chosenClassTopics = class10Topics;
    specificClassFocus = "Class 10";
    topicIndexKeyBase = CLASS_10_TOPIC_INDEX_KEY_BASE;
  }
  
  const userSpecificTopicIndexKey = getUserSpecificKey(topicIndexKeyBase, username);
  let currentTopicIndex = 0;
  const storedIndex = localStorage.getItem(userSpecificTopicIndexKey);

  if (storedIndex) {
    const parsedIndex = parseInt(storedIndex, 10);
    if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < chosenClassTopics.length) {
      currentTopicIndex = parsedIndex;
    } else {
      console.warn(`Invalid topic index '${storedIndex}' for key '${userSpecificTopicIndexKey}'. Resetting to 0.`);
      localStorage.removeItem(userSpecificTopicIndexKey); 
      currentTopicIndex = 0; 
    }
  }
  
  const selectedTopic = chosenClassTopics[currentTopicIndex];
  
  const nextTopicIndex = (currentTopicIndex + 1) % chosenClassTopics.length;
  localStorage.setItem(userSpecificTopicIndexKey, nextTopicIndex.toString());
  
  const aiDifficultyLevelForPrompt = Math.min(5, Math.max(1, Math.ceil(playerLevel / 4)));

  const systemInstruction = `You are an expert curriculum designer for mathematics, specializing in Indian CBSE/NCERT syllabus for Classes 8, 9, and 10.
Your task is to generate a complete JSON object for a math courtroom case.
The player's current progression level is ${playerLevel}.
The case MUST be centered around a specific, demonstrable math concept from **${specificClassFocus}**, focusing on the topic: "${selectedTopic}".
The complexity of the problem and its presentation should be appropriate for player level ${playerLevel} operating within the ${specificClassFocus} curriculum.
The perceived AI difficulty (1-5 scale) for this case should be around ${aiDifficultyLevelForPrompt}.
NO general logic puzzles, brain teasers, or non-mathematical riddles. The core of the problem must be mathematical reasoning, calculation, application of formulas, or geometric proof.

Mathematical Topic: "${selectedTopic}" (from ${specificClassFocus})

JSON object structure MUST be strictly followed.
**Important JSON String Rules**: All string values in the JSON object must be valid JSON strings. This means special characters like backslashes (escaped as \`\\\\\` in the final JSON string if you mean a literal backslash, e.g., "C:\\\\path"), double quotes within strings (escaped as \`\\"\`), and newlines (escaped as \`\\n\`) must be properly escaped. Avoid generating literal unescaped newlines or other control characters within string values.

The JSON structure:
{
  "id": "CASE_DYNAMIC_${caseIdSuffix}",
  "title": "string (Engaging, math-related title, e.g., 'The Case of the Miscalculated Triangle Area', 'The Polynomial Perplexity')",
  "classLevel": "string (Clearly state the class and topic, e.g., '${specificClassFocus} - ${selectedTopic}: Problem involving [specific aspect like 'factorization of quadratics' or 'surface area of a cone']')",
  "clientName": "string (A conceptual client, e.g., 'The Accused Angle', 'Equation X', 'The Misunderstood Mean')",
  "clientDescription": "string (One-sentence description of the client concept, tying it to the math problem. e.g., 'Equation X is supposed to balance perfectly, but it's being accused of inequality.')",
  "accusation": "string (Accusation detailing a specific mathematical error related to '${selectedTopic}'. e.g., 'The Accused Angle claims to be 90 degrees, but the diagram clearly shows it's obtuse due to an error in applying the Pythagorean theorem!' or 'Equation X has an incorrect solution, x=5, when it should be x=2 based on proper algebraic manipulation.')",
  "initialProsecutionArgument": "string (Short, confident opening argument from the prosecutor, highlighting the alleged mathematical flaw, 1-2 sentences. e.g., 'Your Honor, the evidence shows a clear miscalculation in the formula for the area of a circle, leading to this absurd result!')",
  "initialCoCounselHint": "string (Short, guiding hint for the player, pointing towards the mathematical principle or area to examine. e.g., 'Captain, let's re-examine the steps used to solve that linear equation. Perhaps there's a mistake in transposing terms?')",
  "evidence": [
    {
      "id": "EVIDENCE_A_UNIQUE_SUFFIX",
      "title": "string (Descriptive title, e.g., 'The Disputed Diagram', 'The Flawed Calculation Sheet', 'The Statistical Summary')",
      "type": "document" | "graph" | "data_table" | "statement" | "image", 
      "description": "string (Description of the evidence and its relevance to '${selectedTopic}'. e.g., 'This document shows the step-by-step working of the problem where the error is suspected.')",
      "content": "string (CRITICAL: For 'graph' or 'image', MUST be a valid, self-contained SVG. The SVG should be designed for a dark UI background: use light-colored lines, shapes, and text (e.g., shades of #E2E8F0, #94A3B8, or a subtle theme accent color like #38BDF8 or #A78BFA) on a transparent background for all elements including text. Ensure good contrast and avoid large solid dark fills. Include <title> and <desc> for accessibility, viewBox around '0 0 100 100' or similar. Example for a flawed geometric figure for dark theme: '<svg viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><title>Incorrect Angle Sum</title><desc>A triangle with angles labeled 60, 70, 60 degrees, summing to 190. Designed for dark theme.</desc><polygon points=\\"10,90 50,10 90,90\\" fill=\\"rgba(167, 139, 250, 0.15)\\" stroke=\\"#A78BFA\\"/><text x=\\"20\\" y=\\"80\\" fill=\\"#E2E8F0\\" font-family=\\"sans-serif\\" font-size=\\"10\\">60°</text><text x=\\"70\\" y=\\"80\\" fill=\\"#E2E8F0\\" font-family=\\"sans-serif\\" font-size=\\"10\\">60°</text><text x=\\"48\\" y=\\"30\\" fill=\\"#E2E8F0\\" font-family=\\"sans-serif\\" font-size=\\"10\\">70°</text></svg>'. For 'data_table', simple JSON of relevant data. For 'document'/'statement', text containing mathematical steps, problem statements, or relevant assertions.)",
      "isFlawed": true, 
      "flawDescription": "string (If isFlawed is true, clear explanation of the specific MATHEMATICAL flaw related to '${selectedTopic}'. e.g., 'The sum of angles in the triangle is shown as 190 degrees, but it must be 180 degrees.' or 'The quadratic formula was applied with an incorrect sign for the 'b' coefficient.')"
    }
  ],
  "keyConcepts": ["string (e.g., 'Properties of similar triangles')", "string (e.g., 'Solving quadratic equations by factorization')"],
  "guiltyVerdictIfPlayerFails": "string (Verdit related to the mathematical failure, e.g., 'The client, Equation X, is found to be unbalanced due to incorrect algebraic manipulation.')",
  "innocentVerdictIfPlayerSucceeds": "string (Verdict related to mathematical success, e.g., 'Equation X is proven to be perfectly balanced, the initial accusation was based on a calculation error!')",
  "isClientActuallyGuilty": false,
  "caseDurationMinutes": ${caseDuration}
}

Language must be clear, engaging, and age-appropriate for students (typically 12-16 years old) studying ${specificClassFocus} mathematics. Be precise with mathematical terms.
One piece of evidence MUST contain the primary mathematical flaw. Other evidence can be supportive, provide context, or be neutral.
Ensure 'flawDescription' clearly explains the mathematical error in relation to '${selectedTopic}'.
Generate a case from ${specificClassFocus} curriculum, topic: '${selectedTopic}'. Player's overall level for context: ${playerLevel}. Target AI perceived difficulty: ${aiDifficultyLevelForPrompt}/5.`;

  const request: GenerateContentParameters = {
    model: GEMINI_MODEL_TEXT,
    contents: [{ role: "user", parts: [{ text: `Generate a math courtroom case from ${specificClassFocus} curriculum for students. Player Level: ${playerLevel}. Topic: "${selectedTopic}". Target AI difficulty: ${aiDifficultyLevelForPrompt}/5. Adhere strictly to the JSON structure, DARK THEME SVG (light elements on transparent background), and MATH FOCUS requirements in system instructions.` }] }],
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
    }
  };

  let jsonStrToParse = ''; 
  try {
    const response = await ai.models.generateContent(request);
    let rawText = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = rawText.match(fenceRegex);
    if (match && match[2]) {
      jsonStrToParse = match[2].trim();
    } else {
      jsonStrToParse = rawText; 
    }

    const newCaseData = JSON.parse(jsonStrToParse) as CaseData;
    
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    newCaseData.evidence = newCaseData.evidence.map((ev, index) => ({
        ...ev,
        id: `EVIDENCE_${alphabet[index % alphabet.length]}_${caseIdSuffix}` 
    }));

    newCaseData.evidence.forEach(ev => {
      if ((ev.type === 'image' || ev.type === 'graph') && typeof ev.content === 'string' && !ev.content.trim().toLowerCase().startsWith('<svg')) {
        console.warn(`Evidence "${ev.title}" of type ${ev.type} does not have SVG content as expected. Content: ${ev.content.substring(0,100)}... Forcing basic error SVG (dark theme).`);
        ev.content = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><title>Error: Visual Missing</title><desc>Visual could not be loaded or was not valid SVG. Expected math-related SVG for topic: ${selectedTopic} from ${specificClassFocus}. Styled for dark theme.</desc><rect x="5" y="5" width="90" height="90" fill="rgba(248, 113, 113, 0.1)" stroke="#F87171" stroke-width="1.5"/><text x="50" y="45" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#FCA5A5">Visual Error!</text><text x="50" y="60" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#FCA5A5">SVG for ${selectedTopic} missing.</text></svg>`;
      }
    });

     if (!newCaseData.classLevel || !newCaseData.classLevel.startsWith(specificClassFocus)) {
        newCaseData.classLevel = `${specificClassFocus} - ${selectedTopic}: ${newCaseData.title}`; 
     }

    return newCaseData;
  } catch (error) {
    console.error("Error generating case data from Gemini:", error);
    console.error("Attempted to parse the following string as JSON:", jsonStrToParse); 
    throw new Error(`Failed to generate or parse case data. ${error instanceof Error ? error.message : String(error)}`);
  }
};


export const getProsecutorStatement = async (
  caseData: CaseData,
  currentTurnDescription: string,
  previousDialogues: string
): Promise<string> => {
  if (!ai) return "The Prosecutor is currently unavailable due to a technical issue (AI service not initialized).";

  if (!prosecutorChat) {
    const systemInstruction = `You are a Prosecutor in a courtroom game for students (studying ${caseData.classLevel.split(" - ")[0]} mathematics).
The case is about a MATH problem: ${caseData.clientName} (related to ${caseData.classLevel}) is accused of "${caseData.accusation}".
You should speak confidently and focus on the alleged mathematical error.
Use clear, concise language suitable for 12-16 year olds. 
Example: "The defense's calculation for the area is fundamentally flawed, as they neglected to use the correct formula for a trapezium." or "The presented graph incorrectly depicts the solution set for the linear inequality."
You are the Prosecutor. Never mention being an AI.
The player (Defense Counsel) is trying to disprove your mathematical assertions.
The current situation is: ${currentTurnDescription}.
The last thing someone said was (last 100 chars): "${previousDialogues.slice(-100)}".
If the currentTurnDescription indicates the Defense Counsel's previous argument was dismissed by the Judge as irrelevant, a distraction, or mathematically flawed, you should mock their attempt or re-emphasize your original point strongly, highlighting how their argument failed to address the core mathematical issue of "${caseData.accusation}".
Now, state your next argument about the MATH problem. Keep it to 1-2 focused sentences.`;
    prosecutorChat = initializeChat(systemInstruction);
  }
  if (!prosecutorChat) return "Error: The Prosecutor is unavailable at this moment (Chat initialization failed).";

  try {
    const prompt = `Prosecutor,
The current situation is: ${currentTurnDescription}.
The last thing someone said: "${previousDialogues.slice(-100)}".
What's your next concise argument to highlight the mathematical error by ${caseData.clientName}? Focus on the core math problem for a student audience (studying ${caseData.classLevel.split(" - ")[0]}). If the player just made an irrelevant or flawed argument, react to that strongly. 1-2 sentences.`;
    const response: GenerateContentResponse = await prosecutorChat.sendMessage({ message: prompt });
    return response.text.trim();
  } catch (error) {
    console.error("Error fetching prosecutor statement:", error);
    return "The Prosecutor seems to be reviewing their notes... (API Error)";
  }
};

export const getCoCounselAdvice = async (
  caseData: CaseData,
  currentSituation: string, 
  previousDialogues: string, 
  playerQuery?: string
): Promise<string> => {
  if (!ai) return "Your Co-Counsel is currently unavailable due to a technical issue (AI service not initialized).";

  if (!coCounselChat) {
    const systemInstruction = `You are a helpful Co-Counsel for the player (Defense Counsel) in a courtroom game for students (studying ${caseData.classLevel.split(" - ")[0]} mathematics).
You are trying to help the player prove that ${caseData.clientName} (related to ${caseData.classLevel}) is innocent of the MATH accusation: "${caseData.accusation}".
The case revolves around these mathematical concepts: ${caseData.keyConcepts.join(', ')}.
You are supportive, insightful, and offer strategic advice related to the MATH.
Use clear language. Example: "Counsel, let's double-check the application of the distributive property in that algebraic expression."
You are the Co-Counsel. Never mention being an AI.
The current situation in court is: ${currentSituation}.
${playerQuery ? `Defense Counsel just asked you: "${playerQuery}".` : ''}
If the currentSituation indicates the player's last argument was deemed irrelevant or mathematically flawed by the Judge and the Prosecutor has capitalized on it, your advice should strongly guide them back to making a *relevant and correct* mathematical point. Emphasize focusing on the key concepts: ${caseData.keyConcepts.join(', ')} and the specific accusation: "${caseData.accusation}". Help them identify potential errors or areas to re-examine.
Now, give your concise, helpful MATH advice. 1-2 focused sentences.`;
    coCounselChat = initializeChat(systemInstruction);
  }
  if (!coCounselChat) return "Error: Your Co-Counsel is currently indisposed (Chat initialization failed).";

  try {
    const prompt = `Co-Counsel,
The current situation is: ${currentSituation}.
The last few things said were: "${previousDialogues.slice(-200)}".
${playerQuery ? `Defense Counsel asked: "${playerQuery}".` : ''}
What concise, helpful MATH tip can you offer the Defense Counsel for this case involving ${caseData.keyConcepts.join(', ')} for students studying ${caseData.classLevel.split(" - ")[0]}? If the player just made an irrelevant or mathematically flawed argument, help them get back on track and find the correct reasoning! 1-2 sentences.`;
    const response: GenerateContentResponse = await coCounselChat.sendMessage({ message: prompt });
    return response.text.trim();
  } catch (error) {
    console.error("Error fetching co-counsel advice:", error);
    return "Your Co-Counsel is currently pondering the complexities of the case... (API Error)";
  }
};

export const analyzePlayerArgumentOrObjection = async (
  caseData: CaseData,
  playerArgument: string,
  context: string,
  playerLevel: number 
): Promise<string> => {
  if (!ai) return "The Judge is currently deliberating due to a technical issue (AI service not initialized).";
  
  const currentCaseClass = caseData.classLevel.includes("Class 10") ? 10 : (caseData.classLevel.includes("Class 9") ? 9 : 8);
  const isBeginnerLevel = playerLevel <= 5; 

  const explanationExpectation = !isBeginnerLevel
    ? "If the Defense Counsel's argument is mathematically sound AND RELEVANT to the case, but lacks thorough explanation (e.g., doesn't state the theorem/formula or show clear steps), gently prompt for more detail. Example: 'That's a valid point on [relevant math concept], Counsel. Could you elaborate on the specific mathematical steps or theorem that supports your assertion in relation to this case?'"
    : "If the Counsel's argument is mathematically correct AND RELEVANT, affirm it clearly. For less experienced players, direct affirmation is good. If it's incorrect or irrelevant, this will be handled by your primary evaluation of validity and relevance.";

  const systemInstructionForJudge = `You are The Judge in a courtroom game for students (studying ${caseData.classLevel.split(" - ")[0]} mathematics).
You are impartial, analytical, and speak clearly.
The case is about a MATH problem: ${caseData.clientName}, accused of: "${caseData.accusation}". The case is based on ${caseData.classLevel} involving ${caseData.keyConcepts.join(', ')}.
The current situation is: ${context}.
Defense Counsel (the player, current game level ${playerLevel}) just stated: "${playerArgument}".

Your role:
1. Evaluate the mathematical validity AND relevance of the Defense Counsel's argument to the specific accusation and key concepts ('${caseData.keyConcepts.join(', ')}').
   - If the argument is mathematically sound AND directly helps disprove the accusation or clarify the key concepts in a relevant way, acknowledge it positively (e.g., using phrases like "sound mathematical argument", "proves the point", "correctly identifies"). This indicates a winning argument.
   - If the argument is mathematically sound BUT irrelevant to the case's core mathematical problem (e.g., a true math fact that doesn't apply to "${caseData.accusation}" or the key concepts ${caseData.keyConcepts.join(', ')}), you MUST state that it is irrelevant and does NOT help the case. Be specific if possible why it's irrelevant. Use phrases like "irrelevant", "not relevant".
   - If the argument is mathematically incorrect OR makes no mathematical sense, point out the flaw. Use phrases like "incorrect", "flaw in reasoning", "mathematically unsound". This indicates a flawed argument.
   - If the argument is off-topic and not mathematical, state that it is not relevant to the proceedings.
2. ${explanationExpectation} (Apply this primarily if the argument is relevant and sound but needs more mathematical detail, especially for more experienced players. This type of response can still be a "winning" one if the core point is correct).
3. Provide a concise response (1-2 sentences).

Examples of replies:
- Affirmative & Sufficient (Winning): "That is a sound mathematical argument, Counsel. The application of [specific theorem/formula] is correct and directly addresses the issue of [specific part of accusation]." or "Your reasoning is persuasive and correctly identifies the error."
- Affirmative but needs more (Potentially Winning, depends on keywords if core is sound): "Interesting point regarding [aspect relevant to the case], Counsel. Can you elaborate on how [specific math principle] leads to that conclusion, specifically for this case?"
- Mathematically Correct but Irrelevant (Irrelevant): "Counsel, while your statement about [correct but unrelated math fact] is true, it does not seem relevant to whether ${caseData.clientName} committed the error in [specific accusation]. Please focus on the specifics of this case."
- Incorrect/Insufficient (Flawed/Incorrect): "Counsel, I'm not certain that argument fully addresses the discrepancy. Your assertion about [topic] appears to be mathematically incorrect due to [specific reason]." or "There seems to be a flaw in your calculation for [concept]."
- Off-Topic/Not Mathematical (Irrelevant): "Counsel, your statement about [non-math topic] is not relevant to this mathematical courtroom. Please focus on the mathematical aspects of the case: ${caseData.accusation}."

Maintain a respectful, judicial tone. The goal is to encourage rigorous mathematical thinking directly related to the case.
You are The Judge. Ensure your response clearly signals whether the argument is helpful (winning), irrelevant, or flawed. If it's irrelevant or flawed, make that clear so the player understands they need to try a different approach to solve the case.
If context mentions an "objection", rule on the objection directly (e.g. "Objection sustained/overruled because..."). Otherwise, assess the argument.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: [{ role: "user", parts: [{ text: `Judge, Defense Counsel (player game level ${playerLevel}) presented this argument/objection regarding the math case (${caseData.classLevel} - ${caseData.keyConcepts.join(', ')}): "${playerArgument}". The case context: ${context}. Please provide your assessment in one or two clear sentences, focusing on mathematical validity AND relevance to the case. Indicate if the argument is winning, irrelevant, or flawed.` }] }],
      config: {
        systemInstruction: systemInstructionForJudge,
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error getting judge's analysis:", error);
    return "The Judge is currently in chambers reviewing the precedents... (API Error)";
  }
};

export const generateImageForEvidence = async (prompt: string): Promise<string> => {
  if (!ai) {
    throw new Error("Gemini AI not initialized (API key likely missing). Cannot generate image.");
  }
  try {
    const response = await ai.models.generateImages({
        model: GEMINI_MODEL_IMAGE,
        prompt: `A clear, diagrammatic illustration suitable for a mathematics textbook (Classes 8-10) related to: ${prompt}. Style: clean lines, informative, potentially with labels if simple. Not overly cartoonish. IMPORTANT: Design for a dark UI background - use light-colored lines/shapes/text (e.g., #E2E8F0, #94A3B8, #38BDF8) on a transparent background.`,
        config: {numberOfImages: 1, outputMimeType: 'image/jpeg'},
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      return response.generatedImages[0].image.imageBytes; 
    }
    throw new Error("No image generated or Gemini did not return any image data.");
  } catch (error) {
    console.error("Error generating image from Gemini:", error);
    throw new Error(`Failed to generate image. ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const resetChats = () => {
  prosecutorChat = null;
  coCounselChat = null;
};