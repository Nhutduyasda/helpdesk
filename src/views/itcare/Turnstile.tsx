import { useEffect, useRef, useState } from "react";
type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
export default function Turnstile(
  { onToken, reset }: { onToken: (token: string) => void; reset: number },
) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let widget: string | undefined;
    let disposed = false;
    const render = () => {
      if (disposed || !container.current || !window.turnstile) return;
      widget = window.turnstile.render(container.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        action: "incident-report",
        callback: (token: string) => { setError(false); onToken(token); },
        "expired-callback": () => onToken(""),
        "error-callback": () => {
          onToken("");
          setError(true);
        },
      });
    };
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-turnstile]",
    );
    if (!script) {
      script = document.createElement("script");
      script.dataset.turnstile = "true";
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }
    if (window.turnstile) render();
    else script.addEventListener("load", render);
    const failed = () => setError(true);
    script.addEventListener("error", failed);
    return () => {
      disposed = true;
      script.removeEventListener("load", render);
      script.removeEventListener("error", failed);
      if (widget) window.turnstile?.remove(widget);
    };
  }, [onToken, reset]);
  return (
    <>
      <div ref={container} />
      {error && (
        <p role="alert">Không tải được xác minh. Vui lòng tải lại trang.</p>
      )}
    </>
  );
}
