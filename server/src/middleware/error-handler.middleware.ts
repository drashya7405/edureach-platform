import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
  const isProd = process.env.NODE_ENV === "production";

  // Log error securely on server
  console.error("Server error caught by middleware:", {
    method: req.method,
    path: req.originalUrl || req.path,
    name: err?.name,
    message: err?.message,
    stack: isProd ? undefined : err?.stack,
  });

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    res.status(400).json({
      success: false,
      message: firstIssue ? firstIssue.message : "Validation failed.",
      errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }

  // 2. JSON Body Parsing Syntax Errors
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      success: false,
      message: "Malformed JSON payload in request body.",
    });
    return;
  }

  // 3. Payload Too Large
  if (err?.type === "entity.too.large" || err?.status === 413) {
    res.status(413).json({
      success: false,
      message: "Request payload exceeds size limit.",
    });
    return;
  }

  // 4. Mongoose / MongoDB Duplicate Key Error
  if (err?.code === 11000) {
    res.status(409).json({
      success: false,
      message: "A resource with this identifier already exists.",
    });
    return;
  }

  // 5. Mongoose Validation Error
  if (err?.name === "ValidationError") {
    const messages = Object.values(err.errors || {})
      .map((e: any) => e.message)
      .join(", ");
    res.status(400).json({
      success: false,
      message: messages || "Database validation failed.",
    });
    return;
  }

  // 6. JWT Errors
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      message: "Authentication token is invalid or expired.",
    });
    return;
  }

  // 7. Database Connection Failures
  if (err?.name === "MongooseServerSelectionError" || err?.name === "MongoNetworkError") {
    res.status(503).json({
      success: false,
      message: "Database service temporarily unavailable. Please try again shortly.",
    });
    return;
  }

  // 8. Custom status or 500 fallback
  const statusCode = typeof err?.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = isProd
    ? statusCode === 500
      ? "An unexpected internal server error occurred."
      : err?.message || "An error occurred."
    : err?.message || "Internal server error.";

  res.status(statusCode).json({
    success: false,
    message,
    ...(isProd ? {} : { stack: err?.stack }),
  });
};

export default errorHandler;
