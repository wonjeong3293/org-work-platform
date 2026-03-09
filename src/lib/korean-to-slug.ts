/**
 * 한글 제목 → 영문 slug / moduleKey / route 자동 생성
 *
 * 1. 사전에 등록된 한글 단어를 영문으로 치환
 * 2. 남은 한글은 로마자 변환(간이 음절 분해)
 * 3. slug: kebab-case, moduleKey: snake_case, route: /kebab-case
 */

const DICT: Record<string, string> = {
  // 공통
  관리: "management",
  운영: "operation",
  계획: "plan",
  목표: "goals",
  방침: "policy",
  교육: "education",
  평가: "assessment",
  보고: "report",
  보고서: "report",
  일지: "log",
  대장: "register",
  기록: "record",
  이력: "history",
  점검: "inspection",
  측정: "measurement",
  분석: "analysis",
  현황: "status",
  통계: "statistics",
  조회: "inquiry",
  등록: "registration",
  승인: "approval",
  결재: "approval",
  문서: "document",
  파일: "file",
  업로드: "upload",
  다운로드: "download",
  설정: "settings",
  공지: "notice",
  공지사항: "notices",
  게시판: "board",

  // 도메인
  생산: "production",
  생산기술: "production-tech",
  품질: "quality",
  설비: "equipment",
  환경: "environment",
  안전: "safety",
  보건: "health",
  소방: "fire",
  대기: "air",
  수질: "water",
  폐기물: "waste",
  위험물: "hazmat",
  화학물질: "chemical",
  산업: "industrial",
  위험성: "risk",

  // 특수 용어
  조도: "illuminance",
  소음: "noise",
  진동: "vibration",
  온도: "temperature",
  습도: "humidity",
  분진: "dust",
  가스: "gas",
  약품: "chemicals",
  자재: "materials",
  공정: "process",
  작업: "work",
  근로자: "worker",
  사고: "accident",
  재해: "disaster",
  예방: "prevention",
  개선: "improvement",
  시정: "corrective",
  조치: "action",
  대응: "response",
  비상: "emergency",
  훈련: "drill",
  보호구: "ppe",
  장비: "equipment",
};

// 긴 단어부터 먼저 매칭하기 위해 정렬
const SORTED_KEYS = Object.keys(DICT).sort((a, b) => b.length - a.length);

/**
 * 한글 제목을 영문 단어 배열로 변환
 */
function koreanToWords(title: string): string[] {
  let remaining = title.trim();
  const words: string[] = [];

  while (remaining.length > 0) {
    // 앞쪽 공백/특수문자 제거
    const leadingMatch = remaining.match(/^[\s\-_·,./]+/);
    if (leadingMatch) {
      remaining = remaining.slice(leadingMatch[0].length);
      continue;
    }

    // 영문 단어 그대로 유지
    const engMatch = remaining.match(/^[a-zA-Z0-9]+/);
    if (engMatch) {
      words.push(engMatch[0].toLowerCase());
      remaining = remaining.slice(engMatch[0].length);
      continue;
    }

    // 사전 매칭 (긴 단어 우선)
    let matched = false;
    for (const key of SORTED_KEYS) {
      if (remaining.startsWith(key)) {
        words.push(DICT[key]);
        remaining = remaining.slice(key.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 매칭 안 되는 한글 한 글자 → 로마자 변환
    const char = remaining[0];
    if (char >= "\uAC00" && char <= "\uD7A3") {
      words.push(romanizeChar(char));
    }
    remaining = remaining.slice(1);
  }

  return words;
}

// 간이 한글 음절 → 로마자 변환
const CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const JONG = ["", "g", "kk", "gs", "n", "nj", "nh", "d", "l", "lg", "lm", "lb", "ls", "lt", "lp", "lh", "m", "b", "bs", "s", "ss", "ng", "j", "ch", "k", "t", "p", "h"];

function romanizeChar(char: string): string {
  const code = char.charCodeAt(0) - 0xac00;
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  return CHO[cho] + JUNG[jung] + JONG[jong];
}

export function titleToSlug(title: string): string {
  const words = koreanToWords(title);
  return words.join("-") || "untitled";
}

export function titleToModuleKey(title: string): string {
  const words = koreanToWords(title);
  return words.join("_") || "untitled";
}

export function titleToRoute(title: string): string {
  return "/" + titleToSlug(title);
}
