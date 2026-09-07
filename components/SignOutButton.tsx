/**
 * A form POST rather than a link: a GET sign-out can be triggered by any image
 * tag or link prefetch on a page the user happens to visit.
 */
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  );
}
