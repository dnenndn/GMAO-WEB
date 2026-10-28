/** Kept in its own file, with zero dependencies, specifically so both
 * auth.ts and prisma.ts can import it directly. auth.ts imports `prisma`
 * from prisma.ts, so if this class lived in auth.ts, a prisma.ts -> auth.ts
 * import to reuse it would be circular. */
export class ForbiddenError extends Error {
  constructor(message = "Action réservée aux administrateurs.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
