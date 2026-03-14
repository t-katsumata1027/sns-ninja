import { createClient } from "@/utils/supabase/server";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">📱 SNS Accounts</h2>
        <p className="text-neutral-400 mt-1 text-sm">
          Connect your X and Instagram accounts to start automating.
        </p>
      </div>

      {/* Add Account Form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
        <h3 className="text-base font-semibold mb-4">Add New Account</h3>
        <form className="space-y-4" action="/api/accounts" method="POST">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">
                Platform
              </label>
              <select
                name="platform"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="x">X (Twitter)</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">
                Username
              </label>
              <input
                name="username"
                type="text"
                placeholder="@handle"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">
              Access Token (encrypted at rest)
            </label>
            <input
              name="token"
              type="password"
              placeholder="Paste your API token..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">
              Proxy Config (JSON, optional)
            </label>
            <textarea
              name="proxyConfig"
              rows={3}
              placeholder='{"protocol":"http","host":"proxy.example.com","port":8080,"username":"user","password":"pass"}'
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors active:scale-[0.98]"
          >
            Add Account
          </button>
        </form>
      </div>

      {/* Placeholder list */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold mb-4">Connected Accounts</h3>
        <p className="text-sm text-neutral-500">
          No accounts connected yet. Add one above to get started.
        </p>
      </div>
    </div>
  );
}
