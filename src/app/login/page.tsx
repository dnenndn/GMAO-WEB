import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-hairline mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpeg" alt="Ideal Brique" className="w-20 h-20 object-contain" />
          </div>
          <div className="text-[11px] tracking-[0.2em] text-muted font-semibold uppercase">
            Ideal Brique — GMAO
          </div>
          <div className="text-xl font-semibold text-ink mt-1">Connexion</div>
        </div>

        <form
          action={login}
          className="bg-surface border border-hairline rounded p-6 space-y-4"
        >
          <input type="hidden" name="next" value={params.next ?? "/"} />

          {params.error && (
            <div className="text-sm text-urgent bg-urgent/10 border border-urgent/20 rounded px-3 py-2">
              Identifiant ou mot de passe incorrect.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Identifiant <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="login"
              required
              autoFocus
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Mot de passe <span className="text-urgent">*</span>
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-safety text-white text-sm font-semibold px-4 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Se connecter
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-4">
          Démo : admin / demo1234
        </p>
      </div>
    </div>
  );
}
