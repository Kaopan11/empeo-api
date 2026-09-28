export function totalRawScore(technical: string, collaboration: string): number {
  return Math.round(((Number(technical) + Number(collaboration)) / 2) * 100) / 100;
}

export function scoreRows(
  evaluationId: string,
  technical: string,
  collaboration: string,
  feedback: string,
) {
  return [
    {
      evaluation_id: evaluationId,
      criteria_name: "Technical Execution",
      weight: 0.5,
      score: Number(technical),
      feedback,
    },
    {
      evaluation_id: evaluationId,
      criteria_name: "Collaboration",
      weight: 0.5,
      score: Number(collaboration),
      feedback,
    },
  ];
}
