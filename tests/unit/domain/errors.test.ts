import { describe, expect, it } from "vitest";

import {
  ConflictError,
  DomainError,
  ForbiddenError,
  InternalServerError,
  InvalidLocaleError,
  InvalidTemplateError,
  NotFoundError,
  PdfGenerationError,
  ServiceUnavailableError,
  TimeoutError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/errors";

/**
 * Guards the domain error contract.
 *
 * The load-bearing behaviour is `isOperational`: it decides whether the original
 * message may cross a boundary or whether the client gets a generic one. A
 * regression here leaks an internal message to a visitor, so it is asserted
 * explicitly rather than left to the type checker.
 */
describe("DomainError", () => {
  it("is the base class every catalogue error extends", () => {
    expect(new NotFoundError()).toBeInstanceOf(DomainError);
    expect(new ValidationError()).toBeInstanceOf(DomainError);
    expect(new NotFoundError()).toBeInstanceOf(Error);
  });

  it("defaults to a 500 and an operational failure", () => {
    const error = new NotFoundError();

    expect(error.code).toBe("NOT_FOUND");
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it("names itself after its concrete class, so logs are readable", () => {
    expect(new ValidationError().name).toBe("ValidationError");
    expect(new ConflictError().name).toBe("ConflictError");
  });

  it("exposes the message to the client when the failure is operational", () => {
    expect(new NotFoundError("no such article").getClientMessage()).toBe("no such article");
  });

  it("hides the message from the client when the failure is not operational", () => {
    const internal = new InternalServerError("connection string: postgres://user:secret@host");

    expect(internal.isOperational).toBe(false);
    expect(internal.getClientMessage()).toBe("An unexpected error occurred");
    expect(internal.getClientMessage()).not.toContain("secret");
  });

  it("serialises to a loggable shape", () => {
    const error = new NotFoundError("missing", { slug: "missing-article" });
    const json = error.toJSON();

    expect(json.name).toBe("NotFoundError");
    expect(json.message).toBe("missing");
    expect(json.code).toBe("NOT_FOUND");
    expect(json.statusCode).toBe(404);
    expect(json.isOperational).toBe(true);
    expect(json.metadata).toEqual({ slug: "missing-article" });
    expect(typeof json.stack).toBe("string");
  });

  it("keeps a stack trace for the operational path", () => {
    expect(new NotFoundError().stack).toBeTruthy();
  });
});

describe("error catalogue", () => {
  const operational: [new (m?: string) => DomainError, string, number][] = [
    [NotFoundError, "NOT_FOUND", 404],
    [ForbiddenError, "FORBIDDEN", 403],
    [UnauthorizedError, "UNAUTHORIZED", 401],
    [ConflictError, "CONFLICT", 409],
    [TooManyRequestsError, "TOO_MANY_REQUESTS", 429],
    [TimeoutError, "TIMEOUT", 408],
    [InvalidTemplateError, "INVALID_TEMPLATE", 400],
    [InvalidLocaleError, "INVALID_LOCALE", 400],
  ];

  it.each(operational)("%o carries its code, status and operational flag", (Ctor, code, status) => {
    const error = new Ctor();

    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(status);
    expect(error.isOperational).toBe(true);
    expect(error.getClientMessage()).toBe(error.message);
  });

  const internal: [new (m?: string) => DomainError, string, number][] = [
    [InternalServerError, "INTERNAL_ERROR", 500],
    [ServiceUnavailableError, "SERVICE_UNAVAILABLE", 503],
    [PdfGenerationError, "PDF_GENERATION_ERROR", 500],
  ];

  it.each(internal)("%o never leaks its message", (Ctor, code, status) => {
    const error = new Ctor("sensitive detail");

    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(status);
    expect(error.isOperational).toBe(false);
    expect(error.getClientMessage()).toBe("An unexpected error occurred");
  });

  it("gives every error a default message and honours an override", () => {
    expect(new NotFoundError().message).toBe("Resource not found");
    expect(new NotFoundError("custom").message).toBe("custom");
  });
});

describe("ValidationError", () => {
  it("carries per-field messages into its serialised form", () => {
    const error = new ValidationError("invalid payload", { slug: ["required"] });
    const json = error.toJSON();

    expect(error.fields).toEqual({ slug: ["required"] });
    expect(json.fields).toEqual({ slug: ["required"] });
  });

  it("omits fields when none were supplied", () => {
    const error = new ValidationError();

    expect(error.fields).toBeUndefined();
    expect(error.toJSON().fields).toBeUndefined();
  });

  it("stays operational so field messages reach the caller", () => {
    expect(new ValidationError().isOperational).toBe(true);
  });
});
