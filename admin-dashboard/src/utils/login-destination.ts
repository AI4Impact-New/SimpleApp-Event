export function loginDestination(): string {
  const value = sessionStorage.getItem("post_login_path");
  sessionStorage.removeItem("post_login_path");
  return (value && /^\/student(?:\?course=[a-z0-9-]+)?$/.test(value)) ||
    value === "/welcome" ||
    (value && /^\/checkout\?order=[a-f0-9-]{36}$/.test(value))
    ? value!
    : "/dashboard";
}
