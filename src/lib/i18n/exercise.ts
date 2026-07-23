/**
 * Multi-language exercise guidance translations.
 * To add a new language, add it to the LANGUAGES array and provide all keys.
 */

export type Language = "en" | "hi" | "mr" | "ta" | "te" | "bn" | "gu" | "kn" | "ml" | "pa"

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
]

type TranslationMap = Record<string, string>

const translations: Record<Language, TranslationMap> = {
  en: {
    "exercise.start": "Get Ready!",
    "exercise.demo": "Watch the demo",
    "exercise.ready_in": "Starting in",
    "exercise.go": "GO!",
    "exercise.reps": "Reps",
    "exercise.form": "Form",
    "exercise.score": "Score",
    "exercise.duration": "Duration",
    "exercise.end": "End Session",
    "exercise.rest": "Rest",
    "exercise.next": "Next Exercise",
    "exercise.done": "Complete!",
    "exercise.great_job": "Great job!",
    "exercise.keep_going": "Keep going!",
    "exercise.push_harder": "Push harder!",
    "exercise.you_got_this": "You got this!",
    "exercise.almost_there": "Almost there!",
    "exercise.session_summary": "Session Summary",
    "exercise.rest_day": "Rest Day",
    "exercise.rest_day_desc": "Your body needs recovery. Light stretching recommended.",
    "form.knee_angle": "Watch your knee angle",
    "form.back_straight": "Keep your back straight",
    "form.lean_forward": "Don't lean too far forward",
    "form.hips_sagging": "Don't let your hips sag",
    "form.hips_high": "Hips too high",
    "form.core_engaged": "Engage your core",
    "form.breathe": "Remember to breathe",
    "form.good_form": "Good form!",
    "next_session.focus": "Next session focus",
    "next_session.increase": "Increase reps",
    "next_session.maintain": "Maintain current level",
    "next_session.easier": "Try easier variation",
    "report.reps_completed": "Reps Completed",
    "report.avg_form": "Average Form",
    "report.sessions_done": "Sessions Done",
    "report.streak": "Day Streak",
  },
  hi: {
    "exercise.start": "तैयार हो जाएं!",
    "exercise.demo": "डेमो देखें",
    "exercise.ready_in": "शुरू होने में",
    "exercise.go": "जाओ!",
    "exercise.reps": "दोहराव",
    "exercise.form": "फॉर्म",
    "exercise.score": "स्कोर",
    "exercise.duration": "अवधि",
    "exercise.end": "समाप्त करें",
    "exercise.rest": "आराम",
    "exercise.next": "अगला व्यायाम",
    "exercise.done": "पूर्ण!",
    "exercise.great_job": "बहुत अच्छा!",
    "exercise.keep_going": "जारी रखें!",
    "exercise.push_harder": "और मेहनत करें!",
    "exercise.you_got_this": "आप यह कर सकते हैं!",
    "exercise.almost_there": "लगभग वहाँ!",
    "exercise.session_summary": "सत्र सारांश",
    "exercise.rest_day": "आराम का दिन",
    "exercise.rest_day_desc": "आपके शरीर को आराम चाहिए। हल्का स्ट्रेचिंग अनुशंसित है।",
    "form.knee_angle": "अपने घुटने के कोण पर ध्यान दें",
    "form.back_straight": "अपनी पीठ सीधी रखें",
    "form.lean_forward": "बहुत आगे न झुकें",
    "form.hips_sagging": "अपने कूल्हों को न गिराएं",
    "form.hips_high": "कूल्हे बहुत ऊपर",
    "form.core_engaged": "अपने कोर को सक्रिय रखें",
    "form.breathe": "साँस लेना याद रखें",
    "form.good_form": "अच्छा फॉर्म!",
    "next_session.focus": "अगले सत्र का फोकस",
    "next_session.increase": "दोहराव बढ़ाएं",
    "next_session.maintain": "वर्तमान स्तर बनाए रखें",
    "next_session.easier": "आसान विविधता आज़माएं",
    "report.reps_completed": "पूर्ण दोहराव",
    "report.avg_form": "औसत फॉर्म",
    "report.sessions_done": "पूर्ण सत्र",
    "report.streak": "दिनों की श्रृंखला",
  },
  mr: {
    "exercise.start": "तयार व्हा!",
    "exercise.demo": "डेमो पहा",
    "exercise.ready_in": "सुरू होण्यात",
    "exercise.go": "जा!",
    "exercise.reps": "पुनरावृत्ती",
    "exercise.form": "फॉर्म",
    "exercise.score": "गुण",
    "exercise.duration": "कालावधी",
    "exercise.end": "सत्र संपवा",
    "exercise.rest": "विश्रांती",
    "exercise.next": "पुढील व्यायाम",
    "exercise.done": "पूर्ण!",
    "exercise.great_job": "छान काम!",
    "exercise.keep_going": "चालू ठेवा!",
    "exercise.push_harder": "आणखी प्रयत्न करा!",
    "exercise.you_got_this": "तुम्ही हे करू शकता!",
    "exercise.almost_there": "जवळपास आलात!",
    "exercise.session_summary": "सत्र सारांश",
    "exercise.rest_day": "विश्रांतीचा दिवस",
    "exercise.rest_day_desc": "तुमच्या शरीराला विश्रांतीची गरज आहे. हलके स्ट्रेचिंग शिफारसित आहे.",
    "form.knee_angle": "तुमच्या गुडघ्याच्या कोनाकडे लक्ष द्या",
    "form.back_straight": "पाठ सरळ ठेवा",
    "form.lean_forward": "खूप पुढे झुकू नका",
    "form.hips_sagging": "कंबर खाली येऊ देऊ नका",
    "form.hips_high": "कंबर खूप वर",
    "form.core_engaged": "कोर सक्रिय ठेवा",
    "form.breathe": "श्वास घ्यायला विसरू नका",
    "form.good_form": "चांगला फॉर्म!",
    "next_session.focus": "पुढील सत्राचे लक्ष",
    "next_session.increase": "पुनरावृत्ती वाढवा",
    "next_session.maintain": "सध्याची पातळी ठेवा",
    "next_session.easier": "सोपी विविधता वापरा",
    "report.reps_completed": "पूर्ण पुनरावृत्ती",
    "report.avg_form": "सरासरी फॉर्म",
    "report.sessions_done": "पूर्ण सत्रे",
    "report.streak": "दिवसांची साखळी",
  },
  // Fallback to English for languages with fewer translations
  ta: { "exercise.start": "தயாராகுங்கள்!", "exercise.go": "செல்லுங்கள்!", "exercise.reps": "மறுமுறைகள்", "exercise.form": "வடிவம்", "exercise.done": "முடிந்தது!", "exercise.great_job": "சிறப்பு!", "exercise.rest_day": "ஓய்வு நாள்" },
  te: { "exercise.start": "సిద్ధండి!", "exercise.go": "వెళ్ళండి!", "exercise.reps": "పునరావృత్తులు", "exercise.form": "ఫారం", "exercise.done": "పూర్తయింది!", "exercise.great_job": "చాలా బాగుంది!", "exercise.rest_day": "విశ్రాంతి రోజు" },
  bn: { "exercise.start": "প্রস্তুত হোন!", "exercise.go": "যান!", "exercise.reps": "পুনরাবৃত্তি", "exercise.form": "ফর্ম", "exercise.done": "শেষ!", "exercise.great_job": "দারুণ!", "exercise.rest_day": "বিশ্রামের দিন" },
  gu: { "exercise.start": "તૈયાર થાઓ!", "exercise.go": "જાઓ!", "exercise.reps": "પુનરાવર્તન", "exercise.form": "ફોર્મ", "exercise.done": "પૂર્ણ!", "exercise.great_job": "બહુ સરસ!", "exercise.rest_day": "આરામનો દિવસ" },
  kn: { "exercise.start": "ಸಿದ್ಧರಾಗಿ!", "exercise.go": "ಹೋಗಿ!", "exercise.reps": "ಪುನರಾವರ್ತನೆಗಳು", "exercise.form": "ಫಾರ್ಮ್", "exercise.done": "ಮುಗಿಯಿತು!", "exercise.great_job": "ಅದ್ಭುತ!", "exercise.rest_day": "ವಿಶ್ರಾಂತಿ ದಿನ" },
  ml: { "exercise.start": "തയ്യാറാകൂ!", "exercise.go": "പോകൂ!", "exercise.reps": "ആവർത്തനങ്ങൾ", "exercise.form": "ഫോം", "exercise.done": "പൂർത്തിയായി!", "exercise.great_job": "മികച്ചത്!", "exercise.rest_day": "വിശ്രമ ദിവസം" },
  pa: { "exercise.start": "ਤਿਆਰ ਹੋ ਜਾਓ!", "exercise.go": "ਜਾਓ!", "exercise.reps": "ਦੁਹਰਾਓ", "exercise.form": "ਫਾਰਮ", "exercise.done": "ਮੁਕੰਮਲ!", "exercise.great_job": "ਬਹੁਤ ਵਧੀਆ!", "exercise.rest_day": "ਆਰਾਮ ਦਾ ਦਿਨ" },
}

const fallbacks: Record<Language, Language> = {
  en: "en", hi: "en", mr: "en", ta: "en", te: "en",
  bn: "en", gu: "en", kn: "en", ml: "en", pa: "en",
}

export function t(key: string, lang: Language = "en"): string {
  const langTable = translations[lang]
  if (langTable && langTable[key]) return langTable[key]

  const fallbackLang = fallbacks[lang] || "en"
  const fallbackTable = translations[fallbackLang]
  if (fallbackTable && fallbackTable[key]) return fallbackTable[key]

  // Ultimate fallback: English
  return translations.en[key] || key
}

export function getLanguageLabel(code: Language): string {
  const lang = LANGUAGES.find((l) => l.code === code)
  return lang ? `${lang.nativeName} (${lang.name})` : code
}
