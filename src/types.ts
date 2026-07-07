export interface CSInput {
  category: string; // 문의/클레임 유형
  summary: string; // 상황 요약
  request: string; // 점주/거래처 요청사항
  specialNotes?: string; // 가맹점주 특이사항
  preferredFormat?: string; // 원하는 응대 형식 (전화/문자/이메일, 미지정 시 AI가 판단)
}

export interface CSDraft {
  type: "전화 스크립트" | "이메일" | "문자/카톡";
  title?: string;
  content: string;
}

export interface CSResult {
  isInputAmbiguous: boolean;
  clarificationQuestions?: string[];
  detectedNeeds?: string;
  severity?: "낮음" | "보통" | "높음" | "매우 높음";
  riskWarnings?: string[];
  responseFormatReasoning?: string;
  markdownOutput?: string;
  drafts?: CSDraft[];
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  input: CSInput;
  result: CSResult;
}
