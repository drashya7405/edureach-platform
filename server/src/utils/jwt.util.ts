import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: JWTPayload): string => {
  const secret =
    process.env.JWT_SECRET || (process.env.NODE_ENV === "test" ? "ci_test_secret_for_validation_at_least_16_chars" : undefined);
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  const secret =
    process.env.JWT_SECRET || (process.env.NODE_ENV === "test" ? "ci_test_secret_for_validation_at_least_16_chars" : undefined);

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.verify(token, secret) as JWTPayload;
};