import { useEffect, useState } from "react";
import { Cookie, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  readCookiePreferences,
  saveCookiePreferences,
  type CookiePreferences as CookiePreferenceState,
} from "@/lib/cookie-preferences";

function PreferenceToggle({
  checked,
  label,
  detail,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  detail: string;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className={`cookie-option ${disabled ? "is-required" : ""}`}>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="privacy-switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={event => onChange?.(event.target.checked)}
          aria-label={label}
        />
        <i aria-hidden="true" />
      </span>
    </label>
  );
}

export default function CookiePreferences() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CookiePreferenceState>(() => readCookiePreferences());

  useEffect(() => {
    const openPreferences = () => {
      setDraft(readCookiePreferences());
      setOpen(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.classList.add("dialog-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("dialog-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const save = (analytics: boolean, marketing: boolean) => {
    try {
      setDraft(saveCookiePreferences({ analytics, marketing }));
      setOpen(false);
      toast.success("Cookie preferences saved on this device");
    } catch {
      toast.error("Cookie preferences could not be saved in this browser");
    }
  };

  return (
    <>
      <button
        className="cookie-preferences-launcher"
        type="button"
        onClick={() => {
          setDraft(readCookiePreferences());
          setOpen(true);
        }}
        aria-haspopup="dialog"
      >
        <Settings2 size={15} /> Cookie settings
      </button>
      {open && (
        <div
          className="dialog-backdrop cookie-preferences-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="request-dialog cookie-preferences-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-preferences-title"
          >
            <div className="dialog-head">
              <div>
                <p className="eyebrow">YOUR CHOICE, ON THIS DEVICE</p>
                <h2 id="cookie-preferences-title"><Cookie size={19} /> Cookie preferences</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close cookie preferences"
              >
                <X size={18} />
              </button>
            </div>
            <p className="cookie-preferences-intro">
              Necessary cookies keep sign-in and security working. They are always on.
              Optional analytics and marketing cookies are off unless you choose otherwise.
              Your selection is stored in this browser; this build does not load optional
              tracking scripts.
            </p>
            <div className="cookie-options">
              <PreferenceToggle
                checked
                disabled
                label="Necessary"
                detail="Authentication, session security and core site functions. Always active."
              />
              <PreferenceToggle
                checked={draft.analytics}
                label="Analytics"
                detail="Would allow aggregate usage measurement if an analytics service is configured."
                onChange={analytics => setDraft(current => ({ ...current, analytics }))}
              />
              <PreferenceToggle
                checked={draft.marketing}
                label="Marketing"
                detail="Would allow marketing-related storage if a marketing service is configured."
                onChange={marketing => setDraft(current => ({ ...current, marketing }))}
              />
            </div>
            <div className="cookie-preferences-actions">
              <button className="button button-soft" type="button" onClick={() => save(false, false)}>
                Reject optional
              </button>
              <button className="button button-outline" type="button" onClick={() => save(draft.analytics, draft.marketing)}>
                Save selection
              </button>
              <button className="button button-primary" type="button" onClick={() => save(true, true)}>
                Allow optional
              </button>
            </div>
            <p className="quiet-note">You can reopen this panel at any time using “Cookie settings”.</p>
          </section>
        </div>
      )}
    </>
  );
}
