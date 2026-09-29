import { z } from "zod";

const ratingOneToFive = z.string().regex(/^[1-5]$/);
const rating = z.string().min(1);

export const draftEvaluationSchema = z.object({
  technical: ratingOneToFive,
  collaboration: ratingOneToFive,
  feedback: z.string(),
});

export const evaluationSchema = z
  .object({
    technical: rating,
    collaboration: rating,
    feedback: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!isLenient(value) || value.feedback.trim() !== "") return;
    ctx.addIssue({
      code: "custom",
      path: ["feedback"],
      message: "Required when both ratings are 5",
    });
  });

export type EvaluationWriteInput = z.infer<typeof draftEvaluationSchema>;

export function isLenient(value: {
  technical?: string;
  collaboration?: string;
}) {
  return value.technical === "5" && value.collaboration === "5";
}

export function overdueResolution(
  technical: string,
  collaboration: string,
  feedback: string,
): "submit" | "unlock" {
  const body = { technical, collaboration, feedback };
  if (!draftEvaluationSchema.safeParse(body).success) {
    return "unlock";
  }
  return evaluationSchema.safeParse(body).success ? "submit" : "unlock";
}
