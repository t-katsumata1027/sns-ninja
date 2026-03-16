import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 px-4">
      <div className="w-full max-w-sm p-8 space-y-8 bg-neutral-900 rounded-2xl border border-neutral-800 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">SNS Ninja</h1>
          <p className="mt-2 text-sm text-neutral-400">Sign in to your account</p>
        </div>

        {searchParams && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-500 text-center">
              {(await searchParams).message}
            </p>
          </div>
        )}
        
        <form className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-xl border-0 py-2.5 px-4 bg-neutral-800/50 text-white shadow-sm ring-1 ring-inset ring-neutral-700/50 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 transition-all outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-xl border-0 py-2.5 px-4 bg-neutral-800/50 text-white shadow-sm ring-1 ring-inset ring-neutral-700/50 placeholder:text-neutral-500 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              formAction={login}
              className="flex w-full justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all active:scale-[0.98]"
            >
              Sign in
            </button>
            <button
              formAction={signup}
              className="flex w-full justify-center rounded-xl bg-neutral-800 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 transition-all border border-neutral-700/50 active:scale-[0.98]"
            >
              Create an account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
