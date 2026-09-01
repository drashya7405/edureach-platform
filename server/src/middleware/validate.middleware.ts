import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const primaryMessage = firstIssue ? firstIssue.message : "Validation failed.";
        res.status(400).json({
          success: false,
          message: primaryMessage,
          errors: error.issues.map((issue) => ({
            field: issue.path.join(".") || "body",
            message: issue.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};
